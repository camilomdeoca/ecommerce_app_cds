import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import type { AuthTokenPayload } from "../auth/auth.types.js";
import type { CartService } from "../cart/cart.service.js";
import type { OrderDto } from "../orders/dto/order.dto.js";
import type { OrdersService } from "../orders/orders.service.js";
import { CheckoutService } from "./checkout.service.js";
import type { StripeClient } from "./stripe.config.js";

const user: AuthTokenPayload = {
  sub: 7,
  email: "customer@example.com",
  role: "customer",
};

const cartItem = {
  productId: 123n,
  name: "Canvas backpack",
  priceCents: 4999,
  quantity: 2,
  active: true,
};

const pendingOrder: OrderDto = {
  id: 42,
  status: "pending",
  totalCents: 9998,
  createdAt: "2026-10-29T21:34:00.000Z",
  items: [
    {
      productId: "123",
      name: "Canvas backpack",
      priceCents: 4999,
      quantity: 2,
      lineTotalCents: 9998,
    },
  ],
};

const paidOrder: OrderDto = { ...pendingOrder, status: "paid" };

describe("CheckoutService", () => {
  const getCartItems = vi.fn();
  const clearCartItems = vi.fn();
  const createPendingOrder = vi.fn();
  const deleteOrder = vi.fn();
  const attachStripeSession = vi.fn();
  const getBySession = vi.fn();
  const markPaid = vi.fn();
  const stripeCreate = vi.fn();
  const stripeRetrieve = vi.fn();
  let service: CheckoutService;
  let loggerError: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("WEB_ORIGIN", "http://web.test");

    getCartItems.mockResolvedValue([cartItem]);
    clearCartItems.mockResolvedValue(undefined);
    createPendingOrder.mockResolvedValue({ id: 42 });
    deleteOrder.mockResolvedValue(undefined);
    attachStripeSession.mockResolvedValue(undefined);
    getBySession.mockResolvedValue(null);
    markPaid.mockResolvedValue(paidOrder);
    stripeCreate.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/session",
    });
    stripeRetrieve.mockResolvedValue({
      id: "cs_test_123",
      metadata: { orderId: "42", userId: "7" },
      payment_status: "paid",
      amount_total: 9998,
      currency: "usd",
    });

    const cartService = {
      getCartItems,
      clearCartItems,
    } as unknown as CartService;
    const ordersService = {
      createPendingOrder,
      deleteOrder,
      attachStripeSession,
      getBySession,
      markPaid,
    } as unknown as OrdersService;
    const stripe = {
      checkout: {
        sessions: {
          create: stripeCreate,
          retrieve: stripeRetrieve,
        },
      },
    } as unknown as StripeClient;

    loggerError = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    service = new CheckoutService(ordersService, cartService, stripe);
  });

  afterEach(() => {
    loggerError.mockRestore();
    vi.unstubAllEnvs();
  });

  it("creates a pending order and Stripe Checkout Session", async () => {
    await expect(service.createSession(user)).resolves.toEqual({
      url: "https://checkout.stripe.test/session",
    });

    expect(createPendingOrder).toHaveBeenCalledWith(
      7,
      [
        {
          productId: 123n,
          name: "Canvas backpack",
          priceCents: 4999,
          quantity: 2,
        },
      ],
      9998,
    );
    expect(stripeCreate).toHaveBeenCalledWith({
      mode: "payment",
      customer_email: "customer@example.com",
      client_reference_id: "42",
      metadata: { orderId: "42", userId: "7" },
      line_items: [
        {
          quantity: 2,
          price_data: {
            currency: "usd",
            unit_amount: 4999,
            product_data: { name: "Canvas backpack" },
          },
        },
      ],
      success_url: "http://web.test/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://web.test/cart",
    });
    expect(getCartItems).toHaveBeenCalledWith(7);
    expect(attachStripeSession).toHaveBeenCalledWith(42, "cs_test_123");
  });

  it("rejects an empty cart", async () => {
    getCartItems.mockResolvedValue([]);

    await expect(service.createSession(user)).rejects.toBeInstanceOf(BadRequestException);
    expect(createPendingOrder).not.toHaveBeenCalled();
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it("rejects unavailable products", async () => {
    getCartItems.mockResolvedValue([{ ...cartItem, active: false }]);

    await expect(service.createSession(user)).rejects.toBeInstanceOf(BadRequestException);
    expect(createPendingOrder).not.toHaveBeenCalled();
  });

  it("deletes the pending order when Stripe fails", async () => {
    stripeCreate.mockRejectedValue(new Error("stripe unavailable"));

    await expect(service.createSession(user)).rejects.toBeInstanceOf(BadGatewayException);
    expect(deleteOrder).toHaveBeenCalledWith(42);
    expect(attachStripeSession).not.toHaveBeenCalled();
  });

  it("deletes the pending order when Stripe returns no URL", async () => {
    stripeCreate.mockResolvedValue({ id: "cs_test_123", url: null });

    await expect(service.createSession(user)).rejects.toBeInstanceOf(BadGatewayException);
    expect(deleteOrder).toHaveBeenCalledWith(42);
    expect(attachStripeSession).not.toHaveBeenCalled();
  });

  it("returns an already-paid order without contacting Stripe", async () => {
    getBySession.mockResolvedValue(paidOrder);

    await expect(service.confirm(7, "cs_test_123")).resolves.toEqual(paidOrder);
    expect(stripeRetrieve).not.toHaveBeenCalled();
    expect(markPaid).not.toHaveBeenCalled();
  });

  it("confirms payment, clears purchased cart items, and marks the order paid", async () => {
    getBySession.mockResolvedValue(pendingOrder);

    await expect(service.confirm(7, "cs_test_123")).resolves.toEqual(paidOrder);

    expect(stripeRetrieve).toHaveBeenCalledWith("cs_test_123");
    expect(clearCartItems).toHaveBeenCalledWith(7, [123n]);
    expect(markPaid).toHaveBeenCalledWith(42);
  });

  it("rejects an unknown session", async () => {
    await expect(service.confirm(7, "cs_test_missing")).rejects.toBeInstanceOf(NotFoundException);
    expect(stripeRetrieve).not.toHaveBeenCalled();
  });

  it("rejects sessions owned by another user", async () => {
    getBySession.mockResolvedValue(pendingOrder);
    stripeRetrieve.mockResolvedValue({
      metadata: { orderId: "42", userId: "8" },
      payment_status: "paid",
      amount_total: 9998,
      currency: "usd",
    });

    await expect(service.confirm(7, "cs_test_123")).rejects.toBeInstanceOf(NotFoundException);
    expect(markPaid).not.toHaveBeenCalled();
  });

  it("rejects sessions whose order metadata does not match", async () => {
    getBySession.mockResolvedValue(pendingOrder);
    stripeRetrieve.mockResolvedValue({
      metadata: { orderId: "99", userId: "7" },
      payment_status: "paid",
      amount_total: 9998,
      currency: "usd",
    });

    await expect(service.confirm(7, "cs_test_123")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects unpaid sessions", async () => {
    getBySession.mockResolvedValue(pendingOrder);
    stripeRetrieve.mockResolvedValue({
      metadata: { orderId: "42", userId: "7" },
      payment_status: "unpaid",
      amount_total: 9998,
      currency: "usd",
    });

    await expect(service.confirm(7, "cs_test_123")).rejects.toBeInstanceOf(ConflictException);
    expect(clearCartItems).not.toHaveBeenCalled();
  });

  it("rejects sessions with a mismatched amount or currency", async () => {
    getBySession.mockResolvedValue(pendingOrder);
    stripeRetrieve.mockResolvedValue({
      metadata: { orderId: "42", userId: "7" },
      payment_status: "paid",
      amount_total: 1,
      currency: "usd",
    });

    await expect(service.confirm(7, "cs_test_123")).rejects.toBeInstanceOf(BadRequestException);

    stripeRetrieve.mockResolvedValue({
      metadata: { orderId: "42", userId: "7" },
      payment_status: "paid",
      amount_total: 9998,
      currency: "eur",
    });

    await expect(service.confirm(7, "cs_test_123")).rejects.toBeInstanceOf(BadRequestException);
    expect(clearCartItems).not.toHaveBeenCalled();
  });

  it("returns a bad gateway error when Stripe cannot retrieve the session", async () => {
    getBySession.mockResolvedValue(pendingOrder);
    stripeRetrieve.mockRejectedValue(new Error("stripe unavailable"));

    await expect(service.confirm(7, "cs_test_123")).rejects.toBeInstanceOf(BadGatewayException);
    expect(markPaid).not.toHaveBeenCalled();
  });
});

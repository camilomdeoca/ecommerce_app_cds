import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type Stripe from "stripe";
import type { AuthTokenPayload } from "../auth/auth.types.js";
import { CartService } from "../cart/cart.service.js";
import { OrdersService, type PendingOrderItem } from "../orders/orders.service.js";
import type { OrderDto } from "../orders/dto/order.dto.js";
import type { CheckoutSessionDto } from "./dto/checkout-session.dto.js";
import { getWebOrigin, STRIPE_CLIENT, type StripeClient } from "./stripe.config.js";

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    @Inject(OrdersService) private readonly ordersService: OrdersService,
    @Inject(CartService) private readonly cartService: CartService,
    @Inject(STRIPE_CLIENT) private readonly stripe: StripeClient,
  ) {}

  async createSession(user: AuthTokenPayload): Promise<CheckoutSessionDto> {
    const cartItems = await this.cartService.getCartItems(user.sub);

    if (cartItems.length === 0) {
      throw new BadRequestException("Your cart is empty");
    }

    if (cartItems.some((item) => !item.active)) {
      throw new BadRequestException("Remove unavailable products before checkout");
    }

    const orderItems: PendingOrderItem[] = cartItems.map((item) => ({
      productId: item.productId,
      name: item.name,
      priceCents: item.priceCents,
      quantity: item.quantity,
    }));
    const totalCents = orderItems.reduce(
      (total, item) => total + item.priceCents * item.quantity,
      0,
    );
    const order = await this.ordersService.createPendingOrder(user.sub, orderItems, totalCents);

    let session: Stripe.Checkout.Session;

    try {
      session = await this.stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        client_reference_id: String(order.id),
        metadata: {
          orderId: String(order.id),
          userId: String(user.sub),
        },
        line_items: orderItems.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            unit_amount: item.priceCents,
            product_data: {
              name: item.name,
            },
          },
        })),
        success_url: `${getWebOrigin()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getWebOrigin()}/cart`,
      });
    } catch (error) {
      await this.ordersService.deleteOrder(order.id);
      this.logger.error(
        "Could not create Stripe Checkout Session",
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadGatewayException("Could not start checkout");
    }

    if (!session.url) {
      await this.ordersService.deleteOrder(order.id);
      throw new BadGatewayException("Could not start checkout");
    }

    await this.ordersService.attachStripeSession(order.id, session.id);

    return { url: session.url };
  }

  async confirm(userId: number, sessionId: string): Promise<OrderDto> {
    const existingOrder = await this.ordersService.getBySession(userId, sessionId);

    if (!existingOrder) {
      throw new NotFoundException("Order not found");
    }

    if (existingOrder.status === "paid") {
      return existingOrder;
    }

    let session: Stripe.Checkout.Session;

    try {
      session = await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      this.logger.error(
        "Could not retrieve Stripe Checkout Session",
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadGatewayException("Could not confirm checkout");
    }

    if (
      session.metadata?.userId !== String(userId) ||
      session.metadata?.orderId !== String(existingOrder.id)
    ) {
      throw new NotFoundException("Order not found");
    }

    if (session.payment_status !== "paid") {
      throw new ConflictException("Payment has not been completed");
    }

    if (session.amount_total !== existingOrder.totalCents || session.currency !== "usd") {
      throw new BadRequestException("Payment amount does not match order");
    }

    await this.cartService.clearCartItems(
      userId,
      existingOrder.items.map((item) => BigInt(item.productId)),
    );

    return this.ordersService.markPaid(existingOrder.id);
  }
}

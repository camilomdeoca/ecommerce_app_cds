import { cookies } from "next/headers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderDto } from "../orders";
import { CheckoutConfirmationError, confirmCheckout } from "./checkout";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const mockCookies = vi.mocked(cookies);

function mockCookieStore(value: string) {
  mockCookies.mockResolvedValue({
    toString: () => value,
  } as Awaited<ReturnType<typeof cookies>>);
}

const order: OrderDto = {
  id: 42,
  status: "paid",
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

describe("confirmCheckout", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("API_URL", "http://api.test");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    mockCookies.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns null without a cookie", async () => {
    mockCookieStore("");

    await expect(confirmCheckout("cs_test_123")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards cookies and confirms a checkout session", async () => {
    mockCookieStore("auth_token=signed-token");
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(order), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(confirmCheckout("cs_test_123")).resolves.toEqual(order);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/checkout/confirm", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "auth_token=signed-token",
      },
      body: JSON.stringify({ sessionId: "cs_test_123" }),
      cache: "no-store",
    });
  });

  it("returns null for an unauthenticated response", async () => {
    mockCookieStore("auth_token=expired-token");
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(confirmCheckout("cs_test_123")).resolves.toBeNull();
  });

  it("throws a typed error when confirmation fails", async () => {
    mockCookieStore("auth_token=signed-token");
    fetchMock.mockResolvedValue(new Response(null, { status: 409 }));

    await expect(confirmCheckout("cs_test_123")).rejects.toMatchObject({
      name: "CheckoutConfirmationError",
      status: 409,
    });
    await expect(confirmCheckout("cs_test_123")).rejects.toBeInstanceOf(CheckoutConfirmationError);
  });
});

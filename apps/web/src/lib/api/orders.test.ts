import { cookies } from "next/headers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderDto } from "../orders";
import { getOrders } from "./orders";

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

describe("getOrders", () => {
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

    await expect(getOrders()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards cookies and loads paid orders", async () => {
    mockCookieStore("auth_token=signed-token");
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([order]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(getOrders()).resolves.toEqual([order]);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/orders", {
      headers: { cookie: "auth_token=signed-token" },
      cache: "no-store",
    });
  });

  it("returns null for an unauthenticated response", async () => {
    mockCookieStore("auth_token=expired-token");
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(getOrders()).resolves.toBeNull();
  });

  it("throws when the orders request fails", async () => {
    mockCookieStore("auth_token=signed-token");
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(getOrders()).rejects.toThrow("Failed to load orders: 500");
  });
});

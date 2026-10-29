import { cookies } from "next/headers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminProducts } from "./admin-products";
import type { ProductPageDto } from "./products";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const mockCookies = vi.mocked(cookies);

function mockCookieStore(value: string) {
  mockCookies.mockResolvedValue({
    toString: () => value,
  } as Awaited<ReturnType<typeof cookies>>);
}

const productPage: ProductPageDto = {
  items: [
    {
      id: "7",
      name: "Canvas backpack",
      priceCents: 4999,
      description: "A durable everyday backpack.",
      active: false,
      imageUrl: "http://localhost:8333/media/products/7/image?X-Amz-Signature=test",
    },
  ],
  page: 2,
  pageSize: 20,
  total: 25,
  totalPages: 2,
};

describe("getAdminProducts", () => {
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

  it("forwards cookies and loads a page of all products", async () => {
    mockCookieStore("auth_token=signed-token");
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(productPage), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(getAdminProducts(2)).resolves.toEqual(productPage);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/admin/products?page=2&pageSize=20",
      {
        headers: { cookie: "auth_token=signed-token" },
        cache: "no-store",
      },
    );
  });

  it("includes the trimmed search query", async () => {
    mockCookieStore("auth_token=signed-token");
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(productPage), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(getAdminProducts(1, "  canvas backpack  ")).resolves.toEqual(productPage);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/admin/products?page=1&pageSize=20&q=canvas+backpack",
      {
        headers: { cookie: "auth_token=signed-token" },
        cache: "no-store",
      },
    );
  });

  it("throws when the admin product request fails", async () => {
    mockCookieStore("auth_token=signed-token");
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));

    await expect(getAdminProducts(1)).rejects.toThrow("Failed to load admin products: 403");
  });
});

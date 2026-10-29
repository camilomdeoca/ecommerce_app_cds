import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProduct,
  getProducts,
  getProductsPageHref,
  parsePage,
  parseSearch,
  type ProductDto,
  type ProductPageDto,
} from "./products";

const product: ProductDto = {
  id: "7",
  name: "Canvas backpack",
  priceCents: 4999,
  description: "A durable everyday backpack.",
  imageUrl: "http://localhost:8333/media/products/7/image?X-Amz-Signature=test",
};

const productPage: ProductPageDto = {
  items: [product],
  page: 2,
  pageSize: 12,
  total: 25,
  totalPages: 3,
};

describe("parsePage", () => {
  it("defaults to the first page", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("")).toBe(1);
  });

  it("accepts positive integers", () => {
    expect(parsePage("2")).toBe(2);
    expect(parsePage(["3", "4"])).toBe(3);
  });

  it("rejects invalid page values", () => {
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("1.5")).toBe(1);
    expect(parsePage("not-a-page")).toBe(1);
  });
});

describe("parseSearch", () => {
  it("defaults to an empty search", () => {
    expect(parseSearch(undefined)).toBe("");
    expect(parseSearch("")).toBe("");
    expect(parseSearch("   ")).toBe("");
  });

  it("trims search values and uses the first array entry", () => {
    expect(parseSearch("  backpack  ")).toBe("backpack");
    expect(parseSearch(["mug", "backpack"])).toBe("mug");
  });

  it("limits searches to 100 characters", () => {
    expect(parseSearch("a".repeat(101))).toHaveLength(100);
  });
});

describe("getProductsPageHref", () => {
  it("uses the clean catalog path for the first page", () => {
    expect(getProductsPageHref(1)).toBe("/products");
  });

  it("uses the clean catalog path for a blank search", () => {
    expect(getProductsPageHref(1, "   ")).toBe("/products");
  });

  it("includes the page query for later pages", () => {
    expect(getProductsPageHref(2)).toBe("/products?page=2");
  });

  it("preserves the search query across pages", () => {
    expect(getProductsPageHref(1, "canvas backpack")).toBe("/products?q=canvas+backpack");
    expect(getProductsPageHref(2, "canvas backpack")).toBe("/products?page=2&q=canvas+backpack");
  });

  it("encodes search characters", () => {
    expect(getProductsPageHref(1, "mug & cup")).toBe("/products?q=mug+%26+cup");
  });
});

describe("product API helpers", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("API_URL", "http://api.test");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("loads a page of products without caching", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(productPage), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(getProducts(2)).resolves.toEqual(productPage);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/products?page=2&pageSize=20", {
      cache: "no-store",
    });
  });

  it("includes the search query without caching", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(productPage), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(getProducts(1, "  canvas backpack  ")).resolves.toEqual(productPage);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/products?page=1&pageSize=20&q=canvas+backpack",
      { cache: "no-store" },
    );
  });

  it("throws when the product list request fails", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(getProducts(1)).rejects.toThrow("Failed to load products: 500");
  });

  it("loads a single product", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(product), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(getProduct("7")).resolves.toEqual(product);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/products/7", {
      cache: "no-store",
    });
  });

  it("returns null for invalid or missing products", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 400 }));
    await expect(getProduct("not-a-number")).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(getProduct("999")).resolves.toBeNull();
  });

  it("throws when the product request fails", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(getProduct("7")).rejects.toThrow("Failed to load product: 500");
  });
});

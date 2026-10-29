import type { components } from "./schema";

export const PRODUCTS_PAGE_SIZE = 20;
export const MAX_SEARCH_LENGTH = 100;

export type ProductDto = components["schemas"]["ProductDto"];
export type ProductPageDto = components["schemas"]["ProductPageDto"];

export function getApiUrl(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
}

export function parsePage(value: string | string[] | undefined): number {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return 1;
  }

  const page = Number(rawValue);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parseSearch(value: string | string[] | undefined): string {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return rawValue?.trim().slice(0, MAX_SEARCH_LENGTH) ?? "";
}

export function getProductsPageHref(page: number, search = "", basePath = "/products"): string {
  const params = new URLSearchParams();
  const searchTerm = parseSearch(search);

  if (page > 1) {
    params.set("page", String(page));
  }
  if (searchTerm) {
    params.set("q", searchTerm);
  }

  const query = params.toString();

  return query ? `${basePath}?${query}` : basePath;
}

export async function getProducts(page: number, search = ""): Promise<ProductPageDto> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PRODUCTS_PAGE_SIZE),
  });
  const searchTerm = parseSearch(search);

  if (searchTerm) {
    params.set("q", searchTerm);
  }

  const response = await fetch(`${getApiUrl()}/api/v1/products?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load products: ${response.status}`);
  }

  return (await response.json()) as ProductPageDto;
}

export async function getProduct(id: string): Promise<ProductDto | null> {
  const response = await fetch(`${getApiUrl()}/api/v1/products/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });

  if (response.status === 400 || response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load product: ${response.status}`);
  }

  return (await response.json()) as ProductDto;
}

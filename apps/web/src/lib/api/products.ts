import type { components } from "./schema";

export const PRODUCTS_PAGE_SIZE = 20;

export type ProductDto = components["schemas"]["ProductDto"];
export type ProductPageDto = components["schemas"]["ProductPageDto"];

function getApiUrl(): string {
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

export function getProductsPageHref(page: number): string {
  return page <= 1 ? "/products" : `/products?page=${page}`;
}

export async function getProducts(page: number): Promise<ProductPageDto> {
  const response = await fetch(
    `${getApiUrl()}/api/v1/products?page=${page}&pageSize=${PRODUCTS_PAGE_SIZE}`,
    { cache: "no-store" },
  );

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

import { cookies } from "next/headers";
import { getApiUrl, parseSearch, PRODUCTS_PAGE_SIZE, type ProductPageDto } from "./products";

export async function getAdminProducts(page: number, search = ""): Promise<ProductPageDto> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PRODUCTS_PAGE_SIZE),
  });
  const searchTerm = parseSearch(search);

  if (searchTerm) {
    params.set("q", searchTerm);
  }

  const cookieStore = await cookies();
  const response = await fetch(`${getApiUrl()}/api/v1/admin/products?${params.toString()}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load admin products: ${response.status}`);
  }

  return (await response.json()) as ProductPageDto;
}

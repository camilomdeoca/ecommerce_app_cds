import { cookies } from "next/headers";
import type { OrderDto } from "../orders";
import { getApiUrl } from "./config";

export async function getOrders(): Promise<OrderDto[] | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    return null;
  }

  const response = await fetch(`${getApiUrl()}/api/v1/orders`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load orders: ${response.status}`);
  }

  return (await response.json()) as OrderDto[];
}

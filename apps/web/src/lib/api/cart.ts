import { cookies } from "next/headers";
import type { CartDto } from "../cart";

function getApiUrl(): string {
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
}

export async function getCart(): Promise<CartDto | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    return null;
  }

  const response = await fetch(`${getApiUrl()}/api/v1/cart`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load cart: ${response.status}`);
  }

  return (await response.json()) as CartDto;
}

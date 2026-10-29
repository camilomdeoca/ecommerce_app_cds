import { cookies } from "next/headers";
import type { OrderDto } from "../orders";
import { getApiUrl } from "./config";

export class CheckoutConfirmationError extends Error {
  constructor(readonly status: number) {
    super(`Failed to confirm checkout: ${status}`);
    this.name = "CheckoutConfirmationError";
  }
}

export async function confirmCheckout(sessionId: string): Promise<OrderDto | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    return null;
  }

  const response = await fetch(`${getApiUrl()}/api/v1/checkout/confirm`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader,
    },
    body: JSON.stringify({ sessionId }),
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new CheckoutConfirmationError(response.status);
  }

  return (await response.json()) as OrderDto;
}

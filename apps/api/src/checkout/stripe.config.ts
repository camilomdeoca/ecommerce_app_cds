import Stripe from "stripe";

export const STRIPE_CLIENT = Symbol("STRIPE_CLIENT");

export type StripeClient = Pick<Stripe, "checkout">;

export function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required");
  }

  return secretKey;
}

export function getWebOrigin(): string {
  return process.env.WEB_ORIGIN ?? "http://localhost:3000";
}

export function createStripeClient(): StripeClient {
  return new Stripe(getStripeSecretKey());
}

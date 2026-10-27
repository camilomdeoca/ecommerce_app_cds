export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function formatPriceCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

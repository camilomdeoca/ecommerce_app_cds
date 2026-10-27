import { describe, expect, it } from "vitest";
import { dollarsToCents, formatPriceCents } from "./product-price";

describe("dollarsToCents", () => {
  it("converts whole dollars", () => {
    expect(dollarsToCents(19)).toBe(1900);
  });

  it("converts dollars and cents", () => {
    expect(dollarsToCents(19.99)).toBe(1999);
    expect(dollarsToCents(0.29)).toBe(29);
  });

  it("rounds to the nearest cent", () => {
    expect(dollarsToCents(10.006)).toBe(1001);
  });
});

describe("formatPriceCents", () => {
  it("formats cents as USD", () => {
    expect(formatPriceCents(1999)).toBe("$19.99");
    expect(formatPriceCents(100)).toBe("$1.00");
  });

  it("adds thousands separators", () => {
    expect(formatPriceCents(123456)).toBe("$1,234.56");
  });
});

import { describe, expect, it } from "vitest";
import { getNavItems, isActivePath, isSearchVisible } from "./navigation";

describe("getNavItems", () => {
  it("excludes admin for non-admin users", () => {
    expect(getNavItems(false).map((item) => item.href)).toEqual(["/products", "/cart", "/orders"]);
  });

  it("includes admin for admin users", () => {
    expect(getNavItems(true).map((item) => item.href)).toEqual([
      "/products",
      "/cart",
      "/orders",
      "/admin",
    ]);
  });
});

describe("isActivePath", () => {
  it("matches exact and nested paths", () => {
    expect(isActivePath("/products", "/products")).toBe(true);
    expect(isActivePath("/products/123", "/products")).toBe(true);
    expect(isActivePath("/cart", "/products")).toBe(false);
  });

  it("treats the home path as exact", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/products", "/")).toBe(false);
  });
});

describe("isSearchVisible", () => {
  it("shows search only on product routes", () => {
    expect(isSearchVisible("/products")).toBe(true);
    expect(isSearchVisible("/products/123")).toBe(true);
    expect(isSearchVisible("/cart")).toBe(false);
    expect(isSearchVisible("/orders")).toBe(false);
  });
});

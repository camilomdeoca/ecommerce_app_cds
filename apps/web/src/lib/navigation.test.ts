import { describe, expect, it } from "vitest";
import { getNavItems, getSafeRedirectPath, isActivePath, isSearchVisible } from "./navigation";

describe("getNavItems", () => {
  it("excludes admin for non-admin users", () => {
    expect(getNavItems(false).map((item) => item.href)).toEqual(["/products", "/orders"]);
  });

  it("includes admin for admin users", () => {
    expect(getNavItems(true).map((item) => item.href)).toEqual(["/products", "/orders", "/admin"]);
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

describe("getSafeRedirectPath", () => {
  it("allows internal paths", () => {
    expect(getSafeRedirectPath("/cart")).toBe("/cart");
    expect(getSafeRedirectPath(["/products/1"])).toBe("/products/1");
  });

  it("falls back for missing or external paths", () => {
    expect(getSafeRedirectPath(undefined)).toBe("/");
    expect(getSafeRedirectPath(null)).toBe("/");
    expect(getSafeRedirectPath("https://example.com")).toBe("/");
    expect(getSafeRedirectPath("//example.com")).toBe("/");
    expect(getSafeRedirectPath("/\\example.com")).toBe("/");
  });
});

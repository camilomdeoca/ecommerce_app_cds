import type { Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  extractAuthToken,
  setAuthCookie,
} from "./auth.cookie.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe("auth cookies", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets a secure http-only cookie without a domain", () => {
    vi.stubEnv("WEB_ORIGIN", "https://shop.example.com");
    const cookie = vi.fn();
    const response = {
      cookie,
      clearCookie: vi.fn(),
    } as unknown as Response;

    setAuthCookie(response, "signed-token");

    expect(cookie).toHaveBeenCalledWith(
      AUTH_COOKIE_NAME,
      "signed-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: SEVEN_DAYS_MS,
      }),
    );

    const options: unknown = cookie.mock.calls[0]?.[2];
    expect(options).not.toHaveProperty("domain");
  });

  it("clears the cookie with matching options", () => {
    vi.stubEnv("WEB_ORIGIN", "http://localhost:3000");
    const clearCookie = vi.fn();
    const response = {
      cookie: vi.fn(),
      clearCookie,
    } as unknown as Response;

    clearAuthCookie(response);

    expect(clearCookie).toHaveBeenCalledWith(
      AUTH_COOKIE_NAME,
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
      }),
    );
    expect(clearCookie.mock.calls[0]?.[1]).not.toHaveProperty("maxAge");
  });

  it("extracts the auth token from parsed cookies", () => {
    const request = {
      cookies: { [AUTH_COOKIE_NAME]: "signed-token" },
    } as unknown as Request;

    expect(extractAuthToken(request)).toBe("signed-token");
  });

  it("returns null when the cookie is missing", () => {
    const request = { cookies: {} } as unknown as Request;

    expect(extractAuthToken(request)).toBeNull();
  });
});

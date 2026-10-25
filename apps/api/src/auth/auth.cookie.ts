import type { CookieOptions, Request, Response } from "express";

export const AUTH_COOKIE_NAME = "auth_token";

const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isSecureCookie(): boolean {
  return (process.env.WEB_ORIGIN ?? "http://localhost:3000").startsWith("https://");
}

function getAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  };
}

export function setAuthCookie(response: Response, token: string): void {
  response.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

export function clearAuthCookie(response: Response): void {
  const options = getAuthCookieOptions();

  response.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    sameSite: options.sameSite,
    secure: options.secure,
    path: options.path,
  });
}

export function extractAuthToken(request: Request): string | null {
  const token: unknown = request.cookies?.[AUTH_COOKIE_NAME];

  return typeof token === "string" ? token : null;
}

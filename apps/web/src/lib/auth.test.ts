import { cookies } from "next/headers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "./auth";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const mockCookies = vi.mocked(cookies);

function mockCookieStore(value: string) {
  mockCookies.mockResolvedValue({
    toString: () => value,
  } as Awaited<ReturnType<typeof cookies>>);
}

describe("getCurrentUser", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("API_URL", "http://api.test");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    mockCookies.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns null without a cookie", async () => {
    mockCookieStore("");

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the cookie and maps the user", async () => {
    mockCookieStore("auth_token=signed-token");
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 7, email: "admin@example.com", role: "admin" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(getCurrentUser()).resolves.toEqual({
      id: 7,
      email: "admin@example.com",
      role: "admin",
    });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/auth/me", {
      headers: { cookie: "auth_token=signed-token" },
      cache: "no-store",
    });
  });

  it("returns null for an unauthenticated response", async () => {
    mockCookieStore("auth_token=expired-token");
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns null when the API request fails", async () => {
    mockCookieStore("auth_token=signed-token");
    fetchMock.mockRejectedValue(new Error("network error"));

    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

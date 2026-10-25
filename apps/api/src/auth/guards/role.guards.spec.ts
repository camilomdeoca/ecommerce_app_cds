import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { AuthTokenPayload } from "../auth.types.js";
import { AdminGuard, CustomerGuard } from "./role.guards.js";

const context = {} as ExecutionContext;

const customer: AuthTokenPayload = {
  sub: 1,
  email: "customer@example.com",
  role: "customer",
};

const admin: AuthTokenPayload = {
  sub: 2,
  email: "admin@example.com",
  role: "admin",
};

describe("CustomerGuard", () => {
  const guard = new CustomerGuard();

  it("allows customers", () => {
    expect(guard.handleRequest(null, customer, null, context)).toEqual(customer);
  });

  it("allows admins", () => {
    expect(guard.handleRequest(null, admin, null, context)).toEqual(admin);
  });

  it("rejects unknown roles", () => {
    const unknown = { ...customer, role: "unknown" } as unknown as AuthTokenPayload;

    expect(() => guard.handleRequest(null, unknown, null, context)).toThrow(ForbiddenException);
  });

  it("rejects unauthenticated requests", () => {
    expect(() => guard.handleRequest(null, null, null, context)).toThrow(UnauthorizedException);
  });
});

describe("AdminGuard", () => {
  const guard = new AdminGuard();

  it("allows admins", () => {
    expect(guard.handleRequest(null, admin, null, context)).toEqual(admin);
  });

  it("rejects customers", () => {
    expect(() => guard.handleRequest(null, customer, null, context)).toThrow(ForbiddenException);
  });

  it("rejects unauthenticated requests", () => {
    expect(() => guard.handleRequest(null, null, null, context)).toThrow(UnauthorizedException);
  });
});

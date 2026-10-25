import { ConflictException, UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma.service.js";
import { AuthService } from "./auth.service.js";

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

const hashMock = vi.mocked(
  bcrypt.hash as unknown as (data: string, saltOrRounds: number) => Promise<string>,
);
const compareMock = vi.mocked(
  bcrypt.compare as unknown as (data: string, encrypted: string) => Promise<boolean>,
);

const customer = {
  id: 1,
  email: "customer@example.com",
  role: "customer" as const,
};

const storedCustomer = {
  ...customer,
  passwordHash: "stored-password-hash",
};

describe("AuthService", () => {
  let service: AuthService;
  let signAsync: ReturnType<typeof vi.fn>;
  let userWhere: ReturnType<typeof vi.fn>;
  let userSelect: ReturnType<typeof vi.fn>;
  let whereFirst: ReturnType<typeof vi.fn>;
  let selectCreate: ReturnType<typeof vi.fn>;
  let findFirst: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    whereFirst = vi.fn();
    selectCreate = vi.fn();
    findFirst = vi.fn();

    userWhere = vi.fn(() => ({ first: whereFirst }));
    userSelect = vi.fn(() => ({ create: selectCreate }));

    const prisma = {
      db: {
        orm: {
          public: {
            User: {
              where: userWhere,
              select: userSelect,
              first: findFirst,
            },
          },
        },
      },
    } as unknown as PrismaService;

    signAsync = vi.fn().mockResolvedValue("signed-token");
    const jwtService = { signAsync } as unknown as JwtService;

    service = new AuthService(prisma, jwtService);

    hashMock.mockReset();
    compareMock.mockReset();
  });

  describe("signup", () => {
    it("normalizes the email, hashes the password, and creates a session", async () => {
      whereFirst.mockResolvedValue(null);
      hashMock.mockResolvedValue("hashed-password");
      selectCreate.mockResolvedValue(customer);

      const result = await service.signup("  Customer@Example.com ", "password123");

      expect(userWhere).toHaveBeenCalledWith({ email: "customer@example.com" });
      expect(hashMock).toHaveBeenCalledWith("password123", 10);
      expect(userSelect).toHaveBeenCalledWith("id", "email", "role");
      expect(selectCreate).toHaveBeenCalledWith({
        email: "customer@example.com",
        passwordHash: "hashed-password",
      });
      expect(signAsync).toHaveBeenCalledWith({
        sub: customer.id,
        email: customer.email,
        role: customer.role,
      });
      expect(result).toEqual({ user: customer, token: "signed-token" });
    });

    it("rejects an existing email", async () => {
      whereFirst.mockResolvedValue(storedCustomer);

      await expect(service.signup("customer@example.com", "password123")).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(hashMock).not.toHaveBeenCalled();
      expect(selectCreate).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("returns a session for valid credentials", async () => {
      whereFirst.mockResolvedValue(storedCustomer);
      compareMock.mockResolvedValue(true);

      const result = await service.login("Customer@Example.com", "password123");

      expect(compareMock).toHaveBeenCalledWith("password123", storedCustomer.passwordHash);
      expect(result).toEqual({ user: customer, token: "signed-token" });
    });

    it("rejects an unknown email", async () => {
      whereFirst.mockResolvedValue(null);

      await expect(service.login("missing@example.com", "password123")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(compareMock).not.toHaveBeenCalled();
    });

    it("rejects a wrong password", async () => {
      whereFirst.mockResolvedValue(storedCustomer);
      compareMock.mockResolvedValue(false);

      await expect(service.login("customer@example.com", "wrong-password")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe("getCurrentUser", () => {
    it("returns the safe user", async () => {
      findFirst.mockResolvedValue(customer);

      await expect(service.getCurrentUser(customer.id)).resolves.toEqual(customer);
      expect(findFirst).toHaveBeenCalledWith({ id: customer.id });
    });

    it("rejects a missing user", async () => {
      findFirst.mockResolvedValue(null);

      await expect(service.getCurrentUser(999)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});

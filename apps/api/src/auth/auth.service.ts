import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import { PrismaService } from "../prisma.service.js";
import type { AuthTokenPayload, AuthUser, UserRole } from "./auth.types.js";

const PASSWORD_HASH_ROUNDS = 10;

type StoredUser = {
  id: number;
  email: string;
  role: UserRole;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = await this.prisma.db.orm.public.User.where({
      email: normalizedEmail,
    }).first();

    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
    const user = await this.prisma.db.orm.public.User.select("id", "email", "role").create({
      email: normalizedEmail,
      passwordHash,
    });

    return this.createSession(user);
  }

  async login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const user = await this.prisma.db.orm.public.User.where({
      email: normalizeEmail(email),
    }).first();

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.createSession(user);
  }

  async getCurrentUser(userId: number): Promise<AuthUser> {
    const user = await this.prisma.db.orm.public.User.first({ id: userId });

    if (!user) {
      throw new UnauthorizedException();
    }

    return toAuthUser(user);
  }

  private async createSession(user: StoredUser): Promise<{ user: AuthUser; token: string }> {
    const authUser = toAuthUser(user);
    const payload: AuthTokenPayload = {
      sub: authUser.id,
      email: authUser.email,
      role: authUser.role,
    };

    return {
      user: authUser,
      token: await this.jwtService.signAsync(payload),
    };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toAuthUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

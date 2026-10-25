export type UserRole = "customer" | "admin";

export type AuthUser = {
  id: number;
  email: string;
  role: UserRole;
};

export type AuthTokenPayload = {
  sub: number;
  email: string;
  role: UserRole;
};

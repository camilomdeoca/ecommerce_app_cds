export type UserRole = "customer" | "admin";

export type SessionUser = {
  name: string;
  email: string;
  role: UserRole;
};

export const currentUser: SessionUser | null = null;

import { cookies } from "next/headers";

export type UserRole = "customer" | "admin";

export type SessionUser = {
  id: number;
  email: string;
  role: UserRole;
};

function getApiUrl(): string {
  return process.env.API_URL ?? "http://localhost:3001";
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    return null;
  }

  try {
    const response = await fetch(`${getApiUrl()}/api/v1/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const user = (await response.json()) as SessionUser;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
}

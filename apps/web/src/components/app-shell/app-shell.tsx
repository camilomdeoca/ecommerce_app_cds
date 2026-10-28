import { Suspense, type ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { TopBar, TopBarFallback } from "./top-bar";

async function AuthenticatedTopBar() {
  const user = await getCurrentUser();

  return <TopBar user={user} />;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <Suspense fallback={<TopBarFallback />}>
        <AuthenticatedTopBar />
      </Suspense>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

import type { ReactNode } from "react";
import { currentUser } from "@/lib/auth";
import { TopBar } from "./top-bar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <TopBar user={currentUser} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

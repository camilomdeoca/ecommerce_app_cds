import { buttonVariants, cn } from "@heroui/react";
import NextLink from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-muted">Welcome back. Sign in to continue shopping.</p>
        <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-xl bg-default" />}>
          <AuthForm mode="login" />
        </Suspense>
        <NextLink
          href="/"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-4 w-full")}
        >
          Back to store
        </NextLink>
      </section>
    </main>
  );
}

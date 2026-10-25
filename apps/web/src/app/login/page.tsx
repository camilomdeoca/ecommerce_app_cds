import { buttonVariants, cn } from "@heroui/react";
import NextLink from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-muted">Authentication is not implemented yet.</p>
        <NextLink href="/" className={cn(buttonVariants({ variant: "secondary" }), "mt-6")}>
          Back to store
        </NextLink>
      </section>
    </main>
  );
}

import { buttonVariants, cn } from "@heroui/react";
import NextLink from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="mt-2 text-muted">Sign up to track orders and check out faster.</p>
        <AuthForm mode="signup" />
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

"use client";

import { Button, Input, Label, TextField } from "@heroui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";
import { apiClient } from "@/lib/api/client";
import { PasswordField } from "./password-field";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === "signup";

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setConfirmPasswordError(null);

    if (isSignup && password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const result = isSignup
      ? await apiClient.POST("/api/v1/auth/signup", {
          body: { email, password },
          credentials: "include",
        })
      : await apiClient.POST("/api/v1/auth/login", {
          body: { email, password },
          credentials: "include",
        });

    setIsSubmitting(false);

    if (result.error) {
      setError(
        isSignup && result.response.status === 409
          ? "An account with this email already exists."
          : isSignup
            ? "Could not create your account. Check your details and try again."
            : "Invalid email or password.",
      );
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <form
      className="mt-6 flex flex-col gap-4 text-left"
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
    >
      <TextField isRequired name="email">
        <Label>Email</Label>
        <Input
          autoComplete="email"
          placeholder="you@example.com"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </TextField>

      <PasswordField
        autoComplete={isSignup ? "new-password" : "current-password"}
        label="Password"
        name="password"
        placeholder="At least 8 characters"
        value={password}
        onChange={(value) => {
          setPassword(value);
          setConfirmPasswordError(null);
        }}
      />

      {isSignup ? (
        <PasswordField
          autoComplete="new-password"
          error={confirmPasswordError}
          label="Confirm password"
          name="confirmPassword"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(value) => {
            setConfirmPassword(value);
            setConfirmPasswordError(null);
          }}
        />
      ) : null}

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <Button fullWidth isDisabled={isSubmitting} type="submit" variant="primary">
        {isSubmitting ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted">
        {isSignup ? "Already have an account?" : "New here?"}{" "}
        <NextLink
          className="font-medium text-foreground underline"
          href={isSignup ? "/login" : "/signup"}
        >
          {isSignup ? "Sign in" : "Create an account"}
        </NextLink>
      </p>
    </form>
  );
}

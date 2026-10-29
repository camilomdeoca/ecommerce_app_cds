"use client";

import { Button } from "@heroui/react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/api/client";

export function CheckoutButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    if (isPending) {
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const result = await apiClient.POST("/api/v1/checkout/sessions", {
        credentials: "include",
      });

      if (result.response.status === 401) {
        setIsPending(false);
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (result.error || !result.data) {
        setIsPending(false);
        setError(
          result.response.status === 400
            ? "Your cart is empty or contains unavailable products."
            : "Could not start checkout. Please try again.",
        );
        return;
      }

      window.location.assign(result.data.url);
    } catch {
      setIsPending(false);
      setError("Could not start checkout. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        fullWidth
        isDisabled={isPending}
        type="button"
        variant="primary"
        onPress={() => void startCheckout()}
      >
        {isPending ? "Redirecting..." : "Checkout"}
      </Button>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-center text-xs text-muted">
        You will be redirected to Stripe to complete payment.
      </p>
    </div>
  );
}

"use client";

import { Button, cn } from "@heroui/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { revalidateCart } from "@/lib/actions/cart";
import { apiClient } from "@/lib/api/client";

type AddToCartButtonProps = {
  productId: string;
  productName: string;
  className?: string;
};

type AddStatus = "idle" | "adding" | "added";

export function AddToCartButton({ productId, productName, className }: AddToCartButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<AddStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "added") {
      return;
    }

    const timer = setTimeout(() => setStatus("idle"), 2000);

    return () => clearTimeout(timer);
  }, [status]);

  const handleAdd = async () => {
    if (status === "adding") {
      return;
    }

    setStatus("adding");
    setError(null);

    try {
      const result = await apiClient.POST("/api/v1/cart/items", {
        body: { productId, quantity: 1 },
        credentials: "include",
      });

      if (result.response.status === 401) {
        setStatus("idle");
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (result.error) {
        setStatus("idle");
        setError(
          result.response.status === 404
            ? "This product is no longer available."
            : "Could not add this product. Please try again.",
        );
        return;
      }

      setStatus("added");
      await revalidateCart().catch(() => undefined);
    } catch {
      setStatus("idle");
      setError("Could not add this product. Please try again.");
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        aria-label={`Add ${productName} to cart`}
        className="w-full"
        isDisabled={status === "adding"}
        type="button"
        variant="primary"
        onPress={() => void handleAdd()}
      >
        {status === "adding" ? "Adding..." : status === "added" ? "Added" : "Add to cart"}
      </Button>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <span className="sr-only" role="status">
        {status === "added" ? `${productName} added to cart` : ""}
      </span>
    </div>
  );
}

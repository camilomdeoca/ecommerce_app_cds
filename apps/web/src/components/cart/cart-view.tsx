"use client";

import { buttonVariants, cn } from "@heroui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import { MAX_CART_QUANTITY, type CartDto, type CartItemDto } from "@/lib/cart";
import { formatPriceCents } from "@/lib/product-price";
import { CartProductCard } from "./cart-product-card";
import { CheckoutButton } from "./checkout-button";

type CartViewProps = {
  initialCart: CartDto;
};

type CartMutationResult = {
  data?: CartDto;
  error?: unknown;
  response: Response;
};

export function CartView({ initialCart }: CartViewProps) {
  const router = useRouter();
  const [cart, setCart] = useState(initialCart);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyResult = (result: CartMutationResult) => {
    if (result.response.status === 401) {
      setPendingProductId(null);
      router.push("/login?next=/cart");
      return;
    }

    if (result.error || !result.data) {
      setError(
        result.response.status === 404
          ? "This cart item is no longer available."
          : "Could not update your cart. Please try again.",
      );
      setPendingProductId(null);
      return;
    }

    setCart(result.data);
    setPendingProductId(null);
  };

  const updateQuantity = async (item: CartItemDto, quantity: number) => {
    if (quantity < 1 || quantity > MAX_CART_QUANTITY) {
      return;
    }

    setPendingProductId(item.product.id);
    setError(null);

    try {
      const result = await apiClient.PATCH("/api/v1/cart/items/{productId}", {
        params: { path: { productId: item.product.id } },
        body: { quantity },
        credentials: "include",
      });

      applyResult(result);
    } catch {
      setError("Could not update your cart. Please try again.");
      setPendingProductId(null);
    }
  };

  const removeItem = async (item: CartItemDto) => {
    setPendingProductId(item.product.id);
    setError(null);

    try {
      const result = await apiClient.DELETE("/api/v1/cart/items/{productId}", {
        params: { path: { productId: item.product.id } },
        credentials: "include",
      });

      applyResult(result);
    } catch {
      setError("Could not update your cart. Please try again.");
      setPendingProductId(null);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <h2 className="text-lg font-semibold">Your cart is empty</h2>
        <p className="mt-2 text-muted">Add products from the catalog to see them here.</p>
        <NextLink
          className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mt-4")}
          href="/products"
        >
          Browse products
        </NextLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p
          className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex flex-col gap-4">
          {cart.items.map((item) => (
            <CartProductCard
              key={item.product.id}
              isPending={pendingProductId === item.product.id}
              item={item}
              onQuantityChange={(quantity) => void updateQuantity(item, quantity)}
              onRemove={() => void removeItem(item)}
            />
          ))}
        </div>

        <aside className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Items</span>
              <span>{cart.totalQuantity}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatPriceCents(cart.totalCents)}</span>
            </div>
          </div>
          <CheckoutButton />
        </aside>
      </div>
    </div>
  );
}

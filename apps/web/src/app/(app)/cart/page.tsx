import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CartSkeleton } from "@/components/cart/cart-skeleton";
import { CartView } from "@/components/cart/cart-view";
import { getCart } from "@/lib/api/cart";

async function CartContent() {
  const cart = await getCart();

  if (!cart) {
    redirect("/login?next=/cart");
  }

  return <CartView initialCart={cart} />;
}

export default function CartPage() {
  return (
    <section className="flex w-full flex-1 flex-col gap-6 p-6 sm:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>
        <p className="max-w-2xl text-muted">Review the products in your cart.</p>
      </header>
      <Suspense fallback={<CartSkeleton />}>
        <CartContent />
      </Suspense>
    </section>
  );
}

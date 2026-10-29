import { buttonVariants, cn } from "@heroui/react";
import NextLink from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OrderCard } from "@/components/orders/order-card";
import { CheckoutConfirmationError, confirmCheckout } from "@/lib/api/checkout";
import type { OrderDto } from "@/lib/orders";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ session_id?: string | string[] }>;
};

function CheckoutFailure({ status }: { status: number }) {
  const message =
    status === 409
      ? "Your payment is still processing. Check your orders in a moment."
      : status === 404
        ? "We could not find that checkout."
        : "We could not confirm your payment. If you were charged, check your orders.";

  return (
    <div className="rounded-xl border border-danger/40 bg-danger/10 p-6">
      <h2 className="text-lg font-semibold text-danger">Checkout not confirmed</h2>
      <p className="mt-2 text-sm text-danger">{message}</p>
      <NextLink
        className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mt-4")}
        href="/orders"
      >
        View orders
      </NextLink>
    </div>
  );
}

async function CheckoutSuccessContent({ searchParams }: CheckoutSuccessPageProps) {
  const query = await searchParams;
  const sessionId = Array.isArray(query.session_id) ? query.session_id[0] : query.session_id;

  if (!sessionId) {
    redirect("/cart");
  }

  let order: OrderDto | null;

  try {
    order = await confirmCheckout(sessionId);
  } catch (error) {
    if (error instanceof CheckoutConfirmationError) {
      return <CheckoutFailure status={error.status} />;
    }

    return <CheckoutFailure status={500} />;
  }

  if (!order) {
    redirect(`/login?next=${encodeURIComponent(`/checkout/success?session_id=${sessionId}`)}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-success/40 bg-success/10 p-6">
        <h2 className="text-lg font-semibold text-success">Payment received</h2>
        <p className="mt-2 text-sm text-success">
          Thanks for your order. A receipt was sent by Stripe.
        </p>
      </div>
      <OrderCard order={order} />
      <div className="flex flex-wrap gap-3">
        <NextLink className={buttonVariants({ variant: "primary", size: "sm" })} href="/orders">
          View all orders
        </NextLink>
        <NextLink className={buttonVariants({ variant: "ghost", size: "sm" })} href="/products">
          Continue shopping
        </NextLink>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  return (
    <section className="flex w-full flex-1 flex-col gap-6 p-6 sm:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Checkout complete</h1>
        <p className="max-w-2xl text-muted">Review the order that was just placed.</p>
      </header>
      <Suspense
        fallback={
          <div className="h-56 rounded-xl border border-border bg-default/40" aria-hidden />
        }
      >
        <CheckoutSuccessContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

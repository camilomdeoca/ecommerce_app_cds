import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OrderCard } from "@/components/orders/order-card";
import { getOrders } from "@/lib/api/orders";

async function OrdersContent() {
  const orders = await getOrders();

  if (!orders) {
    redirect("/login?next=/orders");
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <h2 className="text-lg font-semibold">No orders yet</h2>
        <p className="mt-2 text-muted">Completed checkouts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

function OrdersFallback() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {[0, 1].map((item) => (
        <div key={item} className="h-48 rounded-xl border border-border bg-default/40" />
      ))}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <section className="flex w-full flex-1 flex-col gap-6 p-6 sm:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
        <p className="max-w-2xl text-muted">Your completed orders.</p>
      </header>
      <Suspense fallback={<OrdersFallback />}>
        <OrdersContent />
      </Suspense>
    </section>
  );
}

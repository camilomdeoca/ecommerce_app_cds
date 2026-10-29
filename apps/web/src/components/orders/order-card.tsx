import type { OrderDto } from "@/lib/orders";
import { formatPriceCents } from "@/lib/product-price";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function OrderCard({ order }: { order: OrderDto }) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Order #{order.id}</h2>
          <p className="text-sm text-muted">{dateFormatter.format(new Date(order.createdAt))}</p>
        </div>
        <span className="rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
          {order.status === "paid" ? "Paid" : "Pending"}
        </span>
      </div>

      <div className="flex flex-col gap-3 border-y border-border py-4">
        {order.items.map((item) => (
          <div key={`${order.id}-${item.productId}`} className="flex justify-between gap-4 text-sm">
            <span className="min-w-0 truncate">
              {item.quantity} x {item.name}
            </span>
            <span className="shrink-0 font-medium">{formatPriceCents(item.lineTotalCents)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-base font-semibold">
        <span>Total</span>
        <span>{formatPriceCents(order.totalCents)}</span>
      </div>
    </article>
  );
}

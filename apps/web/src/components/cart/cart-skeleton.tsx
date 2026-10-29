export function CartSkeleton() {
  return (
    <div
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="flex animate-pulse flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 gap-4">
              <div className="h-28 w-28 shrink-0 rounded-lg bg-default" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="h-4 w-40 max-w-full rounded bg-default" />
                <div className="h-4 w-24 rounded bg-default" />
                <div className="h-4 w-20 rounded bg-default" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="h-9 w-32 rounded-lg bg-default" />
              <div className="h-9 w-9 rounded-full bg-default md:h-8 md:w-8" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-52 animate-pulse rounded-xl border border-border bg-default/40" />
    </div>
  );
}

import { Card, Skeleton } from "@heroui/react";

const SKELETON_CARD_COUNT = 8;

function ProductCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden">
      <Skeleton className="aspect-square w-full rounded-none" />
      <Card.Header className="gap-2">
        <Skeleton className="h-5 w-3/4 rounded-md" />
        <Skeleton className="h-5 w-1/3 rounded-md" />
      </Card.Header>
      <Card.Content className="flex-1">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="mt-2 h-4 w-2/3 rounded-md" />
      </Card.Content>
      <Card.Footer>
        <Skeleton className="h-10 w-full rounded-lg" />
      </Card.Footer>
    </Card>
  );
}

export function ProductGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <section className="flex w-full flex-1 flex-col gap-6 p-6 sm:p-8">
      <Skeleton className="h-9 w-36 rounded-lg" />
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-2/3 rounded-lg" />
          <Skeleton className="h-7 w-1/3 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
          <Skeleton className="mt-2 h-10 w-full rounded-lg sm:w-40" />
        </div>
      </div>
    </section>
  );
}

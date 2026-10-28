import { Suspense } from "react";
import { ProductCatalog } from "@/components/products/product-catalog";
import { ProductGridSkeleton } from "@/components/products/product-skeletons";

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  return (
    <section className="flex w-full flex-1 flex-col gap-6 p-6 sm:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
        <p className="max-w-2xl text-muted">Browse the latest products from our catalog.</p>
      </header>
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductCatalog searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

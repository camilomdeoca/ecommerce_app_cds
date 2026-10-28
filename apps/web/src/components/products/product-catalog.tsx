import { redirect } from "next/navigation";
import { getProducts, getProductsPageHref, parsePage } from "@/lib/api/products";
import { ProductCard } from "./product-card";
import { ProductPagination } from "./product-pagination";

type ProductCatalogProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function EmptyProducts() {
  return (
    <div className="rounded-xl border border-dashed border-border p-12 text-center">
      <h2 className="text-lg font-semibold">No products yet</h2>
      <p className="mt-2 text-muted">Check back soon for new products.</p>
    </div>
  );
}

export async function ProductCatalog({ searchParams }: ProductCatalogProps) {
  const query = await searchParams;
  const page = parsePage(query.page);
  const products = await getProducts(page);
  const lastPage = Math.max(1, products.totalPages);

  if (page > lastPage) {
    redirect(getProductsPageHref(lastPage));
  }

  if (products.items.length === 0) {
    return <EmptyProducts />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <ProductPagination
        page={products.page}
        total={products.total}
        totalPages={products.totalPages}
      />
    </div>
  );
}

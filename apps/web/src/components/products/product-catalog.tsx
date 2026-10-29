import NextLink from "next/link";
import { redirect } from "next/navigation";
import { getProducts, getProductsPageHref, parsePage, parseSearch } from "@/lib/api/products";
import { ProductCard } from "./product-card";
import { ProductPagination } from "./product-pagination";

type ProductCatalogProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function EmptyProducts({ search }: { search: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-12 text-center">
      <h2 className="text-lg font-semibold">
        {search ? "No matching products" : "No products yet"}
      </h2>
      <p className="mt-2 text-muted">
        {search
          ? `No products match “${search}”. Try a different search.`
          : "Check back soon for new products."}
      </p>
      {search ? (
        <NextLink
          className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
          href="/products"
        >
          Clear search
        </NextLink>
      ) : null}
    </div>
  );
}

export async function ProductCatalog({ searchParams }: ProductCatalogProps) {
  const query = await searchParams;
  const page = parsePage(query.page);
  const search = parseSearch(query.q);
  const products = await getProducts(page, search);
  const lastPage = Math.max(1, products.totalPages);

  if (page > lastPage) {
    redirect(getProductsPageHref(lastPage, search));
  }

  if (products.items.length === 0) {
    return <EmptyProducts search={search} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {search ? (
        <p className="text-sm text-muted">
          Results for <span className="font-medium text-foreground">“{search}”</span>
        </p>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <ProductPagination
        page={products.page}
        search={search}
        total={products.total}
        totalPages={products.totalPages}
      />
    </div>
  );
}

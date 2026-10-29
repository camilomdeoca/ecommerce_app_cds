import NextLink from "next/link";
import { redirect } from "next/navigation";
import { ProductCard } from "@/components/products/product-card";
import { ProductPagination } from "@/components/products/product-pagination";
import { getProducts, getProductsPageHref, parsePage, parseSearch } from "@/lib/api/products";
import { ProductDeleteAction } from "./product-delete-action";
import { ProductEditAction } from "./product-edit-action";

type AdminProductCatalogProps = {
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
          : "Use the form above to create your first product."}
      </p>
      {search ? (
        <NextLink
          className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
          href="/admin"
        >
          Clear search
        </NextLink>
      ) : null}
    </div>
  );
}

export async function AdminProductCatalog({ searchParams }: AdminProductCatalogProps) {
  const query = await searchParams;
  const page = parsePage(query.page);
  const search = parseSearch(query.q);
  const products = await getProducts(page, search);
  const lastPage = Math.max(1, products.totalPages);

  if (page > lastPage) {
    redirect(getProductsPageHref(lastPage, search, "/admin"));
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
          <ProductCard
            key={product.id}
            action={
              <div className="flex w-full gap-2">
                <ProductEditAction product={product} />
                <ProductDeleteAction product={product} />
              </div>
            }
            product={product}
          />
        ))}
      </div>
      <ProductPagination
        basePath="/admin"
        page={products.page}
        search={search}
        total={products.total}
        totalPages={products.totalPages}
      />
    </div>
  );
}

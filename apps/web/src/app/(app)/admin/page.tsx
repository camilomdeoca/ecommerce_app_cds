import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminProductCatalog } from "@/components/admin/admin-product-catalog";
import { ProductCreateCard } from "@/components/admin/product-create-card";
import { PagePlaceholder } from "@/components/page-placeholder";
import { ProductGridSkeleton } from "@/components/products/product-skeletons";
import { getCurrentUser } from "@/lib/auth";

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function AdminProductSection({ searchParams }: AdminPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <ProductCreateCard />
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Products</h2>
        <Suspense fallback={<ProductGridSkeleton />}>
          <AdminProductCatalog searchParams={searchParams} />
        </Suspense>
      </section>
    </div>
  );
}

export default function AdminPage({ searchParams }: AdminPageProps) {
  return (
    <PagePlaceholder title="Admin" description="Create and manage the product catalog.">
      <Suspense fallback={<p className="text-muted">Loading admin tools...</p>}>
        <AdminProductSection searchParams={searchParams} />
      </Suspense>
    </PagePlaceholder>
  );
}

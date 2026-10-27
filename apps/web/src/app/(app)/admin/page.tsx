import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProductCreateCard } from "@/components/admin/product-create-card";
import { PagePlaceholder } from "@/components/page-placeholder";
import { getCurrentUser } from "@/lib/auth";

async function AdminProductSection() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/");
  }

  return <ProductCreateCard />;
}

export default function AdminPage() {
  return (
    <PagePlaceholder
      title="Admin"
      description="Admin tools will appear here for users with an admin role."
    >
      <Suspense fallback={<p className="text-muted">Loading admin tools...</p>}>
        <AdminProductSection />
      </Suspense>
    </PagePlaceholder>
  );
}

import { Suspense } from "react";
import { ProductDetail } from "@/components/products/product-detail";
import { ProductDetailSkeleton } from "@/components/products/product-skeletons";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetail params={params} />
    </Suspense>
  );
}

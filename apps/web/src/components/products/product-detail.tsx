import { buttonVariants, cn } from "@heroui/react";
import Image from "next/image";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/api/products";
import { formatPriceCents } from "@/lib/product-price";
import { AddToCartButton } from "./add-to-cart-button";

type ProductDetailProps = {
  params: Promise<{ id: string }>;
};

export async function ProductDetail({ params }: ProductDetailProps) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <section className="flex w-full flex-1 flex-col gap-6 p-6 sm:p-8">
      <NextLink
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit")}
        href="/products"
      >
        ← Back to products
      </NextLink>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-default">
          <Image
            alt={product.name}
            className="object-contain"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            src={product.imageUrl}
            unoptimized
          />
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
            <p className="text-2xl font-semibold">{formatPriceCents(product.priceCents)}</p>
          </div>
          <p className="whitespace-pre-line text-muted">{product.description}</p>
          <AddToCartButton className="w-full sm:w-fit" productName={product.name} />
        </div>
      </div>
    </section>
  );
}

import { Card } from "@heroui/react";
import Image from "next/image";
import NextLink from "next/link";
import type { ProductDto } from "@/lib/api/products";
import { formatPriceCents } from "@/lib/product-price";
import { AddToCartButton } from "./add-to-cart-button";

export function ProductCard({ product }: { product: ProductDto }) {
  return (
    <Card className="group h-full overflow-hidden">
      <NextLink
        className="relative block aspect-square overflow-hidden bg-default"
        href={`/products/${product.id}`}
      >
        <Image
          alt={product.name}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
          src={product.imageUrl}
          unoptimized
        />
      </NextLink>
      <Card.Header className="gap-1">
        <Card.Title className="line-clamp-2 text-base">
          <NextLink className="hover:underline" href={`/products/${product.id}`}>
            {product.name}
          </NextLink>
        </Card.Title>
        <p className="text-lg font-semibold">{formatPriceCents(product.priceCents)}</p>
      </Card.Header>
      <Card.Content className="flex-1">
        <p className="line-clamp-2 text-sm text-muted">{product.description}</p>
      </Card.Content>
      <Card.Footer>
        <AddToCartButton className="w-full" productId={product.id} productName={product.name} />
      </Card.Footer>
    </Card>
  );
}

"use client";

import { Button, NumberField } from "@heroui/react";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import NextLink from "next/link";
import { MAX_CART_QUANTITY, type CartItemDto } from "@/lib/cart";
import { formatPriceCents } from "@/lib/product-price";

type CartProductCardProps = {
  item: CartItemDto;
  isPending: boolean;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
};

export function CartProductCard({
  item,
  isPending,
  onQuantityChange,
  onRemove,
}: CartProductCardProps) {
  return (
    <article
      aria-busy={isPending}
      className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 gap-4">
        <NextLink
          className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-default"
          href={`/products/${item.product.id}`}
        >
          <Image
            alt={item.product.name}
            className="object-cover"
            fill
            sizes="112px"
            src={item.product.imageUrl}
            unoptimized
          />
        </NextLink>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <NextLink
            className="truncate font-medium hover:underline"
            href={`/products/${item.product.id}`}
          >
            {item.product.name}
          </NextLink>
          <p className="text-sm text-muted">{formatPriceCents(item.product.priceCents)} each</p>
          <p className="font-semibold">{formatPriceCents(item.lineTotalCents)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <NumberField
          aria-label={`Quantity for ${item.product.name}`}
          className="w-32"
          isDisabled={isPending}
          maxValue={MAX_CART_QUANTITY}
          minValue={1}
          value={item.quantity}
          onChange={(quantity) => {
            if (quantity !== undefined && quantity !== item.quantity) {
              onQuantityChange(quantity);
            }
          }}
        >
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>
        <Button
          isIconOnly
          aria-label={`Remove ${item.product.name} from cart`}
          isDisabled={isPending}
          size="sm"
          type="button"
          variant="ghost"
          onPress={onRemove}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

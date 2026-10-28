import { Button } from "@heroui/react";

type AddToCartButtonProps = {
  productName: string;
  className?: string;
};

export function AddToCartButton({ productName, className }: AddToCartButtonProps) {
  return (
    <Button
      aria-label={`Add ${productName} to cart`}
      className={className}
      type="button"
      variant="primary"
    >
      Add to cart
    </Button>
  );
}

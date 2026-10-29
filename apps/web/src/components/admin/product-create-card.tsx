"use client";

import { Button, Card } from "@heroui/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatPriceCents } from "@/lib/product-price";
import { ProductFormFields, ProductImagePicker, useProductForm } from "./product-form";

export function ProductCreateCard() {
  const router = useRouter();
  const form = useProductForm({
    mode: "create",
    onSuccess: () => router.refresh(),
  });

  return (
    <form
      className="w-full max-w-2xl"
      noValidate
      onSubmit={(event) => void form.handleSubmit(event)}
    >
      <Card className="w-full">
        <Card.Header>
          <Card.Title className="text-2xl font-semibold tracking-tight">
            Create a product
          </Card.Title>
        </Card.Header>

        <Card.Content className="flex flex-col gap-4">
          {form.successProduct ? (
            <div
              className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/10 p-3"
              role="status"
            >
              <Image
                alt={form.successProduct.name}
                className="h-16 w-16 rounded-md object-cover"
                height={64}
                src={form.successProduct.imageUrl}
                unoptimized
                width={64}
              />
              <div>
                <p className="font-medium">Product created.</p>
                <p className="text-sm text-muted">
                  {form.successProduct.name} — {formatPriceCents(form.successProduct.priceCents)}
                </p>
              </div>
            </div>
          ) : null}

          <ProductFormFields form={form} />

          {form.formError ? (
            <p className="text-sm text-danger" role="alert">
              {form.formError}
            </p>
          ) : null}
        </Card.Content>

        <Card.Footer className="flex-wrap items-center justify-between gap-4 pt-2">
          <ProductImagePicker form={form} />
          <Button
            className="ml-auto"
            isDisabled={form.isSubmitting}
            type="submit"
            variant="primary"
          >
            {form.isSubmitting ? "Creating..." : "Create product"}
          </Button>
        </Card.Footer>
      </Card>
    </form>
  );
}

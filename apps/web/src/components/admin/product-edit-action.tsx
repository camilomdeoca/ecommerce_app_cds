"use client";

import { Button, Modal, useOverlayState } from "@heroui/react";
import { useRouter } from "next/navigation";
import type { ProductDto } from "@/lib/api/products";
import { ProductFormFields, ProductImagePicker, useProductForm } from "./product-form";

type ProductEditActionProps = {
  product: ProductDto;
};

export function ProductEditAction({ product }: ProductEditActionProps) {
  const router = useRouter();
  const state = useOverlayState();

  return (
    <>
      <Button
        aria-label={`Edit ${product.name}`}
        className="w-full"
        variant="secondary"
        onPress={() => state.open()}
      >
        Edit
      </Button>
      <Modal state={state}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="text-2xl font-semibold tracking-tight">
                  Edit product
                </Modal.Heading>
              </Modal.Header>
              {state.isOpen ? (
                <ProductEditForm
                  product={product}
                  onSuccess={() => {
                    state.close();
                    router.refresh();
                  }}
                />
              ) : null}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

type ProductEditFormProps = {
  product: ProductDto;
  onSuccess: () => void;
};

function ProductEditForm({ product, onSuccess }: ProductEditFormProps) {
  const form = useProductForm({ mode: "edit", product, onSuccess });
  const formId = `edit-product-form-${product.id}`;

  return (
    <>
      <Modal.Body className="flex flex-col gap-4">
        <form id={formId} noValidate onSubmit={(event) => void form.handleSubmit(event)}>
          <div className="flex flex-col gap-4">
            <ProductFormFields form={form} />
            {form.formError ? (
              <p className="text-sm text-danger" role="alert">
                {form.formError}
              </p>
            ) : null}
          </div>
        </form>
      </Modal.Body>
      <Modal.Footer className="flex flex-wrap items-center justify-between gap-4">
        <ProductImagePicker form={form} />
        <Button
          className="ml-auto"
          form={formId}
          isDisabled={form.isSubmitting}
          type="submit"
          variant="primary"
        >
          {form.isSubmitting ? "Saving..." : "Save changes"}
        </Button>
      </Modal.Footer>
    </>
  );
}

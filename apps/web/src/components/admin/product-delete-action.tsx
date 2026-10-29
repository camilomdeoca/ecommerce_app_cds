"use client";

import { AlertDialog, Button, useOverlayState } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import type { ProductDto } from "@/lib/api/products";

type ProductDeleteActionProps = {
  product: ProductDto;
};

function getDeleteError(status: number): string {
  switch (status) {
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "Only administrators can delete products.";
    case 404:
      return "This product no longer exists.";
    default:
      return "Could not delete the product. Please try again.";
  }
}

export function ProductDeleteAction({ product }: ProductDeleteActionProps) {
  const router = useRouter();
  const state = useOverlayState();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setError(null);
    }

    state.setOpen(isOpen);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const result = await apiClient.DELETE("/api/v1/admin/products/{id}", {
        params: { path: { id: product.id } },
        credentials: "include",
      });

      if (result.error) {
        setError(getDeleteError(result.response.status));
        return;
      }

      state.close();
      router.refresh();
    } catch {
      setError(getDeleteError(0));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        aria-label={`Delete ${product.name}`}
        className="w-full"
        variant="danger"
        onPress={() => state.open()}
      >
        Delete
      </Button>
      <AlertDialog isOpen={state.isOpen} onOpenChange={handleOpenChange}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog>
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Delete product</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  Are you sure you want to delete{" "}
                  <span className="font-medium">“{product.name}”</span>? This action cannot be
                  undone.
                </p>
                {error ? (
                  <p className="mt-3 text-sm text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button isDisabled={isDeleting} variant="secondary" onPress={() => state.close()}>
                  Cancel
                </Button>
                <Button
                  isDisabled={isDeleting}
                  variant="danger"
                  onPress={() => void handleDelete()}
                >
                  {isDeleting ? "Deleting..." : "Delete product"}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  );
}

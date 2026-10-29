"use client";

import { Button, Input, Label, NumberField, Switch, TextArea, TextField } from "@heroui/react";
import Image from "next/image";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { apiClient } from "@/lib/api/client";
import type { ProductDto } from "@/lib/api/products";
import { dollarsToCents } from "@/lib/product-price";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type ProductFormMode = "create" | "edit";

type CreateProductBody = {
  name: string;
  priceCents: number;
  description: string;
  image: string;
};

type UpdateProductBody = {
  name?: string;
  priceCents?: number;
  description?: string;
  active?: boolean;
  image?: string;
};

type FormErrors = {
  name?: string;
  price?: string;
  description?: string;
  image?: string;
};

type CreateProductFormOptions = {
  mode: "create";
  onSuccess?: (product: ProductDto) => void;
};

type EditProductFormOptions = {
  mode: "edit";
  product: ProductDto;
  onSuccess?: (product: ProductDto) => void;
};

type ProductFormOptions = CreateProductFormOptions | EditProductFormOptions;

function getSubmitError(status: number, mode: ProductFormMode): string {
  switch (status) {
    case 400:
      return "Check the product details and try again.";
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return mode === "create"
        ? "Only administrators can create products."
        : "Only administrators can edit products.";
    case 404:
      return "This product no longer exists.";
    case 413:
      return "The image is too large. Choose an image up to 5 MB.";
    default:
      return mode === "create"
        ? "Could not create the product. Please try again."
        : "Could not save the product. Please try again.";
  }
}

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useProductForm(options: ProductFormOptions) {
  const isEdit = options.mode === "edit";
  const product = isEdit ? options.product : undefined;
  const [name, setName] = useState(product?.name ?? "");
  const [priceDollars, setPriceDollars] = useState<number | undefined>(
    product ? product.priceCents / 100 : undefined,
  );
  const [description, setDescription] = useState(product?.description ?? "");
  const [active, setActive] = useState(product?.active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.imageUrl ?? null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successProduct, setSuccessProduct] = useState<ProductDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!previewUrl?.startsWith("blob:")) {
      return;
    }

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const clearError = (field: keyof FormErrors) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleFileChange = (file: File | null) => {
    setFormError(null);
    setSuccessProduct(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (!file) {
      setImageFile(null);
      setPreviewUrl(product?.imageUrl ?? null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      setImageFile(null);
      setPreviewUrl(product?.imageUrl ?? null);
      setErrors((current) => ({
        ...current,
        image: "Choose a JPEG, PNG, or WebP image.",
      }));
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setImageFile(null);
      setPreviewUrl(product?.imageUrl ?? null);
      setErrors((current) => ({
        ...current,
        image: "The image must be 5 MB or smaller.",
      }));
      return;
    }

    clearError("image");
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      nextErrors.name = "Name is required.";
    } else if (trimmedName.length > MAX_NAME_LENGTH) {
      nextErrors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
    }

    if (
      priceDollars === undefined ||
      !Number.isFinite(priceDollars) ||
      dollarsToCents(priceDollars) < 1
    ) {
      nextErrors.price = "Enter a price of at least $0.01.";
    }

    if (!trimmedDescription) {
      nextErrors.description = "Description is required.";
    } else if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      nextErrors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
    }

    if (!isEdit && !imageFile) {
      nextErrors.image = "Choose a product image.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessProduct(null);

    if (!validate() || priceDollars === undefined) {
      return;
    }

    if (options.mode === "create" && !imageFile) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("priceCents", String(dollarsToCents(priceDollars)));
      formData.append("description", description.trim());

      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (options.mode === "edit") {
        formData.append("active", String(active));

        const result = await apiClient.PATCH("/api/v1/admin/products/{id}", {
          params: { path: { id: options.product.id } },
          body: formData as unknown as UpdateProductBody,
          credentials: "include",
        });

        if (result.error || !result.data) {
          setFormError(getSubmitError(result.response.status, "edit"));
          return;
        }

        options.onSuccess?.(result.data);
        return;
      }

      const result = await apiClient.POST("/api/v1/admin/products", {
        body: formData as unknown as CreateProductBody,
        credentials: "include",
      });

      if (result.error || !result.data) {
        setFormError(getSubmitError(result.response.status, "create"));
        return;
      }

      setSuccessProduct(result.data);
      setName("");
      setPriceDollars(undefined);
      setDescription("");
      setImageFile(null);
      setPreviewUrl(null);
      setErrors({});
      options.onSuccess?.(result.data);
    } catch {
      setFormError(getSubmitError(0, options.mode));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    mode: options.mode,
    isEdit,
    name,
    setName,
    priceDollars,
    setPriceDollars,
    description,
    setDescription,
    active,
    setActive,
    imageFile,
    previewUrl,
    errors,
    formError,
    successProduct,
    isSubmitting,
    fileInputRef,
    clearError,
    handleFileChange,
    handleSubmit,
  };
}

export type ProductFormState = ReturnType<typeof useProductForm>;

export function ProductFormFields({ form }: { form: ProductFormState }) {
  return (
    <>
      <TextField isRequired isInvalid={Boolean(form.errors.name)} name="name">
        <Label>Name</Label>
        <Input
          maxLength={MAX_NAME_LENGTH}
          placeholder="Canvas backpack"
          value={form.name}
          onChange={(event) => {
            form.setName(event.target.value);
            form.clearError("name");
          }}
        />
        {form.errors.name ? (
          <p className="text-sm text-danger" role="alert">
            {form.errors.name}
          </p>
        ) : null}
      </TextField>

      <NumberField
        isRequired
        isInvalid={Boolean(form.errors.price)}
        formatOptions={{ style: "currency", currency: "USD" }}
        minValue={0.01}
        step={0.01}
        value={form.priceDollars}
        onChange={(value) => {
          form.setPriceDollars(value);
          form.clearError("price");
        }}
      >
        <Label>Price</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input placeholder="0.00" />
          <NumberField.IncrementButton />
        </NumberField.Group>
        {form.errors.price ? (
          <p className="text-sm text-danger" role="alert">
            {form.errors.price}
          </p>
        ) : null}
      </NumberField>

      <TextField isRequired isInvalid={Boolean(form.errors.description)} name="description">
        <Label>Description</Label>
        <TextArea
          maxLength={MAX_DESCRIPTION_LENGTH}
          placeholder="A durable everyday backpack."
          rows={4}
          value={form.description}
          onChange={(event) => {
            form.setDescription(event.target.value);
            form.clearError("description");
          }}
        />
        {form.errors.description ? (
          <p className="text-sm text-danger" role="alert">
            {form.errors.description}
          </p>
        ) : null}
      </TextField>

      {form.isEdit ? (
        <div className="flex flex-col gap-2">
          <Switch isSelected={form.active} onChange={form.setActive}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              Active
            </Switch.Content>
          </Switch>
          <p className="text-sm text-muted">
            Inactive products are hidden from the public catalog.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Image</span>
        {form.previewUrl ? (
          <Image
            alt="Selected product preview"
            className="h-40 w-40 rounded-lg border border-border object-cover"
            height={160}
            src={form.previewUrl}
            unoptimized
            width={160}
          />
        ) : (
          <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted">
            No image selected
          </div>
        )}
        {form.errors.image ? (
          <p className="text-sm text-danger" role="alert">
            {form.errors.image}
          </p>
        ) : null}
      </div>
    </>
  );
}

export function ProductImagePicker({ form }: { form: ProductFormState }) {
  const { fileInputRef, previewUrl, imageFile, handleFileChange } = form;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <input
        ref={fileInputRef}
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        type="file"
        onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
      />
      <Button type="button" variant="secondary" onPress={() => fileInputRef.current?.click()}>
        {previewUrl ? "Change image" : "Choose image"}
      </Button>
      <span className="truncate text-sm text-muted">
        {imageFile
          ? `${imageFile.name} (${formatFileSize(imageFile.size)})`
          : "JPEG, PNG, or WebP up to 5 MB."}
      </span>
    </div>
  );
}

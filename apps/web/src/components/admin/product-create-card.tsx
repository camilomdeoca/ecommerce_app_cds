"use client";

import { Button, Card, Input, Label, NumberField, TextArea, TextField } from "@heroui/react";
import Image from "next/image";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { dollarsToCents, formatPriceCents } from "@/lib/product-price";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ProductDto = components["schemas"]["ProductDto"];

type CreateProductBody = {
  name: string;
  priceCents: number;
  description: string;
  image: string;
};

type FormErrors = {
  name?: string;
  price?: string;
  description?: string;
  image?: string;
};

function getSubmitError(status: number): string {
  switch (status) {
    case 400:
      return "Check the product details and try again.";
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "Only administrators can create products.";
    case 413:
      return "The image is too large. Choose an image up to 5 MB.";
    default:
      return "Could not create the product. Please try again.";
  }
}

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProductCreateCard() {
  const [name, setName] = useState("");
  const [priceDollars, setPriceDollars] = useState<number | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<ProductDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const clearError = (field: keyof FormErrors) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleFileChange = (file: File | null) => {
    setFormError(null);
    setCreatedProduct(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (!file) {
      setImageFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageFile(null);
      setPreviewUrl(null);
      setErrors((current) => ({
        ...current,
        image: "Choose a JPEG, PNG, or WebP image.",
      }));
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setImageFile(null);
      setPreviewUrl(null);
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

    if (!imageFile) {
      nextErrors.image = "Choose a product image.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setCreatedProduct(null);

    if (!validate() || !imageFile || priceDollars === undefined) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("priceCents", String(dollarsToCents(priceDollars)));
      formData.append("description", description.trim());
      formData.append("image", imageFile);

      const result = await apiClient.POST("/api/v1/admin/products", {
        body: formData as unknown as CreateProductBody,
        credentials: "include",
      });

      if (result.error || !result.data) {
        setFormError(getSubmitError(result.response.status));
        return;
      }

      setCreatedProduct(result.data);
      setName("");
      setPriceDollars(undefined);
      setDescription("");
      setImageFile(null);
      setPreviewUrl(null);
      setErrors({});
    } catch {
      setFormError("Could not create the product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="w-full max-w-2xl" noValidate onSubmit={(event) => void handleSubmit(event)}>
      <Card className="w-full">
        <Card.Header>
          <Card.Title className="text-2xl font-semibold tracking-tight">
            Create a product
          </Card.Title>
        </Card.Header>

        <Card.Content className="flex flex-col gap-4">
          {createdProduct ? (
            <div
              className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/10 p-3"
              role="status"
            >
              <Image
                alt={createdProduct.name}
                className="h-16 w-16 rounded-md object-cover"
                height={64}
                src={createdProduct.imageUrl}
                unoptimized
                width={64}
              />
              <div>
                <p className="font-medium">Product created.</p>
                <p className="text-sm text-muted">
                  {createdProduct.name} — {formatPriceCents(createdProduct.priceCents)}
                </p>
              </div>
            </div>
          ) : null}

          <TextField isRequired isInvalid={Boolean(errors.name)} name="name">
            <Label>Name</Label>
            <Input
              maxLength={MAX_NAME_LENGTH}
              placeholder="Canvas backpack"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                clearError("name");
              }}
            />
            {errors.name ? (
              <p className="text-sm text-danger" role="alert">
                {errors.name}
              </p>
            ) : null}
          </TextField>

          <NumberField
            isRequired
            isInvalid={Boolean(errors.price)}
            formatOptions={{ style: "currency", currency: "USD" }}
            minValue={0.01}
            step={0.01}
            value={priceDollars}
            onChange={(value) => {
              setPriceDollars(value);
              clearError("price");
            }}
          >
            <Label>Price</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input placeholder="0.00" />
              <NumberField.IncrementButton />
            </NumberField.Group>
            {errors.price ? (
              <p className="text-sm text-danger" role="alert">
                {errors.price}
              </p>
            ) : null}
          </NumberField>

          <TextField isRequired isInvalid={Boolean(errors.description)} name="description">
            <Label>Description</Label>
            <TextArea
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder="A durable everyday backpack."
              rows={4}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                clearError("description");
              }}
            />
            {errors.description ? (
              <p className="text-sm text-danger" role="alert">
                {errors.description}
              </p>
            ) : null}
          </TextField>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Image</span>
            {previewUrl ? (
              <Image
                alt="Selected product preview"
                className="h-40 w-40 rounded-lg border border-border object-cover"
                height={160}
                src={previewUrl}
                unoptimized
                width={160}
              />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted">
                No image selected
              </div>
            )}
            {errors.image ? (
              <p className="text-sm text-danger" role="alert">
                {errors.image}
              </p>
            ) : null}
          </div>

          {formError ? (
            <p className="text-sm text-danger" role="alert">
              {formError}
            </p>
          ) : null}
        </Card.Content>

        <Card.Footer className="flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              type="file"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="secondary" onPress={() => fileInputRef.current?.click()}>
              {imageFile ? "Change image" : "Choose image"}
            </Button>
            <span className="truncate text-sm text-muted">
              {imageFile
                ? `${imageFile.name} (${formatFileSize(imageFile.size)})`
                : "JPEG, PNG, or WebP up to 5 MB."}
            </span>
          </div>
          <Button className="ml-auto" isDisabled={isSubmitting} type="submit" variant="primary">
            {isSubmitting ? "Creating..." : "Create product"}
          </Button>
        </Card.Footer>
      </Card>
    </form>
  );
}

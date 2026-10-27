import { NotFoundException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma.service.js";
import type { StorageService } from "../storage/storage.service.js";
import { ProductsService } from "./products.service.js";

const product = {
  id: 123n,
  name: "Canvas backpack",
  priceCents: 4999,
  description: "A durable everyday backpack.",
};

const file = {
  buffer: Buffer.from("image-bytes"),
  mimetype: "image/png",
  size: 11,
};

describe("ProductsService", () => {
  const create = vi.fn();
  const first = vi.fn();
  const deleteProduct = vi.fn();
  const where = vi.fn(() => ({ delete: deleteProduct }));
  const uploadProductImage = vi.fn();
  const getProductImage = vi.fn();
  let service: ProductsService;

  beforeEach(() => {
    vi.stubEnv("API_URL", "http://api.test/");
    create.mockReset();
    first.mockReset();
    deleteProduct.mockReset();
    where.mockClear();
    uploadProductImage.mockReset();
    getProductImage.mockReset();

    const prisma = {
      db: {
        orm: {
          public: {
            Product: { create, first, where },
          },
        },
      },
    } as unknown as PrismaService;
    const storage = {
      uploadProductImage,
      getProductImage,
    } as unknown as StorageService;

    service = new ProductsService(prisma, storage);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a product row and uploads its image", async () => {
    create.mockResolvedValue(product);
    uploadProductImage.mockResolvedValue(undefined);

    const result = await service.create(
      {
        name: product.name,
        priceCents: product.priceCents,
        description: product.description,
      },
      file,
    );

    expect(create).toHaveBeenCalledWith({
      name: product.name,
      priceCents: product.priceCents,
      description: product.description,
    });
    expect(uploadProductImage).toHaveBeenCalledWith(product.id, file);
    expect(result).toEqual({
      id: "123",
      name: product.name,
      priceCents: product.priceCents,
      description: product.description,
      imageUrl: "http://api.test/api/v1/products/123/image",
    });
  });

  it("deletes the new product row when the image upload fails", async () => {
    const uploadError = new Error("S3 unavailable");
    create.mockResolvedValue(product);
    uploadProductImage.mockRejectedValue(uploadError);

    await expect(
      service.create(
        {
          name: product.name,
          priceCents: product.priceCents,
          description: product.description,
        },
        file,
      ),
    ).rejects.toBe(uploadError);

    expect(where).toHaveBeenCalledWith({ id: product.id });
    expect(deleteProduct).toHaveBeenCalledTimes(1);
  });

  it("throws 404 when the product does not exist", async () => {
    first.mockResolvedValue(null);

    await expect(service.getImage(999n)).rejects.toBeInstanceOf(NotFoundException);
    expect(getProductImage).not.toHaveBeenCalled();
  });

  it("throws 404 when the product image object is missing", async () => {
    first.mockResolvedValue(product);
    getProductImage.mockRejectedValue({ name: "NoSuchKey" });

    await expect(service.getImage(product.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});

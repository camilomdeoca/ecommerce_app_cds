import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma.service.js";
import type { StorageService } from "../storage/storage.service.js";
import { ProductsService } from "./products.service.js";

const product = {
  id: 123n,
  name: "Canvas backpack",
  priceCents: 4999,
  description: "A durable everyday backpack.",
};

const secondProduct = {
  id: 124n,
  name: "Travel mug",
  priceCents: 1999,
  description: "A leak-proof mug.",
};

const file = {
  buffer: Buffer.from("image-bytes"),
  mimetype: "image/png",
  size: 11,
};

const imageUrl = "http://localhost:8333/media/products/123/image?X-Amz-Signature=test";

describe("ProductsService", () => {
  const create = vi.fn();
  const first = vi.fn();
  const deleteProduct = vi.fn();
  const where = vi.fn(() => ({ delete: deleteProduct }));
  const all = vi.fn();
  const limit = vi.fn(() => ({ all }));
  const offset = vi.fn(() => ({ limit }));
  const orderBy = vi.fn(() => ({ offset }));
  const aggregate = vi.fn();
  const uploadProductImage = vi.fn();
  const getProductImageUrl = vi.fn();
  let service: ProductsService;

  beforeEach(() => {
    create.mockReset();
    first.mockReset();
    deleteProduct.mockReset();
    where.mockClear();
    all.mockReset();
    limit.mockClear();
    offset.mockClear();
    orderBy.mockClear();
    aggregate.mockReset();
    uploadProductImage.mockReset();
    getProductImageUrl.mockReset();
    getProductImageUrl.mockResolvedValue(imageUrl);

    const prisma = {
      db: {
        orm: {
          public: {
            Product: { create, first, where, orderBy, aggregate },
          },
        },
      },
    } as unknown as PrismaService;
    const storage = {
      uploadProductImage,
      getProductImageUrl,
    } as unknown as StorageService;

    service = new ProductsService(prisma, storage);
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
    expect(getProductImageUrl).toHaveBeenCalledWith(product.id);
    expect(result).toEqual({
      id: "123",
      name: product.name,
      priceCents: product.priceCents,
      description: product.description,
      imageUrl,
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

  it("lists a page of products with pagination metadata", async () => {
    all.mockResolvedValue([product, secondProduct]);
    aggregate.mockResolvedValue({ total: 25 });
    getProductImageUrl.mockImplementation((productId: bigint) =>
      Promise.resolve(`http://localhost:8333/media/products/${productId}/image`),
    );

    const result = await service.list({ page: 2, pageSize: 10 });

    expect(orderBy).toHaveBeenCalledTimes(1);
    expect(offset).toHaveBeenCalledWith(10);
    expect(limit).toHaveBeenCalledWith(10);
    expect(all).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      items: [
        {
          id: "123",
          name: product.name,
          priceCents: product.priceCents,
          description: product.description,
          imageUrl: "http://localhost:8333/media/products/123/image",
        },
        {
          id: "124",
          name: secondProduct.name,
          priceCents: secondProduct.priceCents,
          description: secondProduct.description,
          imageUrl: "http://localhost:8333/media/products/124/image",
        },
      ],
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("returns an empty page when there are no products", async () => {
    all.mockResolvedValue([]);
    aggregate.mockResolvedValue({ total: 0 });

    const result = await service.list({ page: 1, pageSize: 12 });

    expect(result).toEqual({
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      totalPages: 0,
    });
  });

  it("returns a product by id", async () => {
    first.mockResolvedValue(product);

    const result = await service.getById(product.id);

    expect(first).toHaveBeenCalledWith({ id: product.id });
    expect(result).toEqual({
      id: "123",
      name: product.name,
      priceCents: product.priceCents,
      description: product.description,
      imageUrl,
    });
  });

  it("throws 404 when the product does not exist", async () => {
    first.mockResolvedValue(null);

    await expect(service.getById(999n)).rejects.toBeInstanceOf(NotFoundException);
  });
});

import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma.service.js";
import type { StorageService } from "../storage/storage.service.js";
import { CartService } from "./cart.service.js";

const product = {
  id: 123n,
  name: "Canvas backpack",
  priceCents: 4999,
  description: "A durable everyday backpack.",
  active: true,
};

const cartItem = {
  id: 1,
  userId: 7,
  productId: product.id,
  quantity: 2,
  product,
};

const imageUrl = "http://localhost:8333/media/products/123/image?X-Amz-Signature=test";

describe("CartService", () => {
  const cartAll = vi.fn();
  const cartInclude = vi.fn(() => ({ orderBy: cartOrderBy }));
  const cartOrderBy = vi.fn(() => ({ all: cartAll }));
  const cartFirst = vi.fn();
  const cartCreate = vi.fn();
  const cartUpdate = vi.fn();
  const cartDelete = vi.fn();
  const cartWhere = vi.fn((filter: Record<string, unknown>) => {
    if (filter.userId !== undefined) {
      return { include: cartInclude };
    }

    return { update: cartUpdate, delete: cartDelete };
  });
  const productFirst = vi.fn();
  const getProductImageUrl = vi.fn();
  let service: CartService;

  beforeEach(() => {
    cartAll.mockReset();
    cartInclude.mockClear();
    cartOrderBy.mockClear();
    cartFirst.mockReset();
    cartCreate.mockReset();
    cartUpdate.mockReset();
    cartDelete.mockReset();
    cartWhere.mockClear();
    productFirst.mockReset();
    getProductImageUrl.mockReset();
    getProductImageUrl.mockResolvedValue(imageUrl);

    const prisma = {
      db: {
        orm: {
          public: {
            CartItem: {
              where: cartWhere,
              first: cartFirst,
              create: cartCreate,
            },
            Product: {
              first: productFirst,
            },
          },
        },
      },
    } as unknown as PrismaService;
    const storage = {
      getProductImageUrl,
    } as unknown as StorageService;

    service = new CartService(prisma, storage);
  });

  it("returns the user's cart with line totals", async () => {
    cartAll.mockResolvedValue([cartItem]);

    const result = await service.getCart(7);

    expect(cartWhere).toHaveBeenCalledWith({ userId: 7 });
    expect(cartInclude).toHaveBeenCalledWith("product");
    expect(cartOrderBy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      items: [
        {
          product: {
            id: "123",
            name: product.name,
            priceCents: product.priceCents,
            description: product.description,
            active: true,
            imageUrl,
          },
          quantity: 2,
          lineTotalCents: 9998,
        },
      ],
      totalQuantity: 2,
      totalCents: 9998,
    });
  });

  it("creates a cart item when the product is not already in the cart", async () => {
    productFirst.mockResolvedValue(product);
    cartFirst.mockResolvedValue(null);
    cartCreate.mockResolvedValue(cartItem);
    cartAll.mockResolvedValue([cartItem]);

    const result = await service.addItem(7, { productId: "123", quantity: 2 });

    expect(productFirst).toHaveBeenCalledWith({ id: product.id, active: true });
    expect(cartFirst).toHaveBeenCalledWith({ userId: 7, productId: product.id });
    expect(cartCreate).toHaveBeenCalledWith({
      userId: 7,
      productId: product.id,
      quantity: 2,
    });
    expect(cartUpdate).not.toHaveBeenCalled();
    expect(result.totalQuantity).toBe(2);
  });

  it("increments an existing cart item up to the maximum quantity", async () => {
    productFirst.mockResolvedValue(product);
    cartFirst.mockResolvedValue({ ...cartItem, quantity: 98 });
    cartAll.mockResolvedValue([{ ...cartItem, quantity: 99 }]);

    await service.addItem(7, { productId: "123", quantity: 5 });

    expect(cartUpdate).toHaveBeenCalledWith({ quantity: 99 });
    expect(cartCreate).not.toHaveBeenCalled();
  });

  it("rejects adding a missing or inactive product", async () => {
    productFirst.mockResolvedValue(null);

    await expect(service.addItem(7, { productId: "123", quantity: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(productFirst).toHaveBeenCalledWith({ id: product.id, active: true });
    expect(cartFirst).not.toHaveBeenCalled();
  });

  it("updates a cart item quantity", async () => {
    cartFirst.mockResolvedValue(cartItem);
    cartAll.mockResolvedValue([{ ...cartItem, quantity: 3 }]);

    const result = await service.updateItem(7, product.id, { quantity: 3 });

    expect(cartFirst).toHaveBeenCalledWith({ userId: 7, productId: product.id });
    expect(cartUpdate).toHaveBeenCalledWith({ quantity: 3 });
    expect(result.totalQuantity).toBe(3);
  });

  it("removes a cart item", async () => {
    cartFirst.mockResolvedValue(cartItem);
    cartAll.mockResolvedValue([]);

    const result = await service.removeItem(7, product.id);

    expect(cartDelete).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ items: [], totalQuantity: 0, totalCents: 0 });
  });

  it("rejects updates and removals for missing cart items", async () => {
    cartFirst.mockResolvedValue(null);

    await expect(service.updateItem(7, product.id, { quantity: 2 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.removeItem(7, product.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});

import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import { StorageService } from "../storage/storage.service.js";
import { MAX_CART_QUANTITY } from "./cart.constants.js";
import type { AddCartItemDto } from "./dto/add-cart-item.dto.js";
import type { CartDto, CartItemDto } from "./dto/cart.dto.js";
import type { UpdateCartItemDto } from "./dto/update-cart-item.dto.js";

type CartProductRecord = {
  id: bigint | number;
  name: string;
  priceCents: number;
  description: string;
  active: boolean;
};

type CartItemRecord = {
  id: number;
  quantity: number;
  product: CartProductRecord;
};

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getCart(userId: number): Promise<CartDto> {
    const items = await this.prisma.db.orm.public.CartItem.where({ userId })
      .include("product")
      .orderBy((item) => item.id.desc())
      .all();
    const cartItems = await Promise.all(items.map((item) => this.toCartItemDto(item)));

    return {
      items: cartItems,
      totalQuantity: cartItems.reduce((total, item) => total + item.quantity, 0),
      totalCents: cartItems.reduce((total, item) => total + item.lineTotalCents, 0),
    };
  }

  async addItem(userId: number, dto: AddCartItemDto): Promise<CartDto> {
    const productId = BigInt(dto.productId);
    const product = await this.prisma.db.orm.public.Product.first({ id: productId, active: true });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const existingItem = await this.prisma.db.orm.public.CartItem.first({
      userId,
      productId,
    });

    if (existingItem) {
      const quantity = Math.min(existingItem.quantity + dto.quantity, MAX_CART_QUANTITY);

      await this.prisma.db.orm.public.CartItem.where({ id: existingItem.id }).update({
        quantity,
      });
    } else {
      await this.prisma.db.orm.public.CartItem.create({
        userId,
        productId,
        quantity: dto.quantity,
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: number, productId: bigint, dto: UpdateCartItemDto): Promise<CartDto> {
    const item = await this.findItem(userId, productId);

    await this.prisma.db.orm.public.CartItem.where({ id: item.id }).update({
      quantity: dto.quantity,
    });

    return this.getCart(userId);
  }

  async removeItem(userId: number, productId: bigint): Promise<CartDto> {
    const item = await this.findItem(userId, productId);

    await this.prisma.db.orm.public.CartItem.where({ id: item.id }).delete();

    return this.getCart(userId);
  }

  private async findItem(userId: number, productId: bigint) {
    const item = await this.prisma.db.orm.public.CartItem.first({ userId, productId });

    if (!item) {
      throw new NotFoundException("Cart item not found");
    }

    return item;
  }

  private async toCartItemDto(item: CartItemRecord): Promise<CartItemDto> {
    return {
      product: {
        id: item.product.id.toString(),
        name: item.product.name,
        priceCents: item.product.priceCents,
        description: item.product.description,
        active: item.product.active,
        imageUrl: await this.storage.getProductImageUrl(BigInt(item.product.id)),
      },
      quantity: item.quantity,
      lineTotalCents: item.product.priceCents * item.quantity,
    };
  }
}

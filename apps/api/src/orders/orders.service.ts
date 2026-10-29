import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import type { OrderDto } from "./dto/order.dto.js";

export type PendingOrderItem = {
  productId: bigint;
  name: string;
  priceCents: number;
  quantity: number;
};

type OrderItemRecord = {
  id: number;
  orderId: number;
  productId: bigint;
  name: string;
  priceCents: number;
  quantity: number;
};

type OrderRecord = {
  id: number;
  userId: number;
  status: "pending" | "paid";
  totalCents: number;
  stripeSessionId: string | null;
  createdAt: string;
  items: OrderItemRecord[];
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createPendingOrder(
    userId: number,
    items: PendingOrderItem[],
    totalCents: number,
  ): Promise<{ id: number }> {
    const order = await this.prisma.db.orm.public.Order.create({
      userId,
      totalCents,
      status: "pending",
    });

    try {
      for (const item of items) {
        await this.prisma.db.orm.public.OrderItem.create({
          orderId: order.id,
          productId: item.productId,
          name: item.name,
          priceCents: item.priceCents,
          quantity: item.quantity,
        });
      }
    } catch (error) {
      await this.deleteOrder(order.id);
      throw error;
    }

    return { id: order.id };
  }

  async attachStripeSession(orderId: number, stripeSessionId: string): Promise<void> {
    await this.prisma.db.orm.public.Order.where({ id: orderId }).update({ stripeSessionId });
  }

  async deleteOrder(orderId: number): Promise<void> {
    await this.prisma.db.orm.public.Order.where({ id: orderId }).delete();
  }

  async getBySession(userId: number, stripeSessionId: string): Promise<OrderDto | null> {
    const order = await this.prisma.db.orm.public.Order.where({
      userId,
      stripeSessionId,
    })
      .include("items")
      .first();

    return order ? this.toDto(order) : null;
  }

  async markPaid(orderId: number): Promise<OrderDto> {
    await this.prisma.db.orm.public.Order.where({ id: orderId }).update({ status: "paid" });

    const order = await this.prisma.db.orm.public.Order.where({ id: orderId })
      .include("items")
      .first();

    if (!order) {
      throw new Error("Order not found after payment");
    }

    return this.toDto(order);
  }

  async listPaid(userId: number): Promise<OrderDto[]> {
    const orders = await this.prisma.db.orm.public.Order.where({ userId, status: "paid" })
      .include("items")
      .orderBy((order) => order.id.desc())
      .all();

    return orders.map((order) => this.toDto(order));
  }

  private toDto(order: OrderRecord): OrderDto {
    return {
      id: order.id,
      status: order.status,
      totalCents: order.totalCents,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productId: item.productId.toString(),
        name: item.name,
        priceCents: item.priceCents,
        quantity: item.quantity,
        lineTotalCents: item.priceCents * item.quantity,
      })),
    };
  }
}

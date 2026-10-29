import { ApiProperty } from "@nestjs/swagger";

export class OrderItemDto {
  @ApiProperty({ type: String, example: "1" })
  productId!: string;

  @ApiProperty({ type: String, example: "Canvas backpack" })
  name!: string;

  @ApiProperty({ type: Number, example: 4999 })
  priceCents!: number;

  @ApiProperty({ type: Number, example: 2 })
  quantity!: number;

  @ApiProperty({ type: Number, example: 9998 })
  lineTotalCents!: number;
}

export class OrderDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, enum: ["pending", "paid"], example: "paid" })
  status!: "pending" | "paid";

  @ApiProperty({ type: Number, example: 9998 })
  totalCents!: number;

  @ApiProperty({ type: String, example: "2026-10-29T21:34:00.000Z" })
  createdAt!: string;

  @ApiProperty({ type: () => [OrderItemDto] })
  items!: OrderItemDto[];
}

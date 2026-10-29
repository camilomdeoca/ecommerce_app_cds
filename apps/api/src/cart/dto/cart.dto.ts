import { ApiProperty } from "@nestjs/swagger";
import { ProductDto } from "../../products/dto/product.dto.js";

export class CartItemDto {
  @ApiProperty({ type: () => ProductDto })
  product!: ProductDto;

  @ApiProperty({ type: Number, example: 2 })
  quantity!: number;

  @ApiProperty({ type: Number, example: 9998 })
  lineTotalCents!: number;
}

export class CartDto {
  @ApiProperty({ type: () => [CartItemDto] })
  items!: CartItemDto[];

  @ApiProperty({ type: Number, example: 2 })
  totalQuantity!: number;

  @ApiProperty({ type: Number, example: 9998 })
  totalCents!: number;
}

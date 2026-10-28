import { ApiProperty } from "@nestjs/swagger";
import { ProductDto } from "./product.dto.js";

export class ProductPageDto {
  @ApiProperty({ type: () => [ProductDto] })
  items!: ProductDto[];

  @ApiProperty({ type: Number, example: 1 })
  page!: number;

  @ApiProperty({ type: Number, example: 12 })
  pageSize!: number;

  @ApiProperty({ type: Number, example: 42 })
  total!: number;

  @ApiProperty({ type: Number, example: 4 })
  totalPages!: number;
}

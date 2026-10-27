import { ApiProperty } from "@nestjs/swagger";

export class ProductDto {
  @ApiProperty({ type: String, example: "1" })
  id!: string;

  @ApiProperty({ type: String, example: "Canvas backpack" })
  name!: string;

  @ApiProperty({ type: Number, example: 4999 })
  priceCents!: number;

  @ApiProperty({ type: String, example: "A durable everyday backpack." })
  description!: string;

  @ApiProperty({
    type: String,
    example: "http://localhost:3001/api/v1/products/1/image",
  })
  imageUrl!: string;
}

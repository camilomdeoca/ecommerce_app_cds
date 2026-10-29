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

  @ApiProperty({ type: Boolean, example: true })
  active!: boolean;

  @ApiProperty({
    type: String,
    example:
      "http://localhost:8333/media/products/1/image?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=...",
  })
  imageUrl!: string;
}

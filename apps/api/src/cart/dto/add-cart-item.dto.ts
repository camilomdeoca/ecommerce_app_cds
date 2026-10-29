import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";
import { MAX_CART_QUANTITY } from "../cart.constants.js";

export class AddCartItemDto {
  @ApiProperty({ type: String, example: "1" })
  @IsString()
  @MaxLength(19)
  @Matches(/^[1-9]\d*$/, { message: "productId must be a positive integer" })
  productId!: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: MAX_CART_QUANTITY, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CART_QUANTITY)
  quantity = 1;
}

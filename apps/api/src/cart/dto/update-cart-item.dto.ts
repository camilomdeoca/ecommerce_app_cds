import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
import { MAX_CART_QUANTITY } from "../cart.constants.js";

export class UpdateCartItemDto {
  @ApiProperty({ type: Number, minimum: 1, maximum: MAX_CART_QUANTITY, example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CART_QUANTITY)
  quantity!: number;
}

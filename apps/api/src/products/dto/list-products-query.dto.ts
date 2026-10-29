import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class ListProductsQueryDto {
  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 12, example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 12;

  @ApiPropertyOptional({ type: String, maxLength: 100, example: "backpack" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

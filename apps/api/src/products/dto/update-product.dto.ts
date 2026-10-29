import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsInt, IsString, MaxLength, Min, MinLength, ValidateIf } from "class-validator";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

const isProvided = (_object: unknown, value: unknown): boolean => value !== undefined;

export class UpdateProductDto {
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 120, example: "Canvas backpack" })
  @ValidateIf(isProvided)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, example: 4999 })
  @ValidateIf(isProvided)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priceCents?: number;

  @ApiPropertyOptional({
    type: String,
    minLength: 1,
    maxLength: 2000,
    example: "A durable everyday backpack.",
  })
  @ValidateIf(isProvided)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description?: string;
}

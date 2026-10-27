import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsInt, IsString, MaxLength, Min, MinLength } from "class-validator";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateProductDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 120, example: "Canvas backpack" })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ type: Number, minimum: 1, example: 4999 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priceCents!: number;

  @ApiProperty({
    type: String,
    minLength: 1,
    maxLength: 2000,
    example: "A durable everyday backpack.",
  })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;
}

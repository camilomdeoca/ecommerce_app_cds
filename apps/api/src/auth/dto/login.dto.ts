import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ type: String, example: "customer@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ type: String, minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

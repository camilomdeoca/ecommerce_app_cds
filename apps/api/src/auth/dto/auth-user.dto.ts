import { ApiProperty } from "@nestjs/swagger";
import type { UserRole } from "../auth.types.js";

export class AuthUserDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: "customer@example.com" })
  email!: string;

  @ApiProperty({ type: String, enum: ["customer", "admin"], example: "customer" })
  role!: UserRole;
}

import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class ConfirmCheckoutDto {
  @ApiProperty({ type: String, example: "cs_test_a1b2c3" })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Matches(/^cs_(test|live)_/, { message: "sessionId must be a Stripe Checkout Session id" })
  sessionId!: string;
}

import { ApiProperty } from "@nestjs/swagger";

export class CheckoutSessionDto {
  @ApiProperty({
    type: String,
    example: "https://checkout.stripe.com/c/pay/cs_test_...",
  })
  url!: string;
}

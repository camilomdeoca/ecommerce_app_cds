import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { AuthTokenPayload } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { CustomerGuard } from "../auth/guards/role.guards.js";
import { OrderDto } from "../orders/dto/order.dto.js";
import { CheckoutService } from "./checkout.service.js";
import { CheckoutSessionDto } from "./dto/checkout-session.dto.js";
import { ConfirmCheckoutDto } from "./dto/confirm-checkout.dto.js";

@ApiTags("checkout")
@Controller("checkout")
@UseGuards(CustomerGuard)
@ApiCookieAuth("auth_token")
@ApiUnauthorizedResponse()
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post("sessions")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a Stripe Checkout Session for the current cart" })
  @ApiCreatedResponse({ type: CheckoutSessionDto })
  @ApiBadRequestResponse({ description: "Cart is empty or contains unavailable products" })
  @ApiBadGatewayResponse({ description: "Stripe could not create the Checkout Session" })
  createSession(@CurrentUser() user: AuthTokenPayload): Promise<CheckoutSessionDto> {
    return this.checkoutService.createSession(user);
  }

  @Post("confirm")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirm a completed Stripe Checkout Session" })
  @ApiBody({ type: ConfirmCheckoutDto })
  @ApiOkResponse({ type: OrderDto })
  @ApiBadRequestResponse({ description: "Payment amount does not match the order" })
  @ApiConflictResponse({ description: "Payment has not been completed" })
  @ApiNotFoundResponse({ description: "Order not found" })
  @ApiBadGatewayResponse({ description: "Stripe could not retrieve the Checkout Session" })
  confirmCheckout(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: ConfirmCheckoutDto,
  ): Promise<OrderDto> {
    return this.checkoutService.confirm(user.sub, dto.sessionId);
  }
}

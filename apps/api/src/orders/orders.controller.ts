import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { AuthTokenPayload } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { CustomerGuard } from "../auth/guards/role.guards.js";
import { OrderDto } from "./dto/order.dto.js";
import { OrdersService } from "./orders.service.js";

@ApiTags("orders")
@Controller("orders")
@UseGuards(CustomerGuard)
@ApiCookieAuth("auth_token")
@ApiUnauthorizedResponse()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's paid orders" })
  @ApiOkResponse({ type: [OrderDto] })
  listOrders(@CurrentUser() user: AuthTokenPayload): Promise<OrderDto[]> {
    return this.ordersService.listPaid(user.sub);
  }
}

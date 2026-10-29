import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { AuthTokenPayload } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { CustomerGuard } from "../auth/guards/role.guards.js";
import { ParseBigIntPipe } from "../products/parse-bigint.pipe.js";
import { CartService } from "./cart.service.js";
import { AddCartItemDto } from "./dto/add-cart-item.dto.js";
import { CartDto } from "./dto/cart.dto.js";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto.js";

@ApiTags("cart")
@Controller("cart")
@UseGuards(CustomerGuard)
@ApiCookieAuth("auth_token")
@ApiUnauthorizedResponse()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: "Get the current user's cart" })
  @ApiOkResponse({ type: CartDto })
  getCart(@CurrentUser() user: AuthTokenPayload): Promise<CartDto> {
    return this.cartService.getCart(user.sub);
  }

  @Post("items")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Add a product to the cart" })
  @ApiBody({ type: AddCartItemDto })
  @ApiOkResponse({ type: CartDto })
  @ApiBadRequestResponse({ description: "Invalid product id or quantity" })
  @ApiNotFoundResponse({ description: "Product not found" })
  addItem(@CurrentUser() user: AuthTokenPayload, @Body() dto: AddCartItemDto): Promise<CartDto> {
    return this.cartService.addItem(user.sub, dto);
  }

  @Patch("items/:productId")
  @ApiOperation({ summary: "Update a cart item quantity" })
  @ApiParam({ name: "productId", type: String, example: "1" })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiOkResponse({ type: CartDto })
  @ApiBadRequestResponse({ description: "Invalid product id or quantity" })
  @ApiNotFoundResponse({ description: "Cart item not found" })
  updateItem(
    @CurrentUser() user: AuthTokenPayload,
    @Param("productId", ParseBigIntPipe) productId: bigint,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartDto> {
    return this.cartService.updateItem(user.sub, productId, dto);
  }

  @Delete("items/:productId")
  @ApiOperation({ summary: "Remove a product from the cart" })
  @ApiParam({ name: "productId", type: String, example: "1" })
  @ApiOkResponse({ type: CartDto })
  @ApiBadRequestResponse({ description: "Invalid product id" })
  @ApiNotFoundResponse({ description: "Cart item not found" })
  removeItem(
    @CurrentUser() user: AuthTokenPayload,
    @Param("productId", ParseBigIntPipe) productId: bigint,
  ): Promise<CartDto> {
    return this.cartService.removeItem(user.sub, productId);
  }
}

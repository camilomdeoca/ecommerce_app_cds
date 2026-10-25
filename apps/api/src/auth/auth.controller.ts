import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from "@nestjs/common";
import {
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Response } from "express";
import { clearAuthCookie, setAuthCookie } from "./auth.cookie.js";
import { AuthService } from "./auth.service.js";
import type { AuthTokenPayload, AuthUser } from "./auth.types.js";
import { CurrentUser } from "./current-user.decorator.js";
import { AuthUserDto } from "./dto/auth-user.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { SignupDto } from "./dto/signup.dto.js";
import { CustomerGuard } from "./guards/role.guards.js";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @ApiOperation({ summary: "Create a customer account" })
  @ApiBody({ type: SignupDto })
  @ApiCreatedResponse({ type: AuthUserDto })
  @ApiConflictResponse({ description: "Email is already registered" })
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUser> {
    const { user, token } = await this.authService.signup(dto.email, dto.password);

    setAuthCookie(response, token);

    return user;
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Sign in" })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiUnauthorizedResponse({ description: "Invalid email or password" })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUser> {
    const { user, token } = await this.authService.login(dto.email, dto.password);

    setAuthCookie(response, token);

    return user;
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Sign out" })
  @ApiNoContentResponse()
  logout(@Res({ passthrough: true }) response: Response): void {
    clearAuthCookie(response);
  }

  @Get("me")
  @UseGuards(CustomerGuard)
  @ApiCookieAuth("auth_token")
  @ApiOperation({ summary: "Get the signed-in user" })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiUnauthorizedResponse()
  getCurrentUser(@CurrentUser() payload: AuthTokenPayload): Promise<AuthUser> {
    return this.authService.getCurrentUser(payload.sub);
  }
}

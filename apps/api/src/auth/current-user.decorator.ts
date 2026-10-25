import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { AuthTokenPayload } from "./auth.types.js";

type AuthenticatedRequest = Request & {
  user: AuthTokenPayload;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthTokenPayload => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);

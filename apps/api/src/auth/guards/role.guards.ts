import { ExecutionContext, ForbiddenException, mixin } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { AuthTokenPayload, UserRole } from "../auth.types.js";

function createRoleGuard(allowedRoles: readonly UserRole[]) {
  class RoleGuard extends AuthGuard("jwt") {
    override handleRequest<TUser = AuthTokenPayload>(
      err: unknown,
      user: unknown,
      info: unknown,
      context: ExecutionContext,
      status?: unknown,
    ): TUser {
      const authenticated = super.handleRequest<TUser>(err, user, info, context, status);

      if (!allowedRoles.includes((authenticated as AuthTokenPayload).role)) {
        throw new ForbiddenException("You do not have access to this resource");
      }

      return authenticated;
    }
  }

  return mixin(RoleGuard);
}

export const CustomerGuard = createRoleGuard(["customer", "admin"]);
export const AdminGuard = createRoleGuard(["admin"]);

import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PrismaModule } from "../prisma.module.js";
import { JWT_EXPIRES_IN, getJwtSecret } from "./auth.config.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { AdminGuard, CustomerGuard } from "./guards/role.guards.js";
import { JwtStrategy } from "./jwt.strategy.js";

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
        signOptions: { expiresIn: JWT_EXPIRES_IN },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, CustomerGuard, AdminGuard],
  exports: [AuthService, CustomerGuard, AdminGuard],
})
export class AuthModule {}

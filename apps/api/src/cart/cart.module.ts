import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { CartController } from "./cart.controller.js";
import { CartService } from "./cart.service.js";

@Module({
  imports: [AuthModule, PrismaModule, StorageModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}

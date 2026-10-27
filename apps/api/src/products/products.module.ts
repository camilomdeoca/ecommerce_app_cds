import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { ProductsController } from "./products.controller.js";
import { ProductsService } from "./products.service.js";

@Module({
  imports: [AuthModule, PrismaModule, StorageModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}

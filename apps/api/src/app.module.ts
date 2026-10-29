import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AuthModule } from "./auth/auth.module.js";
import { CartModule } from "./cart/cart.module.js";
import { CheckoutModule } from "./checkout/checkout.module.js";
import { OrdersModule } from "./orders/orders.module.js";
import { PrismaModule } from "./prisma.module.js";
import { ProductsModule } from "./products/products.module.js";

@Module({
  imports: [PrismaModule, AuthModule, ProductsModule, CartModule, CheckoutModule, OrdersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

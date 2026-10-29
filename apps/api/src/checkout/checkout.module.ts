import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CartModule } from "../cart/cart.module.js";
import { OrdersModule } from "../orders/orders.module.js";
import { CheckoutController } from "./checkout.controller.js";
import { CheckoutService } from "./checkout.service.js";
import { createStripeClient, STRIPE_CLIENT } from "./stripe.config.js";

@Module({
  imports: [AuthModule, CartModule, OrdersModule],
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    {
      provide: STRIPE_CLIENT,
      useFactory: createStripeClient,
    },
  ],
})
export class CheckoutModule {}

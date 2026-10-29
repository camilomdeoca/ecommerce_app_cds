import { randomUUID } from "node:crypto";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import type { App } from "supertest/types.js";
import type Stripe from "stripe";
import { AppModule } from "./../src/app.module.js";
import { STRIPE_CLIENT, type StripeClient } from "./../src/checkout/stripe.config.js";
import { PrismaService } from "./../src/prisma.service.js";

type OrderBody = {
  id: number;
  status: "pending" | "paid";
  totalCents: number;
  createdAt: string;
  items: Array<{
    productId: string;
    name: string;
    priceCents: number;
    quantity: number;
    lineTotalCents: number;
  }>;
};

describe("Checkout (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdEmails: string[] = [];
  const createdProductIds: bigint[] = [];
  let sessionId = "";
  let lastCreateParams: Stripe.Checkout.SessionCreateParams | null = null;
  let lastAmountTotal = 0;
  let failCreate = false;

  const fakeStripe: StripeClient = {
    checkout: {
      sessions: {
        create: (params: Stripe.Checkout.SessionCreateParams = {}) => {
          if (failCreate) {
            throw new Error("Stripe unavailable");
          }

          sessionId = `cs_test_e2e_${randomUUID()}`;
          lastCreateParams = params;
          lastAmountTotal = (params.line_items ?? []).reduce((total, item) => {
            if (!item.price_data || item.quantity === undefined) {
              return total;
            }

            return total + (item.price_data.unit_amount ?? 0) * item.quantity;
          }, 0);

          return Promise.resolve({
            id: sessionId,
            url: "https://checkout.stripe.test/session",
          } as Stripe.Checkout.Session);
        },
        retrieve: () =>
          Promise.resolve({
            id: sessionId,
            metadata: lastCreateParams?.metadata,
            payment_status: "paid",
            amount_total: lastAmountTotal,
            currency: "usd",
          } as Stripe.Checkout.Session),
      },
    },
  } as unknown as StripeClient;

  const createEmail = () => {
    const email = `checkout-e2e-${randomUUID()}@example.com`;
    createdEmails.push(email);
    return email;
  };

  const signup = async () => {
    const email = createEmail();
    const agent = request.agent(app.getHttpServer());
    const response = await agent
      .post("/api/v1/auth/signup")
      .send({ email, password: "password123" })
      .expect(201);

    return { agent, user: response.body as { id: number } };
  };

  const createProduct = async (priceCents = 4999) => {
    const product = await prisma.db.orm.public.Product.create({
      name: `Checkout product ${randomUUID()}`,
      priceCents,
      description: "A product for checkout tests.",
    });

    createdProductIds.push(BigInt(product.id));
    return product;
  };

  const getOrders = (userId: number) =>
    prisma.db.orm.public.Order.where({ userId })
      .include("items")
      .orderBy((order) => order.id.asc())
      .all();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(STRIPE_CLIENT)
      .useValue(fakeStripe)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(() => {
    sessionId = "";
    lastCreateParams = null;
    lastAmountTotal = 0;
    failCreate = false;
  });

  afterAll(async () => {
    for (const productId of createdProductIds) {
      try {
        await prisma.db.orm.public.Product.where({ id: productId }).delete();
      } catch (cleanupError) {
        void cleanupError;
      }
    }

    for (const email of createdEmails) {
      try {
        await prisma.db.orm.public.User.where({ email }).delete();
      } catch (cleanupError) {
        void cleanupError;
      }
    }

    await app.close();
  });

  it("rejects unauthenticated checkout and order requests", async () => {
    const server = app.getHttpServer();

    await request(server).post("/api/v1/checkout/sessions").expect(401);
    await request(server)
      .post("/api/v1/checkout/confirm")
      .send({ sessionId: "cs_test_missing" })
      .expect(401);
    await request(server).get("/api/v1/orders").expect(401);
  });

  it("rejects empty carts and unavailable products", async () => {
    const { agent } = await signup();

    await agent.post("/api/v1/checkout/sessions").expect(400);

    const product = await createProduct();
    await agent.post("/api/v1/cart/items").send({ productId: product.id.toString() }).expect(200);
    await prisma.db.orm.public.Product.where({ id: product.id }).update({ active: false });

    await agent.post("/api/v1/checkout/sessions").expect(400);
    expect(lastCreateParams).toBeNull();
  });

  it("creates a pending order, confirms payment, clears the cart, and lists paid orders", async () => {
    const { agent, user } = await signup();
    const product = await createProduct(4999);

    await agent
      .post("/api/v1/cart/items")
      .send({ productId: product.id.toString(), quantity: 2 })
      .expect(200);

    const sessionResponse = await agent.post("/api/v1/checkout/sessions").expect(201);

    expect(sessionResponse.body).toEqual({ url: "https://checkout.stripe.test/session" });
    expect(lastCreateParams).toMatchObject({
      mode: "payment",
      line_items: [
        {
          quantity: 2,
          price_data: {
            currency: "usd",
            unit_amount: 4999,
            product_data: { name: product.name },
          },
        },
      ],
    });
    expect(lastCreateParams?.metadata?.userId).toBe(String(user.id));
    expect(lastCreateParams?.metadata?.orderId).toMatch(/^\d+$/);
    expect(lastCreateParams?.success_url).toContain(
      "/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(lastCreateParams?.cancel_url).toContain("/cart");

    const pendingOrders = await getOrders(user.id);

    expect(pendingOrders).toHaveLength(1);
    expect(pendingOrders[0]).toMatchObject({
      status: "pending",
      totalCents: 9998,
      stripeSessionId: sessionId,
    });
    expect(pendingOrders[0]?.items).toHaveLength(1);

    const beforePayment = await agent.get("/api/v1/orders").expect(200);

    expect(beforePayment.body).toEqual([]);

    const confirmResponse = await agent
      .post("/api/v1/checkout/confirm")
      .send({ sessionId })
      .expect(200);
    const confirmedOrder = confirmResponse.body as OrderBody;

    expect(confirmedOrder).toMatchObject({
      id: pendingOrders[0]?.id,
      status: "paid",
      totalCents: 9998,
      items: [
        {
          productId: product.id.toString(),
          name: product.name,
          priceCents: 4999,
          quantity: 2,
          lineTotalCents: 9998,
        },
      ],
    });

    const cartResponse = await agent.get("/api/v1/cart").expect(200);

    expect(cartResponse.body).toEqual({ items: [], totalQuantity: 0, totalCents: 0 });

    const ordersResponse = await agent.get("/api/v1/orders").expect(200);

    expect(ordersResponse.body).toHaveLength(1);
    expect((ordersResponse.body as OrderBody[])[0]).toMatchObject({
      id: confirmedOrder.id,
      status: "paid",
    });

    const repeatResponse = await agent
      .post("/api/v1/checkout/confirm")
      .send({ sessionId })
      .expect(200);

    expect((repeatResponse.body as OrderBody).id).toBe(confirmedOrder.id);
    expect(await getOrders(user.id)).toHaveLength(1);
  });

  it("does not expose one user's session or orders to another user", async () => {
    const firstUser = await signup();
    const secondUser = await signup();
    const product = await createProduct();

    await firstUser.agent
      .post("/api/v1/cart/items")
      .send({ productId: product.id.toString() })
      .expect(200);
    await firstUser.agent.post("/api/v1/checkout/sessions").expect(201);

    await secondUser.agent.post("/api/v1/checkout/confirm").send({ sessionId }).expect(404);

    const secondOrders = await secondUser.agent.get("/api/v1/orders").expect(200);

    expect(secondOrders.body).toEqual([]);
  });

  it("deletes the pending order when Stripe cannot create a session", async () => {
    const { agent, user } = await signup();
    const product = await createProduct();

    await agent.post("/api/v1/cart/items").send({ productId: product.id.toString() }).expect(200);
    failCreate = true;

    await agent.post("/api/v1/checkout/sessions").expect(502);
    expect(await getOrders(user.id)).toHaveLength(0);
  });

  it("rejects malformed session ids", async () => {
    const { agent } = await signup();

    await agent.post("/api/v1/checkout/confirm").send({ sessionId: "not-a-session" }).expect(400);
  });
});

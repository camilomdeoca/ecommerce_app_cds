import { randomUUID } from "node:crypto";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AppModule } from "./../src/app.module.js";
import { PrismaService } from "./../src/prisma.service.js";

type CartBody = {
  items: Array<{
    product: { id: string; name: string; priceCents: number; imageUrl: string };
    quantity: number;
    lineTotalCents: number;
  }>;
  totalQuantity: number;
  totalCents: number;
};

describe("Cart (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdEmails: string[] = [];
  const createdProductIds: bigint[] = [];

  const createEmail = () => {
    const email = `cart-e2e-${randomUUID()}@example.com`;
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
      name: `Cart product ${randomUUID()}`,
      priceCents,
      description: "A product for cart tests.",
    });

    createdProductIds.push(BigInt(product.id));
    return product;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  it("rejects unauthenticated cart requests", async () => {
    const server = app.getHttpServer();

    await request(server).get("/api/v1/cart").expect(401);
    await request(server)
      .post("/api/v1/cart/items")
      .send({ productId: "1", quantity: 1 })
      .expect(401);
    await request(server).patch("/api/v1/cart/items/1").send({ quantity: 1 }).expect(401);
    await request(server).delete("/api/v1/cart/items/1").expect(401);
  });

  it("adds, increments, and returns cart totals", async () => {
    const { agent } = await signup();
    const product = await createProduct();

    const firstResponse = await agent
      .post("/api/v1/cart/items")
      .send({ productId: product.id.toString() })
      .expect(200);
    const firstCart = firstResponse.body as CartBody;

    expect(firstCart.items).toHaveLength(1);
    expect(firstCart.items[0]).toMatchObject({
      quantity: 1,
      lineTotalCents: product.priceCents,
      product: { id: product.id.toString(), name: product.name },
    });
    expect(firstCart.items[0]?.product.imageUrl).toContain(`/media/products/${product.id}/image`);
    expect(firstCart.totalQuantity).toBe(1);
    expect(firstCart.totalCents).toBe(product.priceCents);

    const secondResponse = await agent
      .post("/api/v1/cart/items")
      .send({ productId: product.id.toString(), quantity: 2 })
      .expect(200);
    const secondCart = secondResponse.body as CartBody;

    expect(secondCart.items[0]?.quantity).toBe(3);
    expect(secondCart.totalQuantity).toBe(3);
    expect(secondCart.totalCents).toBe(product.priceCents * 3);

    const getResponse = await agent.get("/api/v1/cart").expect(200);

    expect(getResponse.body).toEqual(secondCart);
  });

  it("keeps each user's cart isolated", async () => {
    const firstUser = await signup();
    const secondUser = await signup();
    const product = await createProduct();

    await firstUser.agent
      .post("/api/v1/cart/items")
      .send({ productId: product.id.toString() })
      .expect(200);

    const firstCart = (await firstUser.agent.get("/api/v1/cart").expect(200)).body as CartBody;
    const secondCart = (await secondUser.agent.get("/api/v1/cart").expect(200)).body as CartBody;

    expect(firstCart.totalQuantity).toBe(1);
    expect(secondCart).toEqual({ items: [], totalQuantity: 0, totalCents: 0 });
  });

  it("updates quantities and removes items", async () => {
    const { agent } = await signup();
    const product = await createProduct(2500);

    await agent.post("/api/v1/cart/items").send({ productId: product.id.toString() }).expect(200);

    const updateResponse = await agent
      .patch(`/api/v1/cart/items/${product.id}`)
      .send({ quantity: 5 })
      .expect(200);
    const updatedCart = updateResponse.body as CartBody;

    expect(updatedCart.items[0]?.quantity).toBe(5);
    expect(updatedCart.totalCents).toBe(12500);

    const removeResponse = await agent.delete(`/api/v1/cart/items/${product.id}`).expect(200);

    expect(removeResponse.body).toEqual({ items: [], totalQuantity: 0, totalCents: 0 });
  });

  it("rejects invalid products, quantities, and missing cart items", async () => {
    const { agent } = await signup();
    const product = await createProduct();

    await agent
      .post("/api/v1/cart/items")
      .send({ productId: "999999999", quantity: 1 })
      .expect(404);
    await agent
      .post("/api/v1/cart/items")
      .send({ productId: product.id.toString(), quantity: 0 })
      .expect(400);
    await agent
      .post("/api/v1/cart/items")
      .send({ productId: product.id.toString(), quantity: 100 })
      .expect(400);
    await agent.patch("/api/v1/cart/items/not-a-number").send({ quantity: 1 }).expect(400);
    await agent.patch(`/api/v1/cart/items/${product.id}`).send({ quantity: 0 }).expect(400);
    await agent.delete(`/api/v1/cart/items/${product.id}`).expect(404);
  });
});

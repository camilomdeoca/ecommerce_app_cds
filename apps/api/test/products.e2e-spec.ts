import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AppModule } from "./../src/app.module.js";
import { PrismaService } from "./../src/prisma.service.js";
import { MAX_IMAGE_BYTES } from "./../src/storage/storage.config.js";
import { getProductImageKey } from "./../src/storage/storage.service.js";

const pngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

describe("Products (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let s3: S3Client;
  let bucket: string;
  const createdEmails: string[] = [];
  const createdProductIds: bigint[] = [];

  const createEmail = () => {
    const email = `products-e2e-${randomUUID()}@example.com`;
    createdEmails.push(email);
    return email;
  };

  const signup = async (email: string) => {
    const agent = request.agent(app.getHttpServer());
    const response = await agent
      .post("/api/v1/auth/signup")
      .send({ email, password: "password123" })
      .expect(201);

    return { agent, user: response.body as { id: number; email: string; role: string } };
  };

  const createAdminAgent = async () => {
    const email = createEmail();
    const { agent, user } = await signup(email);

    await prisma.db.orm.public.User.where({ id: user.id }).update({ role: "admin" });

    await agent.post("/api/v1/auth/logout").expect(204);
    await agent.post("/api/v1/auth/login").send({ email, password: "password123" }).expect(200);

    return agent;
  };

  const postProduct = (
    agent: ReturnType<typeof request.agent>,
    overrides: {
      name?: string;
      priceCents?: string;
      description?: string;
      imageBuffer?: Buffer;
      imageType?: string;
      filename?: string;
    } = {},
  ) => {
    const requestBuilder = agent.post("/api/v1/admin/products");

    if (overrides.name !== undefined) {
      requestBuilder.field("name", overrides.name);
    }
    if (overrides.priceCents !== undefined) {
      requestBuilder.field("priceCents", overrides.priceCents);
    }
    if (overrides.description !== undefined) {
      requestBuilder.field("description", overrides.description);
    }
    if (overrides.imageBuffer) {
      requestBuilder.attach("image", overrides.imageBuffer, {
        filename: overrides.filename ?? "product.png",
        contentType: overrides.imageType ?? "image/png",
      });
    }

    return requestBuilder;
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
    bucket = requireEnv("S3_BUCKET");
    s3 = new S3Client({
      endpoint: requireEnv("S3_ENDPOINT"),
      region: requireEnv("S3_REGION"),
      forcePathStyle: true,
      credentials: {
        accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
      },
    });
  });

  afterAll(async () => {
    for (const productId of createdProductIds) {
      const key = getProductImageKey(productId);

      try {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      } catch (cleanupError) {
        void cleanupError;
      }

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

    s3.destroy();
    await app.close();
  });

  it("rejects unauthenticated and customer requests", async () => {
    await postProduct(request(app.getHttpServer()), {
      name: "Unauthenticated product",
      priceCents: "1000",
      description: "Should not be created",
      imageBuffer: pngBuffer,
    }).expect(401);

    const customerEmail = createEmail();
    const { agent: customerAgent } = await signup(customerEmail);

    await postProduct(customerAgent, {
      name: "Customer product",
      priceCents: "1000",
      description: "Should not be created",
      imageBuffer: pngBuffer,
    }).expect(403);
  });

  it("creates a product with an image stored in SeaweedFS", async () => {
    const adminAgent = await createAdminAgent();
    const name = `E2E product ${randomUUID()}`;

    const response = await postProduct(adminAgent, {
      name: `  ${name}  `,
      priceCents: "4999",
      description: "  A durable everyday backpack.  ",
      imageBuffer: pngBuffer,
    }).expect(201);
    const product = response.body as {
      id: string;
      name: string;
      priceCents: number;
      description: string;
      imageUrl: string;
    };

    expect(typeof product.id).toBe("string");
    expect(product).toMatchObject({
      name,
      priceCents: 4999,
      description: "A durable everyday backpack.",
    });
    expect(product.imageUrl).toContain(`/api/v1/products/${product.id}/image`);

    const productId = BigInt(product.id);
    createdProductIds.push(productId);

    await expect(
      s3.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: getProductImageKey(productId),
        }),
      ),
    ).resolves.toMatchObject({ ContentType: "image/png" });

    const imageResponse = await request(app.getHttpServer())
      .get(`/api/v1/products/${product.id}/image`)
      .expect(200);
    const imageBody = imageResponse.body as Buffer;

    expect(imageResponse.headers["content-type"]).toContain("image/png");
    expect(imageResponse.headers["cache-control"]).toContain("max-age=31536000");
    expect(Buffer.isBuffer(imageBody)).toBe(true);
    expect(imageBody.equals(pngBuffer)).toBe(true);
  });

  it("rejects invalid images, oversized images, and missing fields", async () => {
    const adminAgent = await createAdminAgent();

    await postProduct(adminAgent, {
      name: "Invalid image product",
      priceCents: "1000",
      description: "Bad image",
      imageBuffer: Buffer.from("not an image"),
      imageType: "text/plain",
      filename: "bad.txt",
    }).expect(400);

    await postProduct(adminAgent, {
      name: "Oversized image product",
      priceCents: "1000",
      description: "Large image",
      imageBuffer: Buffer.alloc(MAX_IMAGE_BYTES + 1),
    }).expect(413);

    await postProduct(adminAgent, {
      name: "Missing fields product",
      imageBuffer: pngBuffer,
    }).expect(400);
  });

  it("rejects invalid product ids and returns 404 for missing products", async () => {
    await request(app.getHttpServer()).get("/api/v1/products/not-a-number/image").expect(400);
    await request(app.getHttpServer()).get("/api/v1/products/999999999/image").expect(404);
  });
});

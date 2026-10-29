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

const replacementPngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

type ProductListBody = {
  items: Array<{ id: string; imageUrl: string; active: boolean }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

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
  let publicS3Origin: string;
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

  const patchProduct = (
    agent: ReturnType<typeof request.agent>,
    productId: string,
    overrides: {
      name?: string;
      priceCents?: string;
      description?: string;
      active?: string;
      imageBuffer?: Buffer;
      imageType?: string;
      filename?: string;
    } = {},
  ) => {
    const requestBuilder = agent.patch(`/api/v1/admin/products/${productId}`);

    if (overrides.name !== undefined) {
      requestBuilder.field("name", overrides.name);
    }
    if (overrides.priceCents !== undefined) {
      requestBuilder.field("priceCents", overrides.priceCents);
    }
    if (overrides.description !== undefined) {
      requestBuilder.field("description", overrides.description);
    }
    if (overrides.active !== undefined) {
      requestBuilder.field("active", overrides.active);
    }
    if (overrides.imageBuffer) {
      requestBuilder.attach("image", overrides.imageBuffer, {
        filename: overrides.filename ?? "product.png",
        contentType: overrides.imageType ?? "image/png",
      });
    }

    return requestBuilder;
  };

  const deleteProduct = (agent: ReturnType<typeof request.agent>, productId: string) =>
    agent.delete(`/api/v1/admin/products/${productId}`);

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
    publicS3Origin = new URL(requireEnv("S3_PUBLIC_URL")).origin;
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
      active: boolean;
      imageUrl: string;
    };

    expect(typeof product.id).toBe("string");
    expect(product).toMatchObject({
      name,
      priceCents: 4999,
      description: "A durable everyday backpack.",
      active: true,
    });

    const productId = BigInt(product.id);
    createdProductIds.push(productId);

    const imageUrl = new URL(product.imageUrl);
    expect(imageUrl.origin).toBe(publicS3Origin);
    expect(imageUrl.pathname).toBe(`/media/products/${product.id}/image`);
    expect(imageUrl.searchParams.get("X-Amz-Signature")).toBeTruthy();

    await expect(
      s3.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: getProductImageKey(productId),
        }),
      ),
    ).resolves.toMatchObject({ ContentType: "image/png" });

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/products/${product.id}`)
      .expect(200);

    expect(detailResponse.body).toMatchObject({
      id: product.id,
      name,
      priceCents: 4999,
      description: "A durable everyday backpack.",
    });

    const imageResponse = await fetch(product.imageUrl);

    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers.get("content-type")).toContain("image/png");
    const imageBody = Buffer.from(await imageResponse.arrayBuffer());

    expect(imageBody.equals(pngBuffer)).toBe(true);
  });

  it("rejects unauthenticated and customer product updates", async () => {
    const adminAgent = await createAdminAgent();
    const response = await postProduct(adminAgent, {
      name: `E2E update auth product ${randomUUID()}`,
      priceCents: "1000",
      description: "Update auth product",
      imageBuffer: pngBuffer,
    }).expect(201);
    const product = response.body as { id: string };
    createdProductIds.push(BigInt(product.id));

    await patchProduct(request(app.getHttpServer()), product.id, {
      name: "Unauthenticated update",
    }).expect(401);

    const customerEmail = createEmail();
    const { agent: customerAgent } = await signup(customerEmail);

    await patchProduct(customerAgent, product.id, { name: "Customer update" }).expect(403);
  });

  it("updates product fields and replaces the image", async () => {
    const adminAgent = await createAdminAgent();
    const createResponse = await postProduct(adminAgent, {
      name: `E2E update product ${randomUUID()}`,
      priceCents: "1000",
      description: "Original description",
      imageBuffer: pngBuffer,
    }).expect(201);
    const created = createResponse.body as { id: string };
    const productId = BigInt(created.id);
    createdProductIds.push(productId);

    const updatedName = `E2E updated product ${randomUUID()}`;
    const response = await patchProduct(adminAgent, created.id, {
      name: `  ${updatedName}  `,
      priceCents: "2599",
      description: "  Updated description  ",
      imageBuffer: replacementPngBuffer,
    }).expect(200);
    const product = response.body as {
      id: string;
      name: string;
      priceCents: number;
      description: string;
      active: boolean;
      imageUrl: string;
    };

    expect(product).toMatchObject({
      id: created.id,
      name: updatedName,
      priceCents: 2599,
      description: "Updated description",
      active: true,
    });

    await expect(
      s3.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: getProductImageKey(productId),
        }),
      ),
    ).resolves.toMatchObject({ ContentType: "image/png" });

    const imageResponse = await fetch(product.imageUrl);

    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers.get("content-type")).toContain("image/png");
    const imageBody = Buffer.from(await imageResponse.arrayBuffer());

    expect(imageBody.equals(replacementPngBuffer)).toBe(true);

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/products/${created.id}`)
      .expect(200);

    expect(detailResponse.body).toMatchObject({
      id: created.id,
      name: updatedName,
      priceCents: 2599,
      description: "Updated description",
    });
  });

  it("updates only provided fields and keeps the existing image", async () => {
    const adminAgent = await createAdminAgent();
    const createResponse = await postProduct(adminAgent, {
      name: `E2E partial update ${randomUUID()}`,
      priceCents: "1500",
      description: "Original description",
      imageBuffer: pngBuffer,
    }).expect(201);
    const created = createResponse.body as { id: string };
    createdProductIds.push(BigInt(created.id));

    const updatedName = `E2E partial renamed ${randomUUID()}`;
    const response = await patchProduct(adminAgent, created.id, { name: updatedName }).expect(200);
    const product = response.body as {
      name: string;
      priceCents: number;
      description: string;
      imageUrl: string;
    };

    expect(product).toMatchObject({
      name: updatedName,
      priceCents: 1500,
      description: "Original description",
    });

    const imageResponse = await fetch(product.imageUrl);

    expect(imageResponse.status).toBe(200);
    const imageBody = Buffer.from(await imageResponse.arrayBuffer());

    expect(imageBody.equals(pngBuffer)).toBe(true);
  });

  it("deactivates products and hides them from public endpoints", async () => {
    const adminAgent = await createAdminAgent();
    const name = `E2E inactive product ${randomUUID()}`;
    const createResponse = await postProduct(adminAgent, {
      name,
      priceCents: "1000",
      description: "An inactive product",
      imageBuffer: pngBuffer,
    }).expect(201);
    const created = createResponse.body as { id: string; active: boolean };
    createdProductIds.push(BigInt(created.id));

    expect(created.active).toBe(true);

    const updateResponse = await patchProduct(adminAgent, created.id, {
      active: "false",
    }).expect(200);

    expect(updateResponse.body).toMatchObject({ id: created.id, active: false });

    const publicSearchResponse = await request(app.getHttpServer())
      .get(`/api/v1/products?q=${encodeURIComponent(name)}`)
      .expect(200);
    const publicSearchBody = publicSearchResponse.body as ProductListBody;

    expect(publicSearchBody.items.map((item) => item.id)).not.toContain(created.id);

    await request(app.getHttpServer()).get(`/api/v1/products/${created.id}`).expect(404);

    const adminSearchResponse = await adminAgent
      .get(`/api/v1/admin/products?q=${encodeURIComponent(name)}`)
      .expect(200);
    const adminSearchBody = adminSearchResponse.body as ProductListBody;

    expect(adminSearchBody.items).toEqual([
      expect.objectContaining({ id: created.id, active: false }),
    ]);

    const { agent: customerAgent } = await signup(createEmail());

    await customerAgent
      .post("/api/v1/cart/items")
      .send({ productId: created.id, quantity: 1 })
      .expect(404);

    const reactivateResponse = await patchProduct(adminAgent, created.id, {
      active: "true",
    }).expect(200);

    expect(reactivateResponse.body).toMatchObject({ id: created.id, active: true });
    await request(app.getHttpServer()).get(`/api/v1/products/${created.id}`).expect(200);
  });

  it("rejects invalid product updates", async () => {
    const adminAgent = await createAdminAgent();
    const createResponse = await postProduct(adminAgent, {
      name: `E2E invalid update ${randomUUID()}`,
      priceCents: "1000",
      description: "Invalid update product",
      imageBuffer: pngBuffer,
    }).expect(201);
    const created = createResponse.body as { id: string };
    createdProductIds.push(BigInt(created.id));

    await patchProduct(adminAgent, "not-a-number", { name: "Bad id" }).expect(400);
    await patchProduct(adminAgent, "999999999", { name: "Missing product" }).expect(404);
    await patchProduct(adminAgent, created.id).expect(400);
    await patchProduct(adminAgent, created.id, { name: "" }).expect(400);
    await patchProduct(adminAgent, created.id, { active: "not-a-boolean" }).expect(400);
    await patchProduct(adminAgent, created.id, {
      imageBuffer: Buffer.from("not an image"),
      imageType: "text/plain",
      filename: "bad.txt",
    }).expect(400);
    await patchProduct(adminAgent, created.id, {
      imageBuffer: Buffer.alloc(MAX_IMAGE_BYTES + 1),
    }).expect(413);
  });

  it("rejects unauthenticated and customer product deletes", async () => {
    const adminAgent = await createAdminAgent();
    const response = await postProduct(adminAgent, {
      name: `E2E delete auth product ${randomUUID()}`,
      priceCents: "1000",
      description: "Delete auth product",
      imageBuffer: pngBuffer,
    }).expect(201);
    const product = response.body as { id: string };
    createdProductIds.push(BigInt(product.id));

    await deleteProduct(request(app.getHttpServer()), product.id).expect(401);

    const { agent: customerAgent } = await signup(createEmail());

    await deleteProduct(customerAgent, product.id).expect(403);
  });

  it("deletes a product and its image", async () => {
    const adminAgent = await createAdminAgent();
    const response = await postProduct(adminAgent, {
      name: `E2E delete product ${randomUUID()}`,
      priceCents: "1000",
      description: "Delete product",
      imageBuffer: pngBuffer,
    }).expect(201);
    const product = response.body as { id: string };
    const productId = BigInt(product.id);
    createdProductIds.push(productId);

    await deleteProduct(adminAgent, product.id).expect(204);

    await expect(prisma.db.orm.public.Product.first({ id: productId })).resolves.toBeNull();

    await expect(
      s3.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: getProductImageKey(productId),
        }),
      ),
    ).rejects.toMatchObject({ $metadata: { httpStatusCode: 404 } });

    await request(app.getHttpServer()).get(`/api/v1/products/${product.id}`).expect(404);
  });

  it("rejects invalid product deletes", async () => {
    const adminAgent = await createAdminAgent();

    await deleteProduct(adminAgent, "not-a-number").expect(400);
    await deleteProduct(adminAgent, "999999999").expect(404);
  });

  it("requires an administrator to list all products", async () => {
    await request(app.getHttpServer()).get("/api/v1/admin/products").expect(401);

    const { agent: customerAgent } = await signup(createEmail());

    await customerAgent.get("/api/v1/admin/products").expect(403);

    const adminAgent = await createAdminAgent();

    await adminAgent.get("/api/v1/admin/products").expect(200);
  });

  it("lists products with pagination and presigned image URLs", async () => {
    const adminAgent = await createAdminAgent();
    const createdProducts: Array<{ id: string; imageUrl: string }> = [];

    for (let index = 0; index < 3; index += 1) {
      const response = await postProduct(adminAgent, {
        name: `E2E paginated product ${randomUUID()}`,
        priceCents: "1000",
        description: "Pagination product",
        imageBuffer: pngBuffer,
      }).expect(201);
      const createdProduct = response.body as { id: string; imageUrl: string };

      createdProducts.push(createdProduct);
      createdProductIds.push(BigInt(createdProduct.id));
    }

    const firstPage = await request(app.getHttpServer())
      .get("/api/v1/products?page=1&pageSize=2")
      .expect(200);
    const firstPageBody = firstPage.body as ProductListBody;

    expect(firstPageBody).toMatchObject({ page: 1, pageSize: 2 });
    expect(firstPageBody.items).toHaveLength(2);
    expect(firstPageBody.total).toBeGreaterThanOrEqual(3);
    expect(firstPageBody.totalPages).toBe(Math.ceil(firstPageBody.total / 2));
    expect(firstPageBody.items.map((item) => item.id)).toEqual([
      createdProducts[2]?.id,
      createdProducts[1]?.id,
    ]);
    expect(new URL(firstPageBody.items[0]?.imageUrl ?? "").origin).toBe(publicS3Origin);

    const secondPage = await request(app.getHttpServer())
      .get("/api/v1/products?page=2&pageSize=2")
      .expect(200);
    const secondPageBody = secondPage.body as ProductListBody;

    expect(secondPageBody.items[0]?.id).toBe(createdProducts[0]?.id);

    const outOfRangePage = await request(app.getHttpServer())
      .get("/api/v1/products?page=999&pageSize=2")
      .expect(200);
    const outOfRangePageBody = outOfRangePage.body as ProductListBody;

    expect(outOfRangePageBody.items).toEqual([]);
  });

  it("searches names and descriptions, ranking name matches first", async () => {
    const adminAgent = await createAdminAgent();
    const searchToken = `relevance${randomUUID().replaceAll("-", "")}`;

    const nameMatchResponse = await postProduct(adminAgent, {
      name: `E2E ${searchToken} backpack`,
      priceCents: "1000",
      description: "A useful bag.",
      imageBuffer: pngBuffer,
    }).expect(201);
    const nameMatch = nameMatchResponse.body as { id: string };

    const descriptionMatchResponse = await postProduct(adminAgent, {
      name: "E2E description match",
      priceCents: "1000",
      description: `A useful bag with ${searchToken}.`,
      imageBuffer: pngBuffer,
    }).expect(201);
    const descriptionMatch = descriptionMatchResponse.body as { id: string };

    createdProductIds.push(BigInt(nameMatch.id), BigInt(descriptionMatch.id));

    const searchResponse = await request(app.getHttpServer())
      .get(`/api/v1/products?q=${encodeURIComponent(searchToken.toUpperCase())}&pageSize=100`)
      .expect(200);
    const searchBody = searchResponse.body as ProductListBody;

    expect(searchBody.total).toBe(2);
    expect(searchBody.totalPages).toBe(1);
    expect(searchBody.items.map((item) => item.id)).toEqual([nameMatch.id, descriptionMatch.id]);

    const partialResponse = await request(app.getHttpServer())
      .get(`/api/v1/products?q=${encodeURIComponent(searchToken.slice(0, 12))}&pageSize=100`)
      .expect(200);
    const partialBody = partialResponse.body as ProductListBody;

    expect(partialBody.total).toBe(2);
    expect(partialBody.items.map((item) => item.id).sort()).toEqual(
      [nameMatch.id, descriptionMatch.id].sort(),
    );

    const firstPageResponse = await request(app.getHttpServer())
      .get(`/api/v1/products?q=${encodeURIComponent(searchToken)}&page=1&pageSize=1`)
      .expect(200);
    const firstPageBody = firstPageResponse.body as ProductListBody;

    expect(firstPageBody.total).toBe(2);
    expect(firstPageBody.totalPages).toBe(2);
    expect(firstPageBody.items.map((item) => item.id)).toEqual([nameMatch.id]);

    const secondPageResponse = await request(app.getHttpServer())
      .get(`/api/v1/products?q=${encodeURIComponent(searchToken)}&page=2&pageSize=1`)
      .expect(200);
    const secondPageBody = secondPageResponse.body as ProductListBody;

    expect(secondPageBody.items.map((item) => item.id)).toEqual([descriptionMatch.id]);
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
    await request(app.getHttpServer()).get("/api/v1/products/not-a-number").expect(400);
    await request(app.getHttpServer()).get("/api/v1/products/999999999").expect(404);
  });

  it("rejects invalid pagination and search parameters", async () => {
    await request(app.getHttpServer()).get("/api/v1/products?page=0").expect(400);
    await request(app.getHttpServer()).get("/api/v1/products?pageSize=101").expect(400);
    await request(app.getHttpServer())
      .get(`/api/v1/products?q=${"a".repeat(101)}`)
      .expect(400);
  });
});

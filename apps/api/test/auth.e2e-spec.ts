import { randomUUID } from "node:crypto";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AppModule } from "./../src/app.module.js";
import { PrismaService } from "./../src/prisma.service.js";

describe("Auth (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdEmails: string[] = [];

  const createEmail = () => {
    const email = `auth-e2e-${randomUUID()}@example.com`;
    createdEmails.push(email);
    return email;
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
    for (const email of createdEmails) {
      await prisma.db.orm.public.User.where({ email }).delete();
    }

    await app.close();
  });

  it("signs up, returns the user, and clears the session on logout", async () => {
    const agent = request.agent(app.getHttpServer());
    const email = createEmail();

    const signup = await agent
      .post("/api/v1/auth/signup")
      .send({ email, password: "password123" })
      .expect(201);
    const signupBody = signup.body as { id: number; email: string; role: string };

    expect(signupBody).toMatchObject({ email, role: "customer" });
    const setCookie = signup.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
    expect(cookieHeader).toContain("auth_token=");
    expect(cookieHeader).toContain("HttpOnly");
    expect(cookieHeader).toContain("SameSite=Lax");
    expect(cookieHeader).not.toContain("Domain=");

    const me = await agent.get("/api/v1/auth/me").expect(200);
    expect(me.body).toMatchObject({ id: signupBody.id, email, role: "customer" });

    await agent.post("/api/v1/auth/logout").expect(204);
    await agent.get("/api/v1/auth/me").expect(401);
  });

  it("logs in with valid credentials and rejects invalid ones", async () => {
    const email = createEmail();
    const password = "password123";
    const signupAgent = request.agent(app.getHttpServer());

    await signupAgent.post("/api/v1/auth/signup").send({ email, password }).expect(201);
    await signupAgent.post("/api/v1/auth/logout").expect(204);

    const loginAgent = request.agent(app.getHttpServer());

    await loginAgent
      .post("/api/v1/auth/login")
      .send({ email, password: "wrong-password" })
      .expect(401);

    const login = await loginAgent.post("/api/v1/auth/login").send({ email, password }).expect(200);
    const loginBody = login.body as { id: number; email: string; role: string };
    expect(loginBody).toMatchObject({ email, role: "customer" });

    const me = await loginAgent.get("/api/v1/auth/me").expect(200);
    expect(me.body).toMatchObject({ id: loginBody.id, email, role: "customer" });
  });

  it("rejects duplicate emails", async () => {
    const email = createEmail();
    const agent = request.agent(app.getHttpServer());

    await agent.post("/api/v1/auth/signup").send({ email, password: "password123" }).expect(201);
    await agent.post("/api/v1/auth/signup").send({ email, password: "password123" }).expect(409);
  });

  it("validates signup input", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/signup")
      .send({ email: "not-an-email", password: "short" })
      .expect(400);
  });
});

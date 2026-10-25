import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { openApiConfig } from "./openapi.js";

async function generate() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  app.setGlobalPrefix("api/v1");
  await app.init();

  const document = SwaggerModule.createDocument(app, openApiConfig);

  const output = resolve(process.cwd(), "openapi.json");

  writeFileSync(output, JSON.stringify(document, null, 2));

  await app.close();
}

void generate();

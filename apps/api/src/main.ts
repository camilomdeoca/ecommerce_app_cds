import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule } from "@nestjs/swagger";
import { openApiConfig } from "./openapi";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  });

  app.setGlobalPrefix("api/v1");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const documentFactory = () => SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup("docs", app, documentFactory, {
    jsonDocumentUrl: "docs-json",
  });

  await app.listen(process.env.API_PORT ?? 3001);
}
void bootstrap();

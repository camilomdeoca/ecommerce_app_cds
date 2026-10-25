import { DocumentBuilder } from "@nestjs/swagger";

export const openApiConfig = new DocumentBuilder()
  .setTitle("E-commerce app API")
  .setDescription("E-commerce app REST API")
  .setVersion("1.0")
  .addBearerAuth()
  .addCookieAuth("auth_token", undefined, "auth_token")
  .build();

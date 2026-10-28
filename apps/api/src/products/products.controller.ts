import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AdminGuard } from "../auth/guards/role.guards.js";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "../storage/storage.config.js";
import { CreateProductDto } from "./dto/create-product.dto.js";
import { ListProductsQueryDto } from "./dto/list-products-query.dto.js";
import { ProductDto } from "./dto/product.dto.js";
import { ProductPageDto } from "./dto/product-page.dto.js";
import { ParseBigIntPipe } from "./parse-bigint.pipe.js";
import { ProductsService } from "./products.service.js";

const ALLOWED_IMAGE_TYPE_PATTERN = new RegExp(
  `^(${ALLOWED_IMAGE_MIME_TYPES.map((mimeType) => mimeType.replace("/", "\\/")).join("|")})$`,
);

@ApiTags("products")
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post("admin/products")
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor("image", {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  @ApiCookieAuth("auth_token")
  @ApiOperation({ summary: "Create a product" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["name", "priceCents", "description", "image"],
      properties: {
        name: { type: "string", minLength: 1, maxLength: 120 },
        priceCents: { type: "integer", minimum: 1 },
        description: { type: "string", minLength: 1, maxLength: 2000 },
        image: { type: "string", format: "binary" },
      },
    },
  })
  @ApiCreatedResponse({ type: ProductDto })
  @ApiBadRequestResponse({ description: "Invalid product data or image" })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiPayloadTooLargeResponse({ description: "Image exceeds the 5 MB limit" })
  async create(
    @Body() dto: CreateProductDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_BYTES }),
          new FileTypeValidator({
            fileType: ALLOWED_IMAGE_TYPE_PATTERN,
            overrideMimeType: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<ProductDto> {
    return this.productsService.create(dto, file);
  }

  @Get("products")
  @ApiOperation({ summary: "List products" })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "pageSize", required: false, type: Number, example: 12 })
  @ApiOkResponse({ type: ProductPageDto })
  @ApiBadRequestResponse({ description: "Invalid pagination parameters" })
  async list(@Query() query: ListProductsQueryDto): Promise<ProductPageDto> {
    return this.productsService.list(query);
  }

  @Get("products/:id")
  @ApiOperation({ summary: "Get a product" })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ type: ProductDto })
  @ApiBadRequestResponse({ description: "Invalid product id" })
  @ApiNotFoundResponse({ description: "Product not found" })
  async getById(@Param("id", ParseBigIntPipe) id: bigint): Promise<ProductDto> {
    return this.productsService.getById(id);
  }
}

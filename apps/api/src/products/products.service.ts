import { Injectable, NotFoundException } from "@nestjs/common";
import type { Readable } from "node:stream";
import { PrismaService } from "../prisma.service.js";
import { StorageService, type ProductImageFile } from "../storage/storage.service.js";
import type { CreateProductDto } from "./dto/create-product.dto.js";
import type { ProductDto } from "./dto/product.dto.js";

type ProductRecord = {
  id: bigint | number;
  name: string;
  priceCents: number;
  description: string;
};

export type ProductImageResult = {
  body: Readable;
  contentType: string;
  contentLength?: number;
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(dto: CreateProductDto, file: ProductImageFile): Promise<ProductDto> {
    const product = await this.prisma.db.orm.public.Product.create({
      name: dto.name,
      priceCents: dto.priceCents,
      description: dto.description,
    });

    try {
      await this.storage.uploadProductImage(product.id, file);
    } catch (error) {
      try {
        await this.prisma.db.orm.public.Product.where({ id: product.id }).delete();
      } catch (cleanupError) {
        void cleanupError;
      }

      throw error;
    }

    return toProductDto(product);
  }

  async getImage(productId: bigint): Promise<ProductImageResult> {
    const product = await this.prisma.db.orm.public.Product.first({ id: productId });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    try {
      return await this.storage.getProductImage(productId);
    } catch (error) {
      if (isMissingObjectError(error)) {
        throw new NotFoundException("Product image not found");
      }

      throw error;
    }
  }
}

function toProductDto(product: ProductRecord): ProductDto {
  return {
    id: product.id.toString(),
    name: product.name,
    priceCents: product.priceCents,
    description: product.description,
    imageUrl: getProductImageUrl(product.id.toString()),
  };
}

function getProductImageUrl(productId: string): string {
  const baseUrl = (
    process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? 3001}`
  ).replace(/\/+$/, "");

  return `${baseUrl}/api/v1/products/${productId}/image`;
}

function isMissingObjectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return (
    candidate.name === "NoSuchKey" ||
    candidate.name === "NotFound" ||
    candidate.$metadata?.httpStatusCode === 404
  );
}

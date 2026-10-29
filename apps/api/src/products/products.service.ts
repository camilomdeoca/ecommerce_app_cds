import { Injectable, NotFoundException } from "@nestjs/common";
import { or } from "@prisma/orm-postgres/orm-client";
import { fullTextDocument, websearchToTsquery } from "@prisma/orm-postgres/target/full-text";
import { PrismaService } from "../prisma.service.js";
import { StorageService, type ProductImageFile } from "../storage/storage.service.js";
import type { CreateProductDto } from "./dto/create-product.dto.js";
import type { ProductDto } from "./dto/product.dto.js";
import type { ProductPageDto } from "./dto/product-page.dto.js";

type ProductRecord = {
  id: bigint | number;
  name: string;
  priceCents: number;
  description: string;
};

export type ProductListOptions = {
  page: number;
  pageSize: number;
  q?: string;
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

    return this.toProductDto(product);
  }

  async list({ page, pageSize, q }: ProductListOptions): Promise<ProductPageDto> {
    const offset = (page - 1) * pageSize;
    const searchTerm = q?.trim();
    const collection = searchTerm
      ? this.searchProducts(searchTerm)
      : this.prisma.db.orm.public.Product.orderBy((product) => product.id.desc());
    const [products, totals] = await Promise.all([
      collection.offset(offset).limit(pageSize).all(),
      collection.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
    ]);
    const items = await Promise.all(products.map((product) => this.toProductDto(product)));

    return {
      items,
      page,
      pageSize,
      total: totals.total,
      totalPages: totals.total === 0 ? 0 : Math.ceil(totals.total / pageSize),
    };
  }

  private searchProducts(searchTerm: string) {
    const pattern = toLikePattern(searchTerm);
    const query = websearchToTsquery(searchTerm);

    return this.prisma.db.orm.public.Product.where((product) =>
      or(product.name.ilike(pattern), product.description.ilike(pattern)),
    ).orderBy([
      (product, { fns }) =>
        fns.fullTextRank(fullTextDocument([[product.name], [product.description]]), query).desc(),
      (product) => product.id.desc(),
    ]);
  }

  async getById(productId: bigint): Promise<ProductDto> {
    const product = await this.prisma.db.orm.public.Product.first({ id: productId });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return this.toProductDto(product);
  }

  private async toProductDto(product: ProductRecord): Promise<ProductDto> {
    return {
      id: product.id.toString(),
      name: product.name,
      priceCents: product.priceCents,
      description: product.description,
      imageUrl: await this.storage.getProductImageUrl(BigInt(product.id)),
    };
  }
}

function toLikePattern(searchTerm: string): string {
  return `%${searchTerm.replace(/[\\%_]/g, "\\$&")}%`;
}

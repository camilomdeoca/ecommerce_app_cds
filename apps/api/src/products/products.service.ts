import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { and, or } from "@prisma/orm-postgres/orm-client";
import { fullTextDocument, websearchToTsquery } from "@prisma/orm-postgres/target/full-text";
import { PrismaService } from "../prisma.service.js";
import { StorageService, type ProductImageFile } from "../storage/storage.service.js";
import type { CreateProductDto } from "./dto/create-product.dto.js";
import type { ProductDto } from "./dto/product.dto.js";
import type { ProductPageDto } from "./dto/product-page.dto.js";
import type { UpdateProductDto } from "./dto/update-product.dto.js";

type ProductRecord = {
  id: bigint | number;
  name: string;
  priceCents: number;
  description: string;
  active: boolean;
};

export type ProductListOptions = {
  page: number;
  pageSize: number;
  q?: string;
  includeInactive?: boolean;
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

  async update(
    productId: bigint,
    dto: UpdateProductDto,
    file?: ProductImageFile,
  ): Promise<ProductDto> {
    const product = await this.prisma.db.orm.public.Product.first({ id: productId });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const data: {
      name?: string;
      priceCents?: number;
      description?: string;
      active?: boolean;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.priceCents !== undefined) {
      data.priceCents = dto.priceCents;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.active !== undefined) {
      data.active = dto.active;
    }

    const hasFieldChanges = Object.keys(data).length > 0;

    if (!hasFieldChanges && !file) {
      throw new BadRequestException("No fields to update");
    }

    if (file) {
      await this.storage.uploadProductImage(productId, file);
    }

    if (hasFieldChanges) {
      await this.prisma.db.orm.public.Product.where({ id: productId }).update(data);
    }

    const updatedProduct = hasFieldChanges
      ? await this.prisma.db.orm.public.Product.first({ id: productId })
      : product;

    if (!updatedProduct) {
      throw new NotFoundException("Product not found");
    }

    return this.toProductDto(updatedProduct);
  }

  async remove(productId: bigint): Promise<void> {
    const product = await this.prisma.db.orm.public.Product.first({ id: productId });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    await this.prisma.db.orm.public.Product.where({ id: productId }).delete();

    try {
      await this.storage.deleteProductImage(productId);
    } catch (error) {
      void error;
    }
  }

  async list({
    page,
    pageSize,
    q,
    includeInactive = false,
  }: ProductListOptions): Promise<ProductPageDto> {
    const offset = (page - 1) * pageSize;
    const searchTerm = q?.trim();
    const collection = searchTerm
      ? this.searchProducts(searchTerm, includeInactive)
      : includeInactive
        ? this.prisma.db.orm.public.Product.orderBy((product) => product.id.desc())
        : this.prisma.db.orm.public.Product.where({ active: true }).orderBy((product) =>
            product.id.desc(),
          );
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

  private searchProducts(searchTerm: string, includeInactive = false) {
    const pattern = toLikePattern(searchTerm);
    const query = websearchToTsquery(searchTerm);

    return this.prisma.db.orm.public.Product.where((product) => {
      const matchesSearch = or(product.name.ilike(pattern), product.description.ilike(pattern));

      return includeInactive ? matchesSearch : and(product.active.eq(true), matchesSearch);
    }).orderBy([
      (product, { fns }) =>
        fns.fullTextRank(fullTextDocument([[product.name], [product.description]]), query).desc(),
      (product) => product.id.desc(),
    ]);
  }

  async getById(productId: bigint): Promise<ProductDto> {
    const product = await this.prisma.db.orm.public.Product.first({ id: productId, active: true });

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
      active: product.active,
      imageUrl: await this.storage.getProductImageUrl(BigInt(product.id)),
    };
  }
}

function toLikePattern(searchTerm: string): string {
  return `%${searchTerm.replace(/[\\%_]/g, "\\$&")}%`;
}

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";
import type { Readable } from "node:stream";
import { getStorageConfig } from "./storage.config.js";

export type ProductImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

export type ProductImage = {
  body: Readable;
  contentType: string;
  contentLength?: number;
};

export function getProductImageKey(productId: bigint): string {
  return `products/${productId}/image`;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const config = getStorageConfig();

    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async uploadProductImage(productId: bigint, file: ProductImageFile): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: getProductImageKey(productId),
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
      }),
    );
  }

  async getProductImage(productId: bigint): Promise<ProductImage> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: getProductImageKey(productId),
      }),
    );

    if (!result.Body) {
      throw new Error(`Product image ${productId} has no body`);
    }

    return {
      body: result.Body as Readable,
      contentType: result.ContentType ?? "application/octet-stream",
      contentLength: result.ContentLength,
    };
  }

  async deleteProductImage(productId: bigint): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: getProductImageKey(productId),
      }),
    );
  }
}

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";
import { getStorageConfig } from "./storage.config.js";

export const PRODUCT_IMAGE_URL_EXPIRES_SECONDS = 60 * 60;

export type ProductImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

export function getProductImageKey(productId: bigint): string {
  return `products/${productId}/image`;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly presignClient: S3Client;
  private readonly bucket: string;

  constructor() {
    const config = getStorageConfig();
    const credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    };

    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials,
    });
    this.presignClient = new S3Client({
      endpoint: config.publicEndpoint,
      region: config.region,
      forcePathStyle: true,
      credentials,
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

  async getProductImageUrl(productId: bigint): Promise<string> {
    return getSignedUrl(
      this.presignClient,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: getProductImageKey(productId),
      }),
      { expiresIn: PRODUCT_IMAGE_URL_EXPIRES_SECONDS },
    );
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

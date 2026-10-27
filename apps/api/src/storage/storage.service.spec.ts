import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageService } from "./storage.service.js";

type MockClient = {
  send: ReturnType<typeof vi.fn>;
};

function createService(): { service: StorageService; send: MockClient["send"] } {
  const service = new StorageService();
  const send = vi.fn();

  (service as unknown as { client: MockClient }).client = { send };

  return { service, send };
}

describe("StorageService", () => {
  beforeEach(() => {
    vi.stubEnv("S3_ENDPOINT", "http://localhost:8333");
    vi.stubEnv("S3_REGION", "us-east-1");
    vi.stubEnv("S3_BUCKET", "media");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "test-key");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "test-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uploads a product image under the deterministic key", async () => {
    const { service, send } = createService();
    const buffer = Buffer.from("image-bytes");
    send.mockResolvedValue({});

    await service.uploadProductImage(42n, {
      buffer,
      mimetype: "image/png",
      size: buffer.length,
    });

    const command = send.mock.calls[0]?.[0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: "media",
      Key: "products/42/image",
      Body: buffer,
      ContentType: "image/png",
      ContentLength: buffer.length,
    });
  });

  it("streams a product image with its stored metadata", async () => {
    const { service, send } = createService();
    const body = Readable.from(Buffer.from("image-bytes"));
    send.mockResolvedValue({
      Body: body,
      ContentType: "image/webp",
      ContentLength: 11,
    });

    const image = await service.getProductImage(7n);

    const command = send.mock.calls[0]?.[0] as GetObjectCommand;
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toEqual({
      Bucket: "media",
      Key: "products/7/image",
    });
    expect(image).toEqual({
      body,
      contentType: "image/webp",
      contentLength: 11,
    });
  });

  it("deletes the product image object", async () => {
    const { service, send } = createService();
    send.mockResolvedValue({});

    await service.deleteProductImage(9n);

    const command = send.mock.calls[0]?.[0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({
      Bucket: "media",
      Key: "products/9/image",
    });
  });
});

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaService } from "../src/prisma.service.js";
import { ProductsService } from "../src/products/products.service.js";
import { MAX_IMAGE_BYTES } from "../src/storage/storage.config.js";
import { StorageService } from "../src/storage/storage.service.js";

const SEED_PRODUCT_PREFIX = "Seed product ";

type SeedImage = {
  index: number;
  buffer: Buffer;
};

async function loadSeedImages(): Promise<SeedImage[]> {
  const imagesDirectory = path.resolve(__dirname, "images");
  const entries = await readdir(imagesDirectory, { withFileTypes: true });
  const imageFiles = entries
    .filter((entry) => entry.isFile() && /^\d+\.jpg$/i.test(entry.name))
    .map((entry) => ({
      name: entry.name,
      index: Number(entry.name.replace(/\.jpg$/i, "")),
    }))
    .sort((left, right) => left.index - right.index);

  for (const [position, image] of imageFiles.entries()) {
    if (image.index !== position + 1) {
      throw new Error(`Expected seed image ${position + 1}.jpg, found ${image.name}`);
    }
  }

  const images: SeedImage[] = [];

  for (const image of imageFiles) {
    const buffer = await readFile(path.join(imagesDirectory, image.name));

    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new Error(`Seed image ${image.name} exceeds ${MAX_IMAGE_BYTES} bytes`);
    }

    images.push({ index: image.index, buffer });
  }

  return images;
}

async function removeSeedProducts(prisma: PrismaService, storage: StorageService): Promise<number> {
  const products = await prisma.db.orm.public.Product.all();
  const seedProducts = products.filter((product) => product.name.startsWith(SEED_PRODUCT_PREFIX));

  for (const product of seedProducts) {
    await storage.deleteProductImage(BigInt(product.id));
    await prisma.db.orm.public.Product.where({ id: product.id }).delete();
  }

  return seedProducts.length;
}

function getSeedProductData(index: number): {
  name: string;
  priceCents: number;
  description: string;
} {
  return {
    name: `${SEED_PRODUCT_PREFIX}${String(index).padStart(3, "0")}`,
    priceCents: 999 + ((index * 137) % 49001),
    description: `Seeded catalog product #${index} for local development.`,
  };
}

async function main(): Promise<void> {
  const images = await loadSeedImages();
  const prisma = new PrismaService();
  const storage = new StorageService();
  const productsService = new ProductsService(prisma, storage);

  try {
    const removed = await removeSeedProducts(prisma, storage);
    console.log(`Removed ${removed} existing seed product(s).`);

    for (const image of images) {
      const product = await productsService.create(getSeedProductData(image.index), {
        buffer: image.buffer,
        mimetype: "image/jpeg",
        size: image.buffer.length,
      });

      if (image.index % 25 === 0 || image.index === images.length) {
        console.log(
          `Created ${image.index}/${images.length} seed products (latest id ${product.id}).`,
        );
      }
    }

    console.log(`Seed complete: ${images.length} products created.`);
  } finally {
    await prisma.db.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

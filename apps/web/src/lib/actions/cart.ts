"use server";

import { revalidatePath } from "next/cache";

export async function revalidateCart(): Promise<void> {
  await Promise.resolve(revalidatePath("/cart"));
}

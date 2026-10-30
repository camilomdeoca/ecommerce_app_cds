import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidateCart } from "./cart";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockRevalidatePath = vi.mocked(revalidatePath);

describe("revalidateCart", () => {
  beforeEach(() => {
    mockRevalidatePath.mockReset();
  });

  it("revalidates the cart route", async () => {
    await revalidateCart();

    expect(mockRevalidatePath).toHaveBeenCalledWith("/cart");
  });
});

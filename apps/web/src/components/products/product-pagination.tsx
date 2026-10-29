import { buttonVariants, cn } from "@heroui/react";
import NextLink from "next/link";
import { getProductsPageHref } from "@/lib/api/products";

type ProductPaginationProps = {
  page: number;
  search?: string;
  total: number;
  totalPages: number;
};

const paginationLinkClassName = cn(buttonVariants({ variant: "secondary", size: "sm" }));
const disabledLinkClassName = cn(paginationLinkClassName, "pointer-events-none opacity-50");

export function ProductPagination({ page, search, total, totalPages }: ProductPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <nav
      aria-label="Product pagination"
      className="flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row"
    >
      <p className="text-sm text-muted">
        {total} {total === 1 ? "product" : "products"}
      </p>
      <div className="flex items-center gap-2">
        {hasPreviousPage ? (
          <NextLink
            className={paginationLinkClassName}
            href={getProductsPageHref(page - 1, search)}
          >
            Previous
          </NextLink>
        ) : (
          <span aria-disabled="true" className={disabledLinkClassName}>
            Previous
          </span>
        )}
        <span className="px-2 text-sm text-muted">
          Page {page} of {totalPages}
        </span>
        {hasNextPage ? (
          <NextLink
            className={paginationLinkClassName}
            href={getProductsPageHref(page + 1, search)}
          >
            Next
          </NextLink>
        ) : (
          <span aria-disabled="true" className={disabledLinkClassName}>
            Next
          </span>
        )}
      </div>
    </nav>
  );
}

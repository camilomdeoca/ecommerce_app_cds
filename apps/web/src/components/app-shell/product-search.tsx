"use client";

import { SearchField, Spinner } from "@heroui/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { getProductsPageHref, MAX_SEARCH_LENGTH, parseSearch } from "@/lib/api/products";

const SEARCH_DEBOUNCE_MS = 300;

export function ProductSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = parseSearch(searchParams.get("q") ?? undefined);
  const [value, setValue] = useState(query);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initiatedQueriesRef = useRef(new Set<string>());

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const navigateToSearch = (searchTerm: string) => {
    const nextSearch = parseSearch(searchTerm);

    if (nextSearch === query) {
      return;
    }

    const basePath = pathname.startsWith("/admin") ? "/admin" : "/products";
    const href = getProductsPageHref(1, nextSearch, basePath);
    initiatedQueriesRef.current.add(nextSearch);

    startTransition(() => {
      if (pathname === basePath) {
        router.replace(href, { scroll: false });
      } else {
        router.push(href);
      }
    });
  };

  const scheduleSearch = (searchTerm: string) => {
    clearTimer();
    const nextSearch = parseSearch(searchTerm);

    if (nextSearch === query) {
      return;
    }

    if (!nextSearch) {
      navigateToSearch("");
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      navigateToSearch(nextSearch);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleChange = (searchTerm: string) => {
    setValue(searchTerm);
    scheduleSearch(searchTerm);
  };

  const handleSubmit = (searchTerm: string) => {
    clearTimer();
    setValue(searchTerm);
    navigateToSearch(searchTerm);
  };

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  useEffect(() => {
    if (initiatedQueriesRef.current.has(query)) {
      initiatedQueriesRef.current.delete(query);
      return;
    }

    initiatedQueriesRef.current.clear();
    clearTimer();
    setValue(query);
  }, [clearTimer, pathname, query]);

  return (
    <SearchField
      aria-busy={isPending}
      aria-label="Search products"
      fullWidth
      value={value}
      variant="secondary"
      onChange={handleChange}
      onSubmit={handleSubmit}
    >
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input
          enterKeyHint="search"
          maxLength={MAX_SEARCH_LENGTH}
          placeholder="Search products..."
        />
        {isPending ? <Spinner aria-label="Updating results" size="sm" /> : null}
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
}

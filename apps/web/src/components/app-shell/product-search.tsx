"use client";

import { SearchField } from "@heroui/react";

export function ProductSearch() {
  return (
    <SearchField aria-label="Search products" fullWidth variant="secondary">
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input placeholder="Search products..." />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
}

"use client";

import { buttonVariants, cn } from "@heroui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import type { NavItem } from "@/lib/navigation";
import { getNavItems, isActivePath, isSearchVisible } from "@/lib/navigation";
import { ProductSearch } from "./product-search";
import { UserMenu } from "./user-menu";

type TopBarNavProps = {
  navItems: NavItem[];
  pathname: string;
  className?: string;
};

function TopBarNav({ navItems, pathname, className }: TopBarNavProps) {
  return (
    <nav aria-label="Main" className={cn("min-w-0 items-center gap-1 overflow-x-auto", className)}>
      {navItems.map((item) => {
        const isActive = isActivePath(pathname, item.href);

        return (
          <NextLink
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "shrink-0",
              isActive ? "bg-default text-foreground" : "text-muted",
            )}
          >
            {item.label}
          </NextLink>
        );
      })}
    </nav>
  );
}

export function TopBar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const navItems = getNavItems(user?.role === "admin");
  const showSearch = isSearchVisible(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="w-full px-4 sm:px-6">
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)] lg:grid-rows-[4rem_2.75rem] lg:gap-x-4 lg:gap-y-0 lg:py-0">
          <div className="col-start-1 row-start-1 flex min-w-0 items-center">
            <NextLink href="/" className="shrink-0 text-lg font-semibold tracking-tight">
              Ecommerce CDS
            </NextLink>
          </div>
          {showSearch ? (
            <div className="col-span-2 row-start-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:w-full lg:max-w-3xl lg:justify-self-center">
              <ProductSearch />
            </div>
          ) : null}
          <div className="col-start-2 row-start-1 flex items-center justify-end gap-2 lg:col-start-3">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <>
                <NextLink
                  href="/login"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0")}
                >
                  Sign in
                </NextLink>
                <NextLink
                  href="/signup"
                  className={cn(buttonVariants({ variant: "primary", size: "sm" }), "shrink-0")}
                >
                  Sign up
                </NextLink>
              </>
            )}
          </div>
          <TopBarNav
            className={cn(
              "col-span-2 flex lg:col-span-3 lg:row-start-2",
              showSearch ? "row-start-3" : "row-start-2",
            )}
            navItems={navItems}
            pathname={pathname}
          />
        </div>
      </div>
    </header>
  );
}

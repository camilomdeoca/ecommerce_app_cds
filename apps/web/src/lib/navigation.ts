export type NavItem = {
  label: string;
  href: string;
};

const BASE_NAV_ITEMS: readonly NavItem[] = [
  { label: "Products", href: "/products" },
  { label: "Cart", href: "/cart" },
  { label: "Orders", href: "/orders" },
];

const ADMIN_NAV_ITEM: NavItem = { label: "Admin", href: "/admin" };

const SEARCH_PATHS = ["/products"] as const;

export function getNavItems(isAdmin: boolean): NavItem[] {
  return isAdmin ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM] : [...BASE_NAV_ITEMS];
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isSearchVisible(pathname: string): boolean {
  return SEARCH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

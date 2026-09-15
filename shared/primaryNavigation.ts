export const HOME_PRIMARY_NAV_ITEMS = [
  { label: "Media Centre", href: "/media-centre" },
  { label: "Contact Us", href: "/contact-us" },
  { label: "Membership", href: "/membership" },
  { label: "Donate", href: "/donate" },
] as const;

export const DIRECT_HOME_PRIMARY_NAV_ITEMS = HOME_PRIMARY_NAV_ITEMS.filter((item) => item.href === "/membership" || item.href === "/donate");

export const INNER_PRIMARY_NAV_ITEMS = [
  { label: "Home", href: "/" },
  ...DIRECT_HOME_PRIMARY_NAV_ITEMS,
] as const;

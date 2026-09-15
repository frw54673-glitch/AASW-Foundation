export type AboutMenuGroup = {
  label: string;
  href: string;
  links: Array<{ label: string; href: string; note?: string }>;
};

export const ABOUT_MENU_GROUPS: AboutMenuGroup[] = [
  {
    label: "Who we are",
    href: "/who-we-are",
    links: [
      { label: "About AASW", href: "/about", note: "Our purpose & approach" },
      { label: "Vision & mission", href: "/vision-mission", note: "What guides the work" },
      { label: "Our team", href: "/team", note: "People behind AASW" },
      { label: "Governance", href: "/governance", note: "Integrity & structure" },
    ],
  },
];

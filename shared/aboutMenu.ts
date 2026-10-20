import { AASW_CONTACT } from "./organisationContact";

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

export type HeaderMegaMenuGroup = {
  label: string;
  href: string;
  links: Array<{ label: string; href: string; note?: string }>;
};

export type HeaderMegaMenuDefinition = {
  id: "what-we-do" | "media-centre" | "contact-us";
  label: string;
  overviewHref: string;
  kicker: string;
  titleStart: string;
  titleAccent: string;
  description: string;
  activePaths: string[];
  groups: HeaderMegaMenuGroup[];
};

export const WHAT_WE_DO_MENU: HeaderMegaMenuDefinition = {
  id: "what-we-do",
  label: "What we do",
  overviewHref: "/what-we-do",
  kicker: "What we do",
  titleStart: "Our programmes",
  titleAccent: "& work.",
  description: "Follow the practical pathways through which AASW supports skills, enterprise and peer learning.",
  activePaths: ["/what-we-do", "/programs", "/digital-skills", "/green-entrepreneurship", "/mentorship-community"],
  groups: [
    { label: "Programmes", href: "/what-we-do", links: [{ label: "Programmes", href: "/programs", note: "Our programmes & work" }, { label: "Digital skill development", href: "/digital-skills", note: "Digital skills for business" }] },
    { label: "Enterprise & community", href: "/what-we-do", links: [{ label: "Green entrepreneurship", href: "/green-entrepreneurship", note: "Eco-friendly business" }, { label: "Mentorship & community", href: "/mentorship-community", note: "Mentorship & peer support" }] },
  ],
};

export const MEDIA_CENTRE_MENU: HeaderMegaMenuDefinition = {
  id: "media-centre",
  label: "Media Centre",
  overviewHref: "/media-centre",
  kicker: "Media Centre",
  titleStart: "News, stories",
  titleAccent: "& photos.",
  description: "Find public updates, stories and reports that keep the Foundation’s work visible.",
  activePaths: ["/media-centre", "/updates", "/stories", "/field-gallery", "/reports"],
  groups: [
    { label: "Stories & updates", href: "/media-centre", links: [{ label: "News & updates", href: "/updates", note: "News from the field" }, { label: "Impact stories", href: "/stories", note: "Our impact in numbers" }, { label: "Field gallery", href: "/field-gallery", note: "Published field record" }, { label: "Reports & transparency", href: "/reports", note: "Annual records and public information" }] },
    { label: "Media contact", href: `${AASW_CONTACT.emailHref}?subject=Media%20enquiry%20for%20AASW%20Foundation`, links: [{ label: "Media contact", href: `${AASW_CONTACT.emailHref}?subject=Media%20enquiry%20for%20AASW%20Foundation`, note: "Write to AASW" }] },
  ],
};

export const CONTACT_US_MENU: HeaderMegaMenuDefinition = {
  id: "contact-us",
  label: "Contact Us",
  overviewHref: "/contact-us",
  kicker: "Contact us",
  titleStart: "Get in touch",
  titleAccent: "with AASW.",
  description: "Contact the Foundation about programmes, partnerships, information requests or a question about support.",
  activePaths: ["/contact-us"],
  groups: [
    { label: "Get in Touch", href: "/contact-us", links: [{ label: "Email AASW", href: AASW_CONTACT.emailHref, note: AASW_CONTACT.email }, { label: "Call AASW", href: AASW_CONTACT.primaryPhoneHref, note: AASW_CONTACT.primaryPhoneDisplay }] },
    { label: "Visit & support", href: "/contact-us", links: [{ label: "Contact details", href: "/contact-us", note: AASW_CONTACT.locationShort }, { label: "Membership", href: "/membership", note: "Become a member" }, { label: "Volunteer", href: "/volunteer", note: "Volunteer with us" }, { label: "FAQ", href: "/faq", note: "Questions, answered" }] },
  ],
};

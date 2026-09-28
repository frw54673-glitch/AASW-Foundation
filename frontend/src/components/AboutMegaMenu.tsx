import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { ABOUT_MENU_GROUPS } from "../../../shared/aboutMenu";
import { AASW_CONTACT } from "@shared/organisationContact";

export { ABOUT_MENU_GROUPS } from "../../../shared/aboutMenu";

type AboutMegaMenuProps = {
  activePath?: string;
  onNavigate?: () => void;
};

export function AboutMegaMenu({ activePath, onNavigate }: AboutMegaMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isActive = activePath === "/about" || activePath === "/team" || activePath === "/governance";
  const close = () => setOpen(false);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="about-mega-root" ref={menuRef} onMouseEnter={() => setOpen(true)} onMouseLeave={close}>
      <button type="button" className={`nav-link about-mega-trigger ${isActive ? "nav-link-active" : ""}`} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((value) => !value)} onFocus={() => setOpen(true)}>
        <span>About</span><ChevronDown size={13} aria-hidden="true" />
      </button>
      <div className={`about-mega-panel ${open ? "about-mega-panel-open" : ""}`} aria-hidden={!open}>
        <div className="about-mega-inner">
          <div className="about-mega-intro"><p className="eyebrow"><span className="eyebrow-dot" />Explore AASW</p><h2>About the Foundation,<br /><em>at a glance.</em></h2><p>Find the foundation’s purpose, programmes, people and records in one place.</p><a href="/about" onClick={() => { close(); onNavigate?.(); }}>Read about AASW <ArrowUpRight size={14} /></a></div>
          <div className="about-mega-groups">{ABOUT_MENU_GROUPS.map((group) => <section key={group.label} className="about-mega-group"><a className="about-mega-group-title" href={group.href} onClick={() => { close(); onNavigate?.(); }}>{group.label}<ArrowUpRight size={12} /></a>{group.links.map((link) => <a href={link.href} key={`${group.label}-${link.label}`} onClick={() => { close(); onNavigate?.(); }}><strong>{link.label}<ArrowUpRight size={13} /></strong>{link.note && <small>{link.note}</small>}</a>)}</section>)}</div>
        </div>
      </div>
    </div>
  );
}

export function AboutMobileNav({ onNavigate }: Pick<AboutMegaMenuProps, "onNavigate">) {
  const [open, setOpen] = useState(false);
  return <div className="mobile-about-group"><button type="button" className="mobile-nav-link mobile-about-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span>About</span><ChevronDown size={17} /></button>{open && <div className="mobile-about-links">{ABOUT_MENU_GROUPS.map((group) => <section key={group.label}><a className="mobile-about-group-title" href={group.href} onClick={onNavigate}>{group.label}<ArrowUpRight size={14} /></a>{group.links.map((link) => <a href={link.href} key={`mobile-${link.label}`} onClick={onNavigate}>{link.label}<ArrowUpRight size={14} /></a>)}</section>)}</div>}</div>;
}

type HeaderMegaMenuGroup = {
  label: string;
  href: string;
  links: Array<{ label: string; href: string; note?: string }>;
};

type HeaderMegaMenuDefinition = {
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
    { label: "Stories & updates", href: "/media-centre", links: [{ label: "News & updates", href: "/updates", note: "News from the field" }, { label: "Impact stories", href: "/stories", note: "Our impact in numbers" }, { label: "Field gallery", href: "/field-gallery", note: "Published field record" }] },
    { label: "Public resources", href: "/media-centre", links: [{ label: "Impact reports", href: "/reports", note: "Documents & records" }, { label: "Media contact", href: `${AASW_CONTACT.emailHref}?subject=Media%20enquiry%20for%20AASW%20Foundation`, note: "Write to AASW" }] },
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

function HeaderMegaMenu({ menu, activePath, onNavigate }: { menu: HeaderMegaMenuDefinition } & AboutMegaMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isActive = menu.activePaths.includes(activePath ?? "");
  const close = () => setOpen(false);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("mousedown", handlePointerDown); document.removeEventListener("keydown", handleKeyDown); };
  }, []);

  return <div className={`about-mega-root header-mega-root header-mega-root-${menu.id}`} ref={menuRef} onMouseEnter={() => setOpen(true)} onMouseLeave={close}>
    <button type="button" className={`nav-link about-mega-trigger ${isActive ? "nav-link-active" : ""}`} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((value) => !value)} onFocus={() => setOpen(true)}><span>{menu.label}</span><ChevronDown size={13} aria-hidden="true" /></button>
    <div className={`about-mega-panel header-mega-panel header-mega-panel-${menu.id} ${open ? "about-mega-panel-open" : ""}`} aria-hidden={!open}>
      <div className="about-mega-inner header-mega-inner-compact"><div className="about-mega-intro"><p className="eyebrow"><span className="eyebrow-dot" />{menu.kicker}</p><h2>{menu.titleStart}<br /><em>{menu.titleAccent}</em></h2><p>{menu.description}</p><a href={menu.overviewHref} onClick={() => { close(); onNavigate?.(); }}>Explore {menu.label} <ArrowUpRight size={14} /></a></div><div className="about-mega-groups header-mega-groups-compact">{menu.groups.map((group) => <section key={group.label} className="about-mega-group"><a className="about-mega-group-title" href={group.href} onClick={() => { close(); onNavigate?.(); }}>{group.label}<ArrowUpRight size={12} /></a>{group.links.map((link) => <a href={link.href} key={`${menu.id}-${group.label}-${link.label}`} onClick={() => { close(); onNavigate?.(); }}><strong>{link.label}<ArrowUpRight size={13} /></strong>{link.note && <small>{link.note}</small>}</a>)}</section>)}</div></div>
    </div>
  </div>;
}

function HeaderMobileMenu({ menu, onNavigate }: { menu: HeaderMegaMenuDefinition; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  return <div className="mobile-about-group"><button type="button" className="mobile-nav-link mobile-about-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span>{menu.label}</span><ChevronDown size={17} /></button>{open && <div className="mobile-about-links">{menu.groups.map((group) => <section key={`${menu.id}-${group.label}`}><a className="mobile-about-group-title" href={group.href} onClick={onNavigate}>{group.label}<ArrowUpRight size={14} /></a>{group.links.map((link) => <a href={link.href} key={`mobile-${menu.id}-${link.label}`} onClick={onNavigate}>{link.label}<ArrowUpRight size={14} /></a>)}</section>)}</div>}</div>;
}

export function WhatWeDoMegaMenu(props: AboutMegaMenuProps) { return <HeaderMegaMenu menu={WHAT_WE_DO_MENU} {...props} />; }
export function MediaCentreMegaMenu(props: AboutMegaMenuProps) { return <HeaderMegaMenu menu={MEDIA_CENTRE_MENU} {...props} />; }
export function ContactUsMegaMenu(props: AboutMegaMenuProps) { return <HeaderMegaMenu menu={CONTACT_US_MENU} {...props} />; }
export function WhatWeDoMobileNav({ onNavigate }: Pick<AboutMegaMenuProps, "onNavigate">) { return <HeaderMobileMenu menu={WHAT_WE_DO_MENU} onNavigate={onNavigate} />; }
export function MediaCentreMobileNav({ onNavigate }: Pick<AboutMegaMenuProps, "onNavigate">) { return <HeaderMobileMenu menu={MEDIA_CENTRE_MENU} onNavigate={onNavigate} />; }
export function ContactUsMobileNav({ onNavigate }: Pick<AboutMegaMenuProps, "onNavigate">) { return <HeaderMobileMenu menu={CONTACT_US_MENU} onNavigate={onNavigate} />; }

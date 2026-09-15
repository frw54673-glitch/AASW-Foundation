// Design reminder: Human-first Civic Editorial — inner pages should feel like well-made field notes: warm, clear, accountable and easy to navigate.
import { ReactNode, useEffect, useState } from "react";
import { ArrowUpRight, Facebook, Instagram, Linkedin, Mail, MapPin, Menu, Phone, X } from "lucide-react";
import { INNER_PRIMARY_NAV_ITEMS } from "@shared/primaryNavigation";
import { AASW_CONTACT } from "@shared/organisationContact";
import { AboutMegaMenu, AboutMobileNav, ContactUsMegaMenu, ContactUsMobileNav, MediaCentreMegaMenu, MediaCentreMobileNav, WhatWeDoMegaMenu, WhatWeDoMobileNav } from "./AboutMegaMenu";
import { MemberHeaderAccount } from "./MemberHeaderAccount";
import { FooterNewsletterForm } from "./FooterNewsletterForm";

type InnerPageShellProps = {
  children: ReactNode;
  activePath: string;
  eyebrow: string;
  title: ReactNode;
  intro: string;
  chapter: string;
  heroImage?: string;
  heroAlt?: string;
  tone?: "paper" | "sand" | "ink";
};

export function InnerPageShell({ children, activePath, eyebrow, title, intro, chapter, heroImage, heroAlt, tone = "paper" }: InnerPageShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`inner-page-shell inner-tone-${tone}`}>
      <a className="skip-link" href="#inner-main">Skip to content</a>
      <header className={`site-header inner-header ${headerScrolled ? "site-header-scrolled" : ""}`}>
        <div className="container inner-header-row">
          <a href="/" className="brand-lockup" onClick={closeMenu}>
            <span className="brand-mark-wrap"><img src="/manus-storage/aasw-foundation-official-logo_41a4007d.png" alt="AASW Foundation official logo" className="brand-mark" /></span>
            <span className="brand-copy"><strong>AASW</strong><span>Foundation</span></span>
          </a>
          <nav className="desktop-nav" aria-label="Primary navigation">
            <AboutMegaMenu activePath={activePath} onNavigate={closeMenu} />
            <WhatWeDoMegaMenu activePath={activePath} onNavigate={closeMenu} />
            <MediaCentreMegaMenu activePath={activePath} onNavigate={closeMenu} />
            <ContactUsMegaMenu activePath={activePath} onNavigate={closeMenu} />
            {INNER_PRIMARY_NAV_ITEMS.map((item) => <a key={item.href} href={item.href} className={`nav-link ${activePath === item.href ? "nav-link-active" : ""}`}>{item.label}</a>)}
          </nav>
          <div className="header-actions">
            <a className="header-contact" href={AASW_CONTACT.primaryPhoneHref}><Phone size={15} /><span>{AASW_CONTACT.primaryPhoneDisplay}</span></a>
            <MemberHeaderAccount />
            <a className="button button-small button-ochre" href="/donate">Support the work <ArrowUpRight size={15} /></a>
            <button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
          </div>
        </div>
        <div className={`mobile-nav ${menuOpen ? "mobile-nav-open" : ""}`}>
          <nav className="container mobile-nav-inner" aria-label="Mobile navigation">
            <AboutMobileNav onNavigate={closeMenu} />
            <WhatWeDoMobileNav onNavigate={closeMenu} />
            <MediaCentreMobileNav onNavigate={closeMenu} />
            <ContactUsMobileNav onNavigate={closeMenu} />
            {INNER_PRIMARY_NAV_ITEMS.map((item) => <a key={item.href} href={item.href} className="mobile-nav-link" onClick={closeMenu}><span>{item.label}</span><ArrowUpRight size={17} /></a>)}
            <MemberHeaderAccount mobile onNavigate={closeMenu} />
            <a href="/donate" className="button button-ochre mobile-donate" onClick={closeMenu}>Support the work <ArrowUpRight size={16} /></a>
          </nav>
        </div>
      </header>

      <main id="inner-main">
        <section className="inner-hero">
          <div className="container inner-hero-frame">
            <div className="inner-hero-rail" aria-hidden="true"><span>{chapter}</span><i /></div>
            <div className="inner-hero-grid">
            <div className="inner-hero-copy" data-reveal>
              <div className="inner-chapter"><span>{chapter}</span><i /></div>
              <p className="eyebrow"><span className="eyebrow-dot" />{eyebrow}</p>
              <h1>{title}</h1>
              <p className="inner-hero-intro">{intro}</p>
            </div>
            {heroImage ? <div className="inner-hero-image" data-reveal="right" data-reveal-delay="1"><img src={heroImage} alt={heroAlt ?? "AASW Foundation editorial visual"} /><span className="image-source-label">Source archive visual</span></div> : <div className="inner-hero-symbol" data-reveal="right" data-reveal-delay="1"><img src="/manus-storage/aasw-foundation-official-logo_41a4007d.png" alt="" /><span>Field notes<br /><strong>from AASW</strong></span></div>}
            </div>
          </div>
        </section>
        <div className="inner-subnav"><div className="container inner-subnav-row"><span> AASW FOUNDATION / {chapter}</span><span className="inner-subnav-line" /><a href="/donate">Support the work <ArrowUpRight size={15} /></a></div></div>
        {children}
      </main>

      <section className="contact-ribbon"><div className="container contact-ribbon-inner"><span className="sun-disc" /><p>Have a question, idea or partnership in mind?</p><a href={AASW_CONTACT.emailHref}>Start a conversation <ArrowUpRight size={16} /></a></div></section>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand"><a href="/" className="brand-lockup"><span className="brand-mark-wrap"><img src="/manus-storage/aasw-foundation-official-logo_41a4007d.png" alt="AASW Foundation official logo" className="brand-mark" /></span><span className="brand-copy"><strong>AASW</strong><span>Foundation</span></span></a><p>Empowering women through digital education, eco-friendly entrepreneurship and sustainable growth opportunities.</p><div className="social-links"><a href="https://www.facebook.com/share/19TMKDwzfi/" aria-label="AASW Foundation on Facebook"><Facebook size={17} /></a><a href="https://www.instagram.com/aaswfoundation" aria-label="AASW Foundation on Instagram"><Instagram size={17} /></a><a href="https://www.linkedin.com/company/108100135/" aria-label="AASW Foundation on LinkedIn"><Linkedin size={17} /></a></div></div>
          <div className="footer-column footer-column-newsletter"><FooterNewsletterForm /></div><div className="footer-column"><span className="footer-label">Explore</span><a href="/about">About AASW</a><a href="/programs">Programmes</a><a href="/stories">Impact</a><a href="/reports">Reports</a></div>
          <div className="footer-column"><span className="footer-label">Reach us</span><a href={AASW_CONTACT.emailHref}><Mail size={15} />Email AASW</a><a href={AASW_CONTACT.primaryPhoneHref}><Phone size={15} />{AASW_CONTACT.primaryPhoneDisplay}</a><a href={AASW_CONTACT.secondaryPhoneHref}><Phone size={15} />{AASW_CONTACT.secondaryPhoneDisplay}</a><a href={AASW_CONTACT.mapsUrl} target="_blank" rel="noreferrer"><MapPin size={15} />{AASW_CONTACT.locationShort}<br /><small>Uttar Pradesh 209303</small></a></div>
        </div>
        <div className="container footer-bottom"><span>© 2025 AASW Foundation. All rights reserved.</span><span>Aapka Apna Social Welfare Foundation</span></div>
      </footer>
    </div>
  );
}

export function InnerSection({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`inner-section ${className}`}><div className="container">{children}</div></section>;
}

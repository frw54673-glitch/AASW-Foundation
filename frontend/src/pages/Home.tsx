// Design reminder: Human-first Civic Editorial — warm Indian civic palette, editorial rail, people-first storytelling, clear trust and action paths.
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Facebook,
  HandCoins,
  HeartHandshake,
  Instagram,
  Laptop2,
  Linkedin,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  Phone,
  Presentation,
  ShieldCheck,
  Sprout,
  Users,
  X,
} from "lucide-react";
import { PaymentDemoButton } from "@/components/PaymentDemoCheckout";
import { AboutMegaMenu, AboutMobileNav, ContactUsMegaMenu, ContactUsMobileNav, MediaCentreMegaMenu, MediaCentreMobileNav, WhatWeDoMegaMenu, WhatWeDoMobileNav } from "@/components/AboutMegaMenu";
import { LiveHomeGoalsAndMethodology } from "@/components/LiveContentPanels";
import { AASW_CONTACT } from "@shared/organisationContact";
import { DIRECT_HOME_PRIMARY_NAV_ITEMS } from "@shared/primaryNavigation";
import { MemberHeaderAccount } from "@/components/MemberHeaderAccount";
import { TestimonialsCarousel, type ApprovedTestimonial } from "@/components/TestimonialsCarousel";
import { AnimatedCounter, TrustStrip } from "@/components/TrustAndImpact";
import { FooterNewsletterForm } from "@/components/FooterNewsletterForm";
import { trpc } from "@/lib/trpc";

const programs = [
  {
    number: "01",
    icon: Laptop2,
    title: "Digital skill development",
    text: "Women are trained in entrepreneurship — digital skills, e-commerce, social media marketing and online operations enable women to start and maintain businesses.",
    image: "/manus-storage/aasw-digital-skills_2dde7820.jpeg",
    imageAlt: "AASW digital skills session in Uttar Pradesh",
    tone: "green",
  },
  {
    number: "02",
    icon: Sprout,
    title: "Green entrepreneurship",
    text: "Environmental education with heart, focusing on ecologically conscious solutions and sustainable practices in business.",
    image: "/manus-storage/aasw-green-workshop_8f06b6fa.jpeg",
    imageAlt: "AASW women entrepreneurs at a green business workshop",
    tone: "ochre",
  },
  {
    number: "03",
    icon: HeartHandshake,
    title: "Mentorship & business support",
    text: "Mentors connect aspiring women entrepreneurs with professionals who can help guide them step-by-step in building and scaling their business.",
    image: "/manus-storage/aasw-community-mentorship_ffb5bf0b.jpeg",
    imageAlt: "AASW community gathering and mentorship session",
    tone: "ink",
  },
  {
    number: "04",
    icon: Presentation,
    title: "Workshops, webinars & seminars",
    text: "Regular online and offline gatherings for leadership development, financial literacy, technology applications, branding and digital innovation.",
    image: "/manus-storage/aasw-women-learning_f22d8267.jpeg",
    imageAlt: "AASW women learning event in Uttar Pradesh",
    tone: "green",
  },
  {
    number: "05",
    icon: Users,
    title: "Building the community",
    text: "A growing network enabling peer learning, collaboration and confidence — especially for first-time entrepreneurs from remote locations.",
    image: "/manus-storage/aasw-field-session_43c9b878.jpeg",
    imageAlt: "AASW community field session in Uttar Pradesh",
    tone: "ochre",
  },
];

const supportOptions = [
  { amount: "₹1,100", amountInRupees: 1100, kind: "membership" as const, title: "Join for a year", copy: "Annual membership with full member access." },
  { amount: "₹10,000", amountInRupees: 10000, kind: "membership" as const, title: "Become a lifetime member", copy: "One-time support, lifelong connection." },
  { amount: "Custom", amountInRupees: 500, kind: "donation" as const, title: "Give what feels right", copy: "Fund training, enterprise or mentorship." },
];

const marqueeThemes = ["Digital skill development", "Green entrepreneurship", "Mentorship & business support", "Workshops & webinars", "Building the community", "Eco-friendly projects", "Women's livelihoods", "Uttar Pradesh"];
// Add only verified, consented testimonials here after the Foundation supplies exact approved wording and attribution.
const approvedTestimonials: readonly ApprovedTestimonial[] = [];

function ScrollLink({ href, children, className = "", onClick }: { href: string; children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <a className={className} href={href} onClick={onClick}>
      {children}
    </a>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedSupport, setSelectedSupport] = useState("₹1,100");
  const [showTop, setShowTop] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 520);
      setHeaderScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reading progress: a thin brand-gradient rail pinned to the very top of
  // the viewport. rAF-throttled like the other scroll work.
  useEffect(() => {
    let frame = 0;
    const compute = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Hero parallax: the visual column settles slower than the copy while the
  // first screen scrolls past, giving the hero real depth. rAF-throttled and
  // fully skipped for reduced-motion visitors.
  const heroVisualRef = useRef<HTMLDivElement | null>(null);
  const heroCopyRef = useRef<HTMLDivElement | null>(null);
  // Hero image tilt: the field photo leans a few degrees toward the pointer.
  // Custom properties only, so the parallax translateY on the wrap above
  // never fights this transform.
  const heroTiltRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const applyParallax = () => {
      frame = 0;
      const y = window.scrollY;
      // Only moves while the hero is on screen; caps so it can never drift off.
      const t = Math.min(y / 620, 1);
      const visual = heroVisualRef.current;
      const copy = heroCopyRef.current;
      if (visual) visual.style.transform = `translateY(${t * -34}px)`;
      if (copy) copy.style.transform = `translateY(${t * -12}px)`;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(applyParallax);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    let tiltFrame = 0;
    const onTilt = (event: PointerEvent) => {
      const target = heroTiltRef.current;
      if (!target || tiltFrame) return;
      const { clientX, clientY } = event;
      tiltFrame = window.requestAnimationFrame(() => {
        tiltFrame = 0;
        const rect = target.getBoundingClientRect();
        const px = (clientX - rect.left) / rect.width - 0.5;
        const py = (clientY - rect.top) / rect.height - 0.5;
        target.style.setProperty("--tilt-x", `${(-py * 4).toFixed(2)}deg`);
        target.style.setProperty("--tilt-y", `${(px * 5).toFixed(2)}deg`);
      });
    };
    const onTiltReset = () => {
      const target = heroTiltRef.current;
      if (!target) return;
      target.style.setProperty("--tilt-x", "0deg");
      target.style.setProperty("--tilt-y", "0deg");
    };
    const heroWrap = heroVisualRef.current;
    if (window.matchMedia?.("(hover: hover)").matches && heroWrap) {
      heroWrap.addEventListener("pointermove", onTilt);
      heroWrap.addEventListener("pointerleave", onTiltReset);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      heroWrap?.removeEventListener("pointermove", onTilt);
      heroWrap?.removeEventListener("pointerleave", onTiltReset);
      if (tiltFrame) window.cancelAnimationFrame(tiltFrame);
    };
  }, []);

  // Headline word rise: the hero h1 enters word by word instead of as one
  // block. Runs once; the ready-class guard keeps repeat invocations (HMR,
  // StrictMode) from nesting word spans inside word spans.
  const heroHeadingRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    const heading = heroHeadingRef.current;
    if (!heading || heading.classList.contains("hero-words-ready")) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      heading.classList.add("hero-words-ready");
      return;
    }
    heading.classList.add("hero-words-ready");
    const words: HTMLSpanElement[] = [];
    const splitNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent?.split(/(\s+)/) ?? [];
        const frag = document.createDocumentFragment();
        for (const part of parts) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            continue;
          }
          const span = document.createElement("span");
          span.className = "hero-word";
          span.textContent = part;
          words.push(span);
          frag.appendChild(span);
        }
        node.parentNode?.replaceChild(frag, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        for (const child of Array.from(node.childNodes)) splitNode(child);
      }
    };
    for (const child of Array.from(heading.childNodes)) splitNode(child);
    words.forEach((word, index) => {
      word.style.animationDelay = `${120 + index * 70}ms`;
    });
  }, []);

  // Cursor presence: spotlight cards carry a warm glow that tracks the
  // pointer, and magnetic CTAs lean toward it — both rAF-throttled and
  // completely skipped for reduced-motion visitors.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia?.("(hover: hover)").matches) return;
    let frame = 0;
    const onPointerMove = (event: MouseEvent) => {
      if (frame) return;
      const { clientX, clientY } = event;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const card = (event.target as HTMLElement | null)?.closest?.(".aasw-spotlight") as HTMLElement | null;
        if (card) {
          const rect = card.getBoundingClientRect();
          card.style.setProperty("--mx", `${clientX - rect.left}px`);
          card.style.setProperty("--my", `${clientY - rect.top}px`);
        }
        for (const button of Array.from(document.querySelectorAll<HTMLElement>(".aasw-magnetic"))) {
          const rect = button.getBoundingClientRect();
          const near = clientX >= rect.left - 90 && clientX <= rect.right + 90 && clientY >= rect.top - 90 && clientY <= rect.bottom + 90;
          if (near) {
            button.style.setProperty("--mag-x", `${(clientX - rect.left - rect.width / 2) * 0.12}px`);
            button.style.setProperty("--mag-y", `${(clientY - rect.top - rect.height / 2) * 0.22}px`);
          } else {
            button.style.removeProperty("--mag-x");
            button.style.removeProperty("--mag-y");
          }
        }
      });
    };
    document.addEventListener("mousemove", onPointerMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onPointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Scroll-spy chapter chip: names the section the reader is inside, in the
  // lower-left corner. Purely informational (aria-hidden) and hidden on small
  // screens where the corner is busy.
  const [chapter, setChapter] = useState<{ num: string; label: string } | null>(null);
  const [chipVisible, setChipVisible] = useState(false);
  useEffect(() => {
    const sections: Array<[string, string, string]> = [
      ["top", "01", "The work"],
      ["about", "02", "Why AASW"],
      ["programs", "03", "Programmes"],
      ["get-involved", "04", "Join in"],
      ["stories", "05", "Impact"],
      ["donate", "06", "Give"],
    ];
    // Scroll-position scroll-spy: the chapter is whichever section's span
    // covers the viewport's focus line (upper 40%). A section counts if
    // either edge is above the line OR it fully contains it — tall sections
    // like donate (taller than the screen) stay current at the page bottom.
    let spyFrame = 0;
    const computeChapter = () => {
      spyFrame = 0;
      const focusLine = window.innerHeight * 0.4;
      let current: [string, string, string] | null = null;
      for (const [id, ...rest] of sections) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        const bottom = el.getBoundingClientRect().bottom;
        if (top <= focusLine && bottom >= focusLine) current = [id, ...rest];
      }
      // At the very bottom, tall trailing sections may still hold the line;
      // fall back to the last section whose top has passed it.
      if (!current) {
        for (const [id, ...rest] of sections) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= focusLine) current = [id, ...rest];
        }
      }
      if (current) setChapter({ num: current[1], label: current[2] });
      setChipVisible(window.scrollY > 640);
    };
    const onScroll = () => {
      if (!spyFrame) spyFrame = window.requestAnimationFrame(computeChapter);
    };
    computeChapter();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (spyFrame) window.cancelAnimationFrame(spyFrame);
    };
  }, []);

  const selectedOption = supportOptions.find((option) => option.amount === selectedSupport) ?? supportOptions[0];

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="site-shell min-h-screen overflow-x-hidden">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <div className="aasw-scroll-progress" aria-hidden="true"><span style={{ transform: `scaleX(${scrollProgress})` }} /></div>

      <header className={`site-header ${headerScrolled ? "site-header-scrolled" : ""}`}>
        <div className="container flex items-center justify-between gap-6 py-4">
          <ScrollLink href="#top" className="brand-lockup" onClick={closeMenu}>
            <span className="brand-mark-wrap">
              <img src="/manus-storage/aasw-foundation-official-logo_41a4007d.png" alt="AASW Foundation official logo" className="brand-mark" decoding="async" />
            </span>
            <span className="brand-copy">
              <strong>AASW</strong>
              <span>Foundation</span>
            </span>
          </ScrollLink>

          <nav className="desktop-nav" aria-label="Primary navigation">
            <AboutMegaMenu onNavigate={closeMenu} />
            <WhatWeDoMegaMenu onNavigate={closeMenu} />
            <MediaCentreMegaMenu onNavigate={closeMenu} />
            <ContactUsMegaMenu onNavigate={closeMenu} />
            {DIRECT_HOME_PRIMARY_NAV_ITEMS.map((item) => (
              <ScrollLink key={item.href} href={item.href} className="nav-link">
                {item.label}
              </ScrollLink>
            ))}
          </nav>

          <div className="header-actions">
            <a className="header-contact" href={AASW_CONTACT.primaryPhoneHref} aria-label="Call AASW Foundation">
              <Phone size={15} />
              <span>{AASW_CONTACT.primaryPhoneDisplay}</span>
            </a>
            <MemberHeaderAccount />
            <ScrollLink href="#donate" className="button button-small button-ochre aasw-magnetic">
              Donate now <ArrowUpRight size={15} />
            </ScrollLink>
            <button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
              {menuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>

        <div className={`mobile-nav ${menuOpen ? "mobile-nav-open" : ""}`}>
          <nav aria-label="Mobile navigation" className="container mobile-nav-inner">
            <AboutMobileNav onNavigate={closeMenu} />
            <WhatWeDoMobileNav onNavigate={closeMenu} />
            <MediaCentreMobileNav onNavigate={closeMenu} />
            <ContactUsMobileNav onNavigate={closeMenu} />
            {DIRECT_HOME_PRIMARY_NAV_ITEMS.map((item) => (
              <ScrollLink key={item.href} href={item.href} className="mobile-nav-link" onClick={closeMenu}>
                <span>{item.label}</span>
                <ArrowUpRight size={17} />
              </ScrollLink>
            ))}
            <MemberHeaderAccount mobile onNavigate={closeMenu} />
            <ScrollLink href="#donate" className="button button-ochre mobile-donate" onClick={closeMenu}>
              Donate now <ArrowUpRight size={16} />
            </ScrollLink>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section id="top" className="hero-section">
          <div className="container hero-grid">
            <div className="hero-copy" ref={heroCopyRef}>
              <p className="eyebrow" data-reveal><span className="eyebrow-dot" />Aapka Apna Social Welfare Foundation</p>
              <h1 ref={heroHeadingRef} className="hero-headline">Fueling women's success through <em>tech &amp; enterprise.</em></h1>
              <p className="hero-intro" data-reveal data-reveal-delay="2">A human-centered organization in the heart of Uttar Pradesh, dedicated to bridging the divide in digital business ownership — 800+ women trained, 300+ businesses launched, 30+ eco-friendly projects across 5 districts.</p>
              <div className="hero-actions" data-reveal data-reveal-delay="3">
                <ScrollLink href="#programs" className="button button-primary aasw-magnetic">
                  Explore our programmes <ArrowDownRight size={17} />
                </ScrollLink>
                <ScrollLink href="#donate" className="text-link">
                  Support a woman today <ArrowUpRight size={16} />
                </ScrollLink>
              </div>
              <div className="hero-proof" data-reveal data-reveal-delay="3">
                <div className="avatar-stack" aria-hidden="true">
                  <span className="avatar avatar-one" />
                  <span className="avatar avatar-two" />
                  <span className="avatar avatar-three" />
                </div>
                <p><strong>Stronger women create a better world</strong><br />— socially, environmentally and financially.</p>
              </div>
            </div>

            <div className="hero-visual-wrap" ref={heroVisualRef} data-reveal="right" data-reveal-delay="2">
              <div className="hero-chapter">01 / AASW FOUNDATION</div>
              <div className="hero-visual" ref={heroTiltRef}>
                <img src="/manus-storage/aasw-field-session_43c9b878.jpeg" alt="AASW women taking part in a capability-building field session" fetchPriority="high" decoding="async" />
                <div className="hero-image-overlay" />
                <div className="hero-caption">
                  <span>From the field</span>
                  <strong>Digital training in progress, Uttar Pradesh.</strong>
                </div>
                <span className="illustrative-tag">AASW field photo</span>
              </div>
              <div className="hero-note">
                <span className="sun-disc" />
                <p>800+ women trained.<br /><strong>300+ businesses launched.</strong></p>
              </div>
            </div>
          </div>
          <div className="hero-bottom-rail container">
            <span>Scroll to follow the work</span>
            <span className="rail-line" />
            <span>01 — 06</span>
          </div>
        </section>

        <section className="impact-strip" aria-label="Impact snapshot">
          <div className="container impact-grid">
            <div className="impact-intro" data-reveal><span className="section-kicker">Our impact</span><strong>Real work. Real change.</strong></div>
            <div className="impact-stat" data-reveal data-reveal-delay="1"><strong><AnimatedCounter target={800} suffix="+" /></strong><span>Women trained</span></div>
            <div className="impact-stat" data-reveal data-reveal-delay="2"><strong><AnimatedCounter target={300} suffix="+" /></strong><span>Businesses launched</span></div>
            <div className="impact-stat" data-reveal data-reveal-delay="3"><strong><AnimatedCounter target={30} suffix="+" /></strong><span>Eco-friendly projects</span></div>
            <div className="impact-stat" data-reveal data-reveal-delay="3"><strong><AnimatedCounter target={5} suffix="+" /></strong><span>Districts reached</span></div>
          </div>
        </section>

        {/* Themes of the work, rolling quietly — decorative, hidden from screen readers. */}
        <section className="aasw-marquee" aria-hidden="true">
          <div className="aasw-marquee-track">
            {[0, 1].map((group) => (
              <div className="aasw-marquee-group" key={group}>
                {marqueeThemes.map((theme) => (
                  <span className="aasw-marquee-item" key={`${group}-${theme}`}>{theme}<span className="aasw-marquee-dot" /></span>
                ))}
              </div>
            ))}
          </div>
        </section>

        <TrustStrip />

        <section id="about" className="section section-paper about-section">
          <div className="container editorial-layout">
            <div className="section-rail"><span>02</span><span className="vertical-label">WHY AASW</span></div>
            <div className="about-heading" data-reveal>
              <p className="eyebrow"><span className="eyebrow-dot" />The Foundation</p>
              <h2>We're building a new wave of <em>confident women leaders.</em></h2>
              <ScrollLink href="#donate" className="text-link text-link-green">Support this work <ArrowUpRight size={16} /></ScrollLink>
            </div>
            <div className="about-copy" data-reveal data-reveal-delay="1">
              <p className="lead-copy">The chance for growth, leadership and groundbreaking ideas belongs to everyone — especially women from disadvantaged communities. Aapka Apna Social Welfare Foundation was founded to change this reality.</p>
              <p>A community-driven effort in Uttar Pradesh, we don't just aim for inclusion — we create a space where women naturally step up as leaders. Through focused training, strong support systems and local programs, we're giving women the tools to build lasting careers and make a real difference in their own neighborhoods.</p>
              <div className="about-note"><ShieldCheck size={19} /><span>Our core belief: stronger women create a better world — socially, environmentally and financially.</span></div>
            </div>
          </div>
          <div className="container field-note-grid">
            <div className="field-note-image" data-reveal="left">
              <img src="/manus-storage/aasw-women-learning_f22d8267.jpeg" alt="Women at an AASW empowerment and learning event in Uttar Pradesh" loading="lazy" decoding="async" />
              <span className="image-source-label">AASW field photo</span>
            </div>
            <div className="field-note-copy" data-reveal data-reveal-delay="1">
              <span className="section-kicker">Our objective &amp; aim</span>
              <h3>Encouraging women in digital entrepreneurship through education.</h3>
              <p><strong>Our objective:</strong> to encourage women in digital entrepreneurship through educational avenues — providing digital tools, environmental awareness and business mentoring for promoting inclusive economic growth.</p>
              <p><strong>Our aim:</strong> women throughout India becoming inventors and decision-makers, using technology and business to create a sustainable, just society and empowered people.</p>
              <div className="mini-list">
                <div><span>01</span><strong>Learn</strong><p>Digital tools, e-commerce, social media.</p></div>
                <div><span>02</span><strong>Build</strong><p>Start and scale a real business.</p></div>
                <div><span>03</span><strong>Lead</strong><p>Become an inventor and decision-maker.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section id="programs" className="section section-sand programs-section">
          <div className="container section-heading-row">
            <div>
              <p className="eyebrow"><span className="eyebrow-dot" />What we do</p>
              <h2>Programmes that fuel<br /><em>women's success.</em></h2>
            </div>
            <p className="section-heading-aside">Hands-on learning, practical skill-building, sincere mentorship and a commitment to protecting our environment — woven together so women can start and sustain real businesses.</p>
          </div>
          <div className="container program-list">
            {programs.map((program) => {
              const Icon = program.icon;
              return (
                <article className={`program-row program-row-${program.tone}`} key={program.number} data-reveal>
                  <div className="program-meta"><span>{program.number}</span><Icon size={20} strokeWidth={1.7} /></div>
                  <div className="program-image-wrap">
                    <img src={program.image} alt={program.imageAlt} className="program-image" loading="lazy" decoding="async" />
                    <span className="illustrative-tag">AASW field photo</span>
                  </div>
                  <div className="program-content">
                    <h3>{program.title}</h3>
                    <p>{program.text}</p>
                    <ScrollLink href="#donate" className="text-link text-link-green">Support this programme <ArrowUpRight size={15} /></ScrollLink>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section section-ink pathway-section">
          <div className="container pathway-layout">
            <div className="pathway-heading" data-reveal>
              <p className="eyebrow eyebrow-light"><span className="eyebrow-dot eyebrow-dot-light" />How the work travels</p>
              <h2>From learning to earning — <em>step by step.</em></h2>
              <p>A small opening — a skill, a mentor, a community — becomes a new direction. Here is how the journey unfolds for every woman who joins us.</p>
            </div>
            <div className="pathway-steps" data-reveal data-reveal-delay="1">
              <div className="pathway-step"><span>01</span><div><strong>Access</strong><p>Join a training, workshop or mentorship circle nearby.</p></div></div>
              <div className="pathway-step"><span>02</span><div><strong>Practice</strong><p>Learn by doing in a safe, supportive environment.</p></div></div>
              <div className="pathway-step"><span>03</span><div><strong>Act</strong><p>Start earning or take a decision of your own.</p></div></div>
              <div className="pathway-step"><span>04</span><div><strong>Pass it on</strong><p>Share skills with other women in the community.</p></div></div>
            </div>
          </div>
        </section>

        <LiveHomeGoalsAndMethodology />

        <section id="get-involved" className="section section-sand get-involved-section">
          <div className="container section-heading-row">
            <div>
              <p className="eyebrow"><span className="eyebrow-dot" />Offer support</p>
              <h2>What a great time<br /><em>to join the work.</em></h2>
            </div>
            <p className="section-heading-aside">Together, we'll create a future where women lead the digital revolution. Choose the way that fits you — give, guide or spread the word.</p>
          </div>
          <div className="container get-involved-grid">
            <article className="get-involved-card aasw-spotlight" data-reveal>
              <HandCoins size={26} strokeWidth={1.5} />
              <span className="section-kicker">Offer support</span>
              <h3>Convert your support into reach.</h3>
              <p>Help us extend our mission into new districts and regions — every contribution funds training, enterprise and mentorship for more women.</p>
              <ScrollLink href="#donate" className="text-link text-link-green">Support the mission <ArrowUpRight size={15} /></ScrollLink>
            </article>
            <article className="get-involved-card aasw-spotlight" data-reveal data-reveal-delay="1">
              <HeartHandshake size={26} strokeWidth={1.5} />
              <span className="section-kicker">Volunteer</span>
              <h3>Be part of the experience.</h3>
              <p>Join as a mentor, speaker or event coordinator — online or on the ground — and help women take their next practical step.</p>
              <a href="/volunteer" className="text-link">Volunteer with us <ArrowUpRight size={15} /></a>
            </article>
            <article className="get-involved-card aasw-spotlight" data-reveal data-reveal-delay="2">
              <Megaphone size={26} strokeWidth={1.5} />
              <span className="section-kicker">Spread the word</span>
              <h3>Help us build momentum.</h3>
              <p>Follow us on our platforms, share success stories, and help more women discover learning and leadership opportunities.</p>
              <a href="/stories" className="text-link">Read the impact stories <ArrowUpRight size={15} /></a>
            </article>
          </div>
        </section>

        <section id="stories" className="section section-paper stories-section">
          <div className="container section-heading-row stories-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-dot" />Our impact</p>
              <h2>Trained, mentored,<br /><em>and leading.</em></h2>
            </div>
            <div className="stories-heading-actions"><p className="section-heading-aside">Since our inception, we've trained, mentored and given leading roles to hundreds of women in rural and semi-urban areas — with active partnerships with schools, colleges and community organizations.</p><a href="/field-gallery" className="text-link">See the field gallery <ArrowUpRight size={15} /></a></div>
          </div>
          <div className="container story-grid">
            <article className="story-card story-card-large aasw-spotlight" data-reveal>
              <div className="story-image"><img src="/manus-storage/aasw-field-session_43c9b878.jpeg" alt="AASW field session focused on women's capability and participation" /><span className="image-source-label">AASW field photo</span></div>
              <div className="story-card-copy"><span className="section-kicker">01 / Digital skill development</span><h3>800+ women trained in digital skills, entrepreneurship and eco-friendly practices.</h3><p>Women are trained in entrepreneurship — digital skills, e-commerce, social media marketing and online operations enable women to start and maintain businesses.</p><ScrollLink href="#programs" className="text-link">Explore the work <ArrowUpRight size={15} /></ScrollLink></div>
            </article>
            <article className="story-card story-card-small aasw-spotlight" data-reveal data-reveal-delay="1">
              <div className="story-card-index">02</div><HeartHandshake size={30} strokeWidth={1.4} className="story-icon" /><span className="section-kicker">Get involved</span><h3>Volunteer as a mentor, speaker or event coordinator.</h3><p>Be a part of the experience — online or on the ground. Follow us, share success stories, and help us build momentum.</p><ScrollLink href="/volunteer" className="text-link text-link-green">Volunteer with us <ArrowUpRight size={15} /></ScrollLink>
            </article>
            <article className="story-card story-card-small story-card-ochre aasw-spotlight" data-reveal data-reveal-delay="2">
              <div className="story-card-index">03</div><Sprout size={30} strokeWidth={1.4} className="story-icon" /><span className="section-kicker">Green enterprise</span><h3>30+ eco-friendly projects run by women entrepreneurs.</h3><p>Environmental education with heart — ecologically conscious solutions and sustainable practices in business, across 5 districts with expansion in the pipeline.</p><ScrollLink href="#programs" className="text-link">See the approach <ArrowUpRight size={15} /></ScrollLink>
            </article>
          </div>
        </section>

        {/* Published field photos straight from the Foundation workspace —
            the strip hides completely until the first photo is published. */}
        <HomeFieldStrip />

        <section id="donate" className="section donate-section">
          <div className="container donate-layout">
            <div className="donate-copy" data-reveal><p className="eyebrow"><span className="eyebrow-dot" />Donate to AASW Foundation</p><h2>Support a woman.<br /><em>Change a community.</em></h2><p>Your contribution funds digital training, green enterprise and mentorship for women in Uttar Pradesh. Choose the way you want to give — we will take it from there.</p><div className="donate-contact"><a href={AASW_CONTACT.emailHref}><Mail size={17} />{AASW_CONTACT.email}</a><a href={AASW_CONTACT.primaryPhoneHref}><Phone size={17} />{AASW_CONTACT.primaryPhoneDisplay}</a><a href={AASW_CONTACT.secondaryPhoneHref}><Phone size={17} />{AASW_CONTACT.secondaryPhoneDisplay}</a></div></div>
            <div className="support-card aasw-spotlight" data-reveal data-reveal-delay="1"><div className="support-card-header"><div><span className="section-kicker">AASW membership</span><h3>Choose your way to give.</h3></div><HandCoins size={28} strokeWidth={1.4} /></div><div className="support-options">{supportOptions.map((option) => <button key={option.amount} className={`support-option ${selectedSupport === option.amount ? "support-option-active" : ""}`} onClick={() => setSelectedSupport(option.amount)}><span className="support-check">{selectedSupport === option.amount ? <Check size={14} /> : null}</span><span><strong>{option.amount}</strong><small>{option.title}</small></span><ArrowUpRight size={16} /></button>)}</div><div className="support-summary"><div><span>Your selected path</span><strong className="support-summary-amount" key={selectedOption.amount}>{selectedOption.amount} <small>· {selectedOption.title}</small></strong></div><ScrollLink href={selectedOption.kind === "membership" ? "/membership#membership-application" : "/donate#donation-details"} className="button button-ochre aasw-magnetic">{selectedOption.kind === "membership" ? "Complete application" : "Complete donor details"} <ArrowUpRight size={16} /></ScrollLink></div><p className="support-note"><strong>Required details first.</strong> Membership and Donation now use separate forms; no amount is charged in demo mode.</p></div>
          </div>
        </section>

        <TestimonialsCarousel testimonials={approvedTestimonials} />

        <section className="contact-ribbon">
          <div className="container contact-ribbon-inner"><span className="sun-disc" /><p>Together, we'll create a future where women lead the digital revolution.</p><a href={AASW_CONTACT.emailHref}>Start a conversation <ArrowUpRight size={16} /></a></div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand"><ScrollLink href="#top" className="brand-lockup"><span className="brand-mark-wrap"><img src="/manus-storage/aasw-foundation-official-logo_41a4007d.png" alt="AASW Foundation official logo" className="brand-mark" /></span><span className="brand-copy"><strong>AASW</strong><span>Foundation</span></span></ScrollLink><p>A registered women empowerment NGO in Uttar Pradesh — digital education, eco-friendly enterprise and sustainable livelihoods for women since 2021.</p><div className="social-links"><a href="https://www.facebook.com/share/19TMKDwzfi/" aria-label="AASW Foundation on Facebook"><Facebook size={17} /></a><a href="https://www.instagram.com/aaswfoundation" aria-label="AASW Foundation on Instagram"><Instagram size={17} /></a><a href="https://www.linkedin.com/company/108100135/" aria-label="AASW Foundation on LinkedIn"><Linkedin size={17} /></a></div></div>
          <div className="footer-column footer-column-newsletter"><FooterNewsletterForm /></div><div className="footer-column"><span className="footer-label">Explore</span><ScrollLink href="/about">About AASW</ScrollLink><ScrollLink href="#programs">Programmes</ScrollLink><ScrollLink href="#stories">Impact</ScrollLink><ScrollLink href="/reports">Reports</ScrollLink></div>
          <div className="footer-column"><span className="footer-label">Reach us</span><a href={AASW_CONTACT.emailHref}><Mail size={15} />Email AASW</a><a href={AASW_CONTACT.primaryPhoneHref}><Phone size={15} />{AASW_CONTACT.primaryPhoneDisplay}</a><a href={AASW_CONTACT.secondaryPhoneHref}><Phone size={15} />{AASW_CONTACT.secondaryPhoneDisplay}</a><a href={AASW_CONTACT.mapsUrl} target="_blank" rel="noreferrer"><MapPin size={15} />{AASW_CONTACT.locationShort}<br /><small>Uttar Pradesh 209303</small></a></div>
        </div>
        <div className="container footer-bottom"><span>© 2025 AASW Foundation. All rights reserved.</span><span>Aapka Apna Social Welfare Foundation</span></div>
      </footer>

      {chapter && chipVisible && <div className="aasw-chapter-chip" aria-hidden="true"><i />{chapter.num} / {chapter.label}</div>}

      {showTop && <button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top"><ArrowUpRight size={18} /></button>}
    </div>
  );
}

/**
 * Live "from the field" strip: the latest photographs the Foundation has
 * published from the admin workspace. It renders only when at least one
 * photo is published, so the homepage never shows an empty or placeholder
 * gallery.
 */
function HomeFieldStrip() {
  const publishedMedia = trpc.media.list.useQuery({ limit: 3 });
  const items = publishedMedia.data ?? [];
  if (!items.length) return null;
  return <section id="field" className="section section-sand field-strip-section" aria-labelledby="field-strip-heading">
    <div className="container section-heading-row">
      <div>
        <p className="eyebrow"><span className="eyebrow-dot" />Straight from the field</p>
        <h2 id="field-strip-heading">The work, <em>as it happens.</em></h2>
      </div>
      <p className="section-heading-aside">Fresh field moments published directly by the Foundation team — real photographs from real training sessions and workshops.</p>
    </div>
    <div className="container field-strip-grid">
      {items.map((item, index) => <figure key={item.mediaRef} className="field-strip-card aasw-spotlight" data-reveal data-reveal-delay={String(index + 1)}>
        <div className="field-strip-image"><img src={item.imageUrl} alt={item.altText} loading="lazy" decoding="async" /><span>{item.quarter}</span></div>
        <figcaption><h3>{item.title}</h3><p>{item.description}</p></figcaption>
      </figure>)}
    </div>
    <div className="container field-strip-more"><a href="/field-gallery" className="text-link">See the whole field gallery <ArrowUpRight size={15} /></a></div>
  </section>;
}

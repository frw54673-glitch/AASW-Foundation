import { ArrowUpRight, Check } from "lucide-react";
import { InnerPageShell, InnerSection } from "@/components/InnerPageShell";

type ChapterPageKey = "who-we-are" | "what-we-do" | "vision-mission" | "digital-skills" | "green-entrepreneurship" | "mentorship-community";

type ChapterPageDefinition = {
  path: string;
  chapter: string;
  eyebrow: string;
  title: React.ReactNode;
  intro: string;
  image: string;
  imageAlt: string;
  statement: string;
  sections: Array<{ label: string; title: string; copy: string }>;
  links: Array<{ label: string; href: string }>;
};

const PAGE_DEFINITIONS: Record<ChapterPageKey, ChapterPageDefinition> = {
  "who-we-are": {
    path: "/who-we-are", chapter: "02A / WHO WE ARE", eyebrow: "Who we are", title: <>A human-centred organisation<br /><em>from Uttar Pradesh.</em></>, intro: "AASW Foundation is a human-centred organisation in Uttar Pradesh that works to bridge the divide in digital business ownership.", image: "/manus-storage/aasw-community-gathering_31224a60.jpg", imageAlt: "AASW community gathering from the supplied source archive", statement: "The chance for growth, leadership and groundbreaking ideas belongs to everyone — especially women from disadvantaged communities.",
    sections: [{ label: "The purpose", title: "Build capability that lasts.", copy: "AASW focuses on practical digital education, eco-friendly entrepreneurship, mentorship and community support so women can move from learning to action." }, { label: "The location", title: "Grounded in Uttar Pradesh.", copy: "The live site describes a focus on both rural and urban reach, with local knowledge and on-ground relationships shaping every programme." }, { label: "The goals", title: "Confidence, awareness and wider reach.", copy: "AASW’s stated strategic goals include state-specific social solutions, awareness and self-sufficiency in digital technology, and documenting stories of women in leadership." }], links: [{ label: "About AASW", href: "/about" }, { label: "Meet our team", href: "/team" }, { label: "Explore governance", href: "/governance" }],
  },
  "what-we-do": {
    path: "/what-we-do", chapter: "03A / WHAT WE DO", eyebrow: "What we do", title: <>Skills, enterprise<br /><em>and support.</em></>, intro: "AASW brings together digital skill development, green entrepreneurship, mentorship and community learning for women building confidence and livelihood pathways.", image: "/manus-storage/aasw-program-workshop_4e66aa72.jpg", imageAlt: "Practical learning workshop from the supplied source archive", statement: "The work is designed to make learning actionable — in a workshop, a new business idea, a mentorship conversation or a community network.",
    sections: [{ label: "Digital tools", title: "Build confidence online.", copy: "Training in e-commerce, social media marketing and online operations supports women who want to start and maintain digital businesses." }, { label: "Green enterprise", title: "Keep livelihood and care together.", copy: "Ecologically conscious solutions and sustainable practices support enterprise that considers both opportunity and the environment." }, { label: "Networks", title: "Make the next step less solitary.", copy: "Professional guidance, peer learning, workshops and community-building create room for questions, practice and collaboration." }], links: [{ label: "All programmes", href: "/programs" }, { label: "Digital skill development", href: "/digital-skills" }, { label: "Green entrepreneurship", href: "/green-entrepreneurship" }, { label: "Mentorship & community", href: "/mentorship-community" }],
  },
  "vision-mission": {
    path: "/vision-mission", chapter: "02B / VISION & MISSION", eyebrow: "Our vision & mission", title: <>A sustainable, just<br /><em>society for all.</em></>, intro: "The AASW source describes a future in which women use technology and business to create a sustainable and just society.", image: "/manus-storage/aasw-community-gathering_31224a60.jpg", imageAlt: "AASW community gathering from the supplied source archive", statement: "Stronger women create a better world — socially, environmentally and financially.",
    sections: [{ label: "Vision", title: "Women as inventors and decision-makers.", copy: "We imagine women throughout India becoming inventors and decision-makers in the near future — using technology and business to create a sustainable, just society and empowered people." }, { label: "Mission", title: "Make digital entrepreneurship more reachable.", copy: "To encourage women in digital entrepreneurship through educational avenues by providing digital tools, environmental awareness and business mentoring for promoting inclusive economic growth." }, { label: "Practice", title: "Start with a useful next step.", copy: "The work connects skills, mentorship, sustainable enterprise and community so the path from learning to action has real support." }], links: [{ label: "About AASW", href: "/about" }, { label: "What we do", href: "/what-we-do" }, { label: "Programmes", href: "/programs" }],
  },
  "digital-skills": {
    path: "/digital-skills", chapter: "03B / DIGITAL SKILLS", eyebrow: "Digital skills training", title: <>Digital skills<br /><em>for business.</em></>, intro: "Digital skill development is one of AASW’s core programme areas, supporting women who want to understand and use tools for enterprise.", image: "/manus-storage/source-digital-trainer-1_b4bf2cad.webp", imageAlt: "Digital learning source visual from the AASW archive", statement: "Training in e-commerce, social media marketing and online operations can turn digital tools into everyday capability.",
    sections: [{ label: "E-commerce", title: "Learn how a digital business works.", copy: "The source programme focus includes e-commerce learning for women interested in starting and maintaining digital businesses." }, { label: "Social media", title: "Communicate with confidence.", copy: "Social media marketing is treated as a practical business tool: something to learn, practise and use with purpose." }, { label: "Online operations", title: "Keep the work moving.", copy: "Operational digital learning supports the daily decisions and routines that help an enterprise feel more manageable." }], links: [{ label: "All programmes", href: "/programs" }, { label: "Green entrepreneurship", href: "/green-entrepreneurship" }, { label: "Mentorship & community", href: "/mentorship-community" }],
  },
  "green-entrepreneurship": {
    path: "/green-entrepreneurship", chapter: "03C / GREEN ENTERPRISE", eyebrow: "Green entrepreneurship", title: <>Eco-friendly business,<br /><em>real income.</em></>, intro: "Green entrepreneurship brings ecologically conscious solutions and sustainable practices into the conversation about business, opportunity and local wellbeing.", image: "/manus-storage/aasw-hero-editorial_d40219ad.jpg", imageAlt: "Hands working with natural material in an editorial AASW visual", statement: "Sustainable practices keep opportunity and the future it depends on in the same conversation.",
    sections: [{ label: "Awareness", title: "See environmental responsibility as practical.", copy: "Environmental awareness is part of the foundation’s education approach for women exploring enterprise and sustainable careers." }, { label: "Solutions", title: "Use context-conscious ideas.", copy: "The programme focus is on ecologically conscious solutions that connect business decisions with local care." }, { label: "Field update / June 2026", title: "Plastic-alternative bags in practice.", copy: "The live updates page records that trained members manufactured and distributed 2,000+ plastic-alternative carry bags under the Green Entrepreneurship initiative." }], links: [{ label: "All programmes", href: "/programs" }, { label: "Digital skill development", href: "/digital-skills" }, { label: "Support the work", href: "/donate" }],
  },
  "mentorship-community": {
    path: "/mentorship-community", chapter: "03D / MENTORSHIP & COMMUNITY", eyebrow: "Mentorship & community", title: <>Mentorship and<br /><em>peer support.</em></>, intro: "AASW connects aspiring women entrepreneurs with professionals, peer learning and community spaces that make business-building feel less solitary.", image: "/manus-storage/aasw-community-gathering_31224a60.jpg", imageAlt: "AASW community gathering from the supplied source archive", statement: "A growing network for peer learning and collaboration can make the next step feel possible.",
    sections: [{ label: "Mentorship", title: "Guidance for the next decision.", copy: "The source programme includes connections between aspiring women entrepreneurs and professionals for step-by-step business building." }, { label: "Workshops", title: "Practise in a shared room.", copy: "Regular workshops and seminars focus on leadership development, financial literacy and digital innovation." }, { label: "Field update / May 2026", title: "A completed mentorship cohort.", copy: "The live updates page reports that 45 women leaders completed a three-month strategic training cohort and were matched with local digital entrepreneurs for on-ground training." }], links: [{ label: "All programmes", href: "/programs" }, { label: "Digital skill development", href: "/digital-skills" }, { label: "Membership", href: "/membership" }],
  },
};

function ChapterPage({ pageKey }: { pageKey: ChapterPageKey }) {
  const page = PAGE_DEFINITIONS[pageKey];
  return <InnerPageShell activePath={page.path} chapter={page.chapter} eyebrow={page.eyebrow} title={page.title} intro={page.intro} heroImage={page.image} heroAlt={page.imageAlt}>
    <InnerSection className="chapter-page-intro"><div className="chapter-statement"><span className="section-kicker">From the AASW source</span><blockquote>“{page.statement}”</blockquote></div></InnerSection>
    <section className="inner-section inner-section-sand"><div className="container"><div className="chapter-card-grid">{page.sections.map((section, index) => <article key={section.label}><span>{String(index + 1).padStart(2, "0")}</span><p className="section-kicker">{section.label}</p><h2>{section.title}</h2><p>{section.copy}</p></article>)}</div></div></section>
    <InnerSection className="chapter-page-links"><div className="chapter-links-heading"><span className="section-kicker">Continue exploring</span><h2>Related<br /><em>pages.</em></h2></div><div className="chapter-links-list">{page.links.map((link) => <a key={link.href} href={link.href}><span>{link.label}</span><ArrowUpRight size={18} /></a>)}</div></InnerSection>
  </InnerPageShell>;
}

export const WhoWeAreOverviewPage = () => <ChapterPage pageKey="who-we-are" />;
export const WhatWeDoOverviewPage = () => <ChapterPage pageKey="what-we-do" />;
export const VisionMissionPage = () => <ChapterPage pageKey="vision-mission" />;
export const DigitalSkillsPage = () => <ChapterPage pageKey="digital-skills" />;
export const GreenEntrepreneurshipPage = () => <ChapterPage pageKey="green-entrepreneurship" />;
export const MentorshipCommunityPage = () => <ChapterPage pageKey="mentorship-community" />;

// Design reminder: Human-first Civic Editorial — use real source content, editorial spacing, Neem Green actions and Jamun Ink trust cues.
import { useState, type ReactNode } from "react";
import { ArrowUpRight, BookOpen, Check, ExternalLink, Facebook, FileText, HandCoins, HeartHandshake, Instagram, Leaf, Linkedin, Mail, ShieldCheck, Sparkles, Users, Wifi } from "lucide-react";
import { InnerPageShell, InnerSection } from "@/components/InnerPageShell";
import { MembershipApplicationForm } from "@/components/MembershipApplicationForm";
import { DonationDetailsForm } from "@/components/DonationDetailsForm";
import { LiveContentAppendix } from "@/components/LiveContentPanels";
import { TaxBenefitBlock, TaxInlineNote } from "@/components/TrustAndImpact";
import { AASW_CONTACT } from "@shared/organisationContact";
import { AASW_ORG_SOCIAL_LINKS, UNPUBLISHED_PROFILE_NOTE } from "../../../shared/teamProfile";

const heroEditorial = "/manus-storage/aasw-hero-editorial_d40219ad.jpg";
const workshopEditorial = "/manus-storage/aasw-program-workshop_4e66aa72.jpg";
const communityEditorial = "/manus-storage/aasw-community-gathering_31224a60.jpg";
const teamArchive = "/manus-storage/source-aasw-2_ed3d3d5d.webp";
const governanceArchive = "/manus-storage/governance-ngo-management-cover.png";
const updatesArchive = "/manus-storage/source-digital-divide-women_8956082d.webp";
const membershipArchive = "/manus-storage/membership-join-banner.png";
const donateArchive = "/manus-storage/donate-now-banner.png";
const reportDocument = "/manus-storage/source-certificate-template_567a7fbc.webp";

// Downloaded unchanged from the official AASW Team page on 18 August 2026.
const officialTeamPortraits = {
  patron: "/manus-storage/patron_34ce7dc6.jpeg",
  anupam: "/manus-storage/anupam_d0361120.webp",
  aparna: "/manus-storage/aparna_54a0aec8.jpeg",
  meera: "/manus-storage/meera_74ce15e8.JPG",
  anand: "/manus-storage/anand_faf19f98.JPG",
  archana: "/manus-storage/archana_1aaa5bba.webp",
  priya: "/manus-storage/priya_496df5e4.webp",
  mamtaTiwari: "/manus-storage/mamta-tiwari_789aacba.JPG",
  navneesh: "/manus-storage/navneesh_7b035c65.JPG",
  seema: "/manus-storage/seema_ce470c16.webp",
  kushal: "/manus-storage/kushal_71f95377.JPG",
  madhuri: "/manus-storage/madhuri_5af3509d.JPG",
  mamtaJain: "/manus-storage/mamta-jain_30370ccf.webp",
  manisha: "/manus-storage/manisha_f1c9fd51.JPG",
  moni: "/manus-storage/moni_a4183049.JPG",
  anuj: "/manus-storage/anuj_b7d41d43.jpeg",
  anupamShahi: "/manus-storage/anupam-shahi_1e632ba9.jpeg",
  kshamaRani: "/manus-storage/kshama-rani.jpg",
  sikhaNayak: "/manus-storage/sikha-nayak.jpg",
  trainerOne: "/manus-storage/trainer-1_5b332362.webp",
  trainerTwo: "/manus-storage/trainer-2_fcbe185e.webp",
  trainerThree: "/manus-storage/trainer-3_1facb098.webp",
} as const;

const programData = [
  { icon: Wifi, label: "01", title: "Digital skills & inclusion", copy: "E-commerce, social media marketing and online operations training that turns digital tools into everyday capability.", detail: "Learn the tools, practise in context, and use them to make a decision of your own." },
  { icon: Leaf, label: "02", title: "Green entrepreneurship", copy: "Ecologically conscious solutions and sustainable business practices that connect livelihood with care for the environment.", detail: "AASW’s green enterprise work keeps opportunity and the future it depends on in the same conversation." },
  { icon: Users, label: "03", title: "Mentorship & community", copy: "Professional guidance, peer learning and collaboration for women building confidence and growing their businesses.", detail: "Members can ask questions freely, learn from peers, and take the next step with support at hand." },
  { icon: Sparkles, label: "04", title: "Workshops & leadership", copy: "Leadership development, financial literacy and digital innovation workshops for a more connected cohort of women leaders.", detail: "Learning becomes more useful when it is shared, repeated and brought back into the community." },
];

export const centralAdvisoryGallery = [
  { name: "Prof. Meera K Desai", designation: "Central Advisory", image: officialTeamPortraits.meera },
  { name: "Anand Vardhan Shukla", designation: "Central Advisory", image: officialTeamPortraits.anand },
  { name: "Dr. Archana R. Singh", designation: "Central Advisory", image: officialTeamPortraits.archana },
  { name: "Dr. Priya Vasist", designation: "Central Advisory", image: officialTeamPortraits.priya },
  { name: "Dr. Mamta Tiwari", designation: "Central Advisory", image: officialTeamPortraits.mamtaTiwari },
  { name: "Dr. Navneesh Tyagi", designation: "Central Advisory", image: officialTeamPortraits.navneesh },
  { name: "Dr. Seema Dwivedi", designation: "Central Advisory", image: officialTeamPortraits.seema, portraitMode: "native-square" as const },
  { name: "Kushal Pal Singh", designation: "Central Advisory", image: officialTeamPortraits.kushal },
  { name: "Madhuri Joshi", designation: "Central Advisory", image: officialTeamPortraits.madhuri },
  { name: "Mamta Jain", designation: "Central Advisory", image: officialTeamPortraits.mamtaJain },
  { name: "Manisha Tripathi", designation: "Central Advisory", image: officialTeamPortraits.manisha },
  { name: "Pro. M. Moni", designation: "Central Advisory", image: officialTeamPortraits.moni },
  { name: "Anuj Kanawat", designation: "Central Advisory", image: officialTeamPortraits.anuj },
  { name: "Anupam Shahi", designation: "Central Advisory", image: officialTeamPortraits.anupamShahi },
];

export const digitalTrainerGallery = [
  { name: "Mr. Mohit Gupta (CA)", designation: "Digital Trainer", image: officialTeamPortraits.trainerOne },
  { name: "Dr. Nidhi Thakur", designation: "Digital Trainer", image: officialTeamPortraits.trainerTwo },
  { name: "Mr. Kharal Singh", designation: "Digital Trainer", image: officialTeamPortraits.trainerThree },
];

export const stateCouncilMembers = ["Abhilash Sharma", "Anjali Juyal", "Ch Parameshwari", "Jainendra Singh", "Kirti Mundra", "Lalit Kumar Dogra", "Mamta Sarda", "Maskura Khatun", "R. Suresh Kumar", "Rajesh", "Renu Singh", "Saguna Shrimali", "Sanjay Bharti", "Soniya Jain", "Subhadra Sahu", "Suman Kori", "Suresh S. Kattimane"];

export const teamFilterOptions = [
  { id: "all", label: "All people" },
  { id: "core", label: "Leadership" },
  { id: "advisory", label: "Advisory" },
  { id: "trainers", label: "Trainers" },
  { id: "program", label: "Program Management" },
  { id: "state", label: "State Council" },
] as const;

type TeamFilter = (typeof teamFilterOptions)[number]["id"];

const teamData = [
  { name: "Pujya Mahant Shri Shiv Chetnanand Saraswati Ji Maharaj", category: "Patron", group: "core" as const, image: officialTeamPortraits.patron, portraitMode: "native-portrait" as const },
  { name: "Anupam Trivedi", category: "Founder & Visionary", group: "core" as const, image: officialTeamPortraits.anupam, portraitMode: "face-safe" as const, bio: "A dedicated social reformer who uses digital technology to enable financial independence for rural women across Uttar Pradesh. Focus: strategy, digital tools and community outreach." },
  { name: "Aparna Mishra", category: "Co-Founder", group: "core" as const, image: officialTeamPortraits.aparna, portraitMode: "face-safe" as const, bio: "Brings experience in community building, leadership development and strategic partnerships, with a focus on gender equality and green business practices. Focus: operations, partnership and mentorship cohorts." },
  ...centralAdvisoryGallery.map((member) => ({ name: member.name, category: member.designation, group: "advisory" as const, image: member.image, portraitMode: "face-safe" as const })),
  ...digitalTrainerGallery.map((member) => ({ name: member.name, category: member.designation, group: "trainers" as const, image: member.image, portraitMode: "face-safe" as const })),
  { name: "Kshama Rani", category: "Program Manager", group: "program" as const, image: officialTeamPortraits.kshamaRani, portraitMode: "face-safe" as const, bio: "Leads the Foundation's programme delivery across Uttar Pradesh — coordinating digital training cohorts, green enterprise initiatives and community field events end to end." },
  { name: "Sikha Nayak", category: "State Head - Odisha", group: "program" as const, image: officialTeamPortraits.sikhaNayak, portraitMode: "face-safe" as const, bio: "State Head for Odisha — coordinating AASW programmes, field partnerships and member support across the state, working closely with the central programme team." },
];

const stateCouncilGallery = stateCouncilMembers.map((name) => ({ name, category: "State Council Member", group: "state" as const, hasSourcePortrait: false }));
const allTeamMembers = [...teamData, ...stateCouncilGallery];
export const teamSectionDefinitions = [
  { id: "core" as const, kicker: "Leadership", title: "Patron, Founder & Co-Founder", copy: "The Foundation’s patron and founding leadership, presented together." },
  { id: "advisory" as const, kicker: "Central Advisory", title: "Central Advisory", copy: "The official roster of Central Advisory members." },
  { id: "trainers" as const, kicker: "Digital capability", title: "Digital Trainers", copy: "Specialists listed by AASW for its digital learning work." },
  { id: "program" as const, kicker: "Programme delivery", title: "Program Management", copy: "The team responsible for planning, coordinating and delivering AASW programmes on the ground." },
  { id: "state" as const, kicker: "State Council", title: "State Council Members", copy: "The official State Council roster. Portraits are not shown where the source does not publish them." },
];

const aboutProgrammeData = [
  { number: "01", title: "Digital skill development", copy: "Training in e-commerce, social media marketing and online operations to start and maintain digital businesses." },
  { number: "02", title: "Green entrepreneurship", copy: "Ecologically conscious solutions and sustainable practices in business with heart." },
  { number: "03", title: "Mentorship & support", copy: "Connecting aspiring women entrepreneurs with professionals for step-by-step business building." },
  { number: "04", title: "Workshops & seminars", copy: "Leadership development, financial literacy and digital innovation through regular gatherings." },
  { number: "05", title: "Building community", copy: "A growing network for peer learning and collaboration, especially for remote entrepreneurs." },
];

const aboutTeamGallery = [...centralAdvisoryGallery, ...digitalTrainerGallery];

function SectionHeading({ kicker, title, copy }: { kicker: string; title: ReactNode; copy?: string }) {
  return (
    <div className="inner-section-heading">
      <p className="eyebrow"><span className="eyebrow-dot" />{kicker}</p>
      <h2>{title}</h2>
      {copy && <p className="inner-heading-copy">{copy}</p>}
    </div>
  );
}

function TeamSocialLinks({ name }: { name: string }) {
  return <div className="profile-social-links"><span>Follow AASW Foundation</span><div><a href={AASW_ORG_SOCIAL_LINKS.linkedin} target="_blank" rel="noreferrer" aria-label={`${name}: AASW Foundation organisation page on LinkedIn`}><Linkedin size={13} /></a><a href={AASW_ORG_SOCIAL_LINKS.instagram} target="_blank" rel="noreferrer" aria-label={`${name}: AASW Foundation organisation page on Instagram`}><Instagram size={13} /></a><a href={AASW_ORG_SOCIAL_LINKS.facebook} target="_blank" rel="noreferrer" aria-label={`${name}: AASW Foundation organisation page on Facebook`}><Facebook size={13} /></a></div><small>Organisation channels — not a personal profile</small></div>;
}

function ProfileDetail({ name, role, bio }: { name: string; role: string; bio?: string }) {
  const [open, setOpen] = useState(false);
  return <div className="profile-detail"><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}><span>{open ? "Hide profile" : "View profile"}</span><ExternalLink size={13} /></button>{open && <div className="profile-detail-panel"><span className="section-kicker">{role}</span><p>{bio ?? UNPUBLISHED_PROFILE_NOTE}</p><TeamSocialLinks name={name} /></div>}</div>;
}

function DefaultCouncilAvatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter((part) => !["Dr.", "Mr.", "Ms.", "Mrs.", "Prof.", "Pro."].includes(part)).slice(0, 2).map((part) => part[0]).join("");
  return <div className="team-default-avatar" aria-label={`${name}: editorial placeholder avatar, not a source portrait`}><Users size={26} aria-hidden="true" /><strong>{initials}</strong><span>Source portrait unavailable</span></div>;
}

export function AboutPage() {
  return (
    <InnerPageShell activePath="/about" chapter="02 / ABOUT AASW" eyebrow="About AASW Foundation" title={<>Bridging the digital divide<br /><em>for women entrepreneurs.</em></>} intro="AASW Foundation works to bridge the divide in digital business ownership and build a new wave of confident, capable and connected women leaders." heroImage={communityEditorial} heroAlt="Women gathered together at an AASW community event from the source archive">
      <InnerSection className="about-origin-section">
        <div className="about-origin-layout">
          <div>
            <SectionHeading kicker="About us" title={<>Equal opportunity<br /><em>for every woman.</em></>} copy="The chance for growth, leadership and groundbreaking ideas belongs to everyone — especially women from disadvantaged communities. Yet deep-seated barriers still stop countless Indian women from finding their footing in technology, business and sustainable careers." />
            <p className="about-source-paragraph">AASW Foundation was founded to change this reality. The foundation is a human-centred organisation in the heart of Uttar Pradesh, dedicated to bridging the divide in digital business ownership.</p>
            <p className="about-source-paragraph">We are a community-driven effort that directly helps women thrive in the digital economy. Our purpose is clear: to tackle the hurdles women face when seeking education, career opportunities and leadership roles, especially in business and technology.</p>
            <p className="about-source-paragraph">We don't just aim for inclusion; we work hard to create a space where women naturally step up as leaders. Through focused training, strong support systems and local programmes, we give women the tools they need to build lasting careers and make a real difference in their own neighbourhoods.</p>
          </div>
          <div className="about-purpose-card"><span className="section-kicker">The guiding statement</span><blockquote>“Stronger women create a better world — socially, environmentally and financially.”</blockquote><div className="about-purpose-rule"><i /><span>AASW Foundation</span></div></div>
        </div>
      </InnerSection>
      <section className="inner-section inner-section-sand"><div className="container"><div className="about-intention-grid"><article><span className="section-kicker">Our objective</span><h3>Make digital entrepreneurship more reachable.</h3><p>To encourage women in digital entrepreneurship through educational avenues by providing digital tools, environmental awareness and business mentoring for promoting inclusive economic growth.</p></article><article><span className="section-kicker">Our aim</span><h3>Support women as inventors and decision-makers.</h3><p>Imagine women throughout India becoming inventors and decision-makers in the near future — using technology and business to create a sustainable, just society and empowered people.</p></article></div></div></section>
      <InnerSection className="about-work-section"><SectionHeading kicker="Our work" title={<>Our five<br /><em>programme areas.</em></>} copy="These programme descriptions preserve the focus areas set out in the supplied AASW source." /><div className="about-programme-list">{aboutProgrammeData.map((programme) => <article key={programme.number}><span>{programme.number}</span><div><h3>{programme.title}</h3><p>{programme.copy}</p></div><ArrowUpRight size={19} /></article>)}</div><figure className="about-field-note"><img src={workshopEditorial} alt="Hands learning a practical craft during an AASW workshop" /><figcaption><span className="section-kicker">From our workshops</span><p>Learning becomes a real skill when women practise it together.</p></figcaption></figure></InnerSection>
      <section className="inner-section inner-section-ink about-method-section"><div className="container"><div className="about-method-heading"><p className="eyebrow eyebrow-light"><span className="eyebrow-dot eyebrow-dot-light" />How we work</p><h2>A sustainable, scalable model<br /><em>rooted in the community.</em></h2><p>“We use a sustainable and scalable model, combining local knowledge with global standards.”</p></div><div className="about-method-grid"><article><span>01</span><h3>Understand the market</h3><p>Identify local challenges and potential changemakers within community structures.</p></article><article><span>02</span><h3>Train with context</h3><p>Offer tailored digital training and mentorship specialised for women entrepreneurs.</p></article><article><span>03</span><h3>Work responsibly</h3><p>Follow business development and environmental responsibility in every project.</p></article><article><span>04</span><h3>Build collaboration</h3><p>Create community and advisory leadership relationships for long-term trust.</p></article><article><span>05</span><h3>Scale what works</h3><p>Scale successful initiatives through data, feedback and state-level promotion.</p></article></div></div></section>
      <InnerSection className="about-people-section"><SectionHeading kicker="Our people" title={<>Leadership, counsel<br /><em>and community.</em></>} copy="Meet the dedicated people behind AASW Foundation — visionaries, experts and change-makers committed to social equity." /><div className="about-leadership-grid"><article className="about-patron-card"><img src={officialTeamPortraits.patron} alt="Pujya Mahant Shri Shiv Chetnanand Saraswati Ji Maharaj" /><div><span className="section-kicker">Patron</span><h3>Pujya Mahant Shri Shiv Chetnanand Saraswati Ji Maharaj</h3><p>Khadeshwari Maharaj</p></div></article><article className="about-profile-card"><img src={officialTeamPortraits.anupam} alt="Anupam Trivedi" /><div><span className="section-kicker">Founder</span><h3>Anupam Trivedi</h3><p>A dedicated social reformer passionate about using digital technology to enable financial independence for rural women across Uttar Pradesh.</p><ProfileDetail name="Anupam Trivedi" role="Founder & Visionary" bio="A dedicated social reformer who uses digital technology to enable financial independence for rural women across Uttar Pradesh. Focus: strategy, digital tools and community outreach." /><TeamSocialLinks name="Anupam Trivedi" /></div></article><article className="about-profile-card"><img src={officialTeamPortraits.aparna} alt="Aparna Mishra" /><div><span className="section-kicker">Co-Founder</span><h3>Aparna Mishra</h3><p>Brings community-building, leadership-development and strategic-partnership experience, with a focus on gender equality and green business practices.</p><ProfileDetail name="Aparna Mishra" role="Co-Founder" bio="Brings experience in community building, leadership development and strategic partnerships, with a focus on gender equality and green business practices. Focus: operations, partnership and mentorship cohorts." /><TeamSocialLinks name="Aparna Mishra" /></div></article></div><div className="about-roster"><div><span className="section-kicker">Our wider people</span><h3>The AASW network</h3><p>The source team page recognises the following people and trainers. Individual titles are shown only where provided in the source.</p></div><div className="about-roster-names">{aboutTeamGallery.map((member, index) => <article className="about-roster-card" key={member.name}><div><img src={member.image} alt={member.name} loading="lazy" decoding="async" /><span>{String(index + 1).padStart(2, "0")}</span></div><h4>{member.name}</h4>{member.designation && <p>{member.designation}</p>}</article>)}</div></div></InnerSection>
      <section className="inner-section inner-section-sand"><div className="container"><div className="about-governance-layout"><div><span className="section-kicker">Governance</span><h2>Integrity is part<br /><em>of the method.</em></h2><p>Operating with radical honesty to ensure every resource is directed toward sustainable community transformation.</p><a href="/governance" className="text-link">Explore governance <ArrowUpRight size={15} /></a></div><div className="about-governance-grid"><div><span>01</span><strong>Central Advisory Council</strong><p>Strategy, integrity and impact.</p></div><div><span>02</span><strong>General Body</strong><p>Foundation-wide stewardship.</p></div><div><span>03</span><strong>Board of Directors</strong><p>Strategic oversight and alignment.</p></div><div><span>04</span><strong>Executive Committee</strong><p>Operational coordination.</p></div><div><span>05</span><strong>Programs Division</strong><p>On-ground work and assessment.</p></div></div></div></div></section>
      <section className="inner-section about-alignment-section"><div className="container"><div className="about-alignment-heading" data-reveal><p className="eyebrow"><span className="eyebrow-dot" />Working with national missions</p><h2>Local practice,<br /><em>national direction.</em></h2><p>AASW’s programmes are designed to complement and supplement India’s national missions — the same practical goals, carried at the community level in Uttar Pradesh.</p></div><div className="about-alignment-grid"><article data-reveal data-reveal-delay="1"><span className="section-kicker">Digital capability</span><h3>Digital India · Skill India</h3><p>Digital-skill training for women aligns with the national push for digital literacy and employable skills.</p></article><article data-reveal data-reveal-delay="2"><span className="section-kicker">Green enterprise</span><h3>Atmanirbhar Bharat · Swachh Bharat</h3><p>Eco-friendly micro-enterprise and plastic-alternative production support self-reliance and cleaner communities.</p></article><article data-reveal data-reveal-delay="3"><span className="section-kicker">Women’s agency</span><h3>Mission Shakti · Beti Bachao Beti Padhao</h3><p>Mentorship and leadership cohorts carry forward the national commitment to women’s safety, confidence and participation.</p></article></div></div></section>
    </InnerPageShell>
  );
}

export function ProgramsPage() {
  return (
    <InnerPageShell activePath="/programs" chapter="03 / OUR WORK" eyebrow="Our programmes" title={<>Skills, enterprise<br /><em>and support.</em></>} intro="AASW brings together digital education, eco-friendly enterprise, mentorship and community so women can move from learning to action." heroImage={workshopEditorial} heroAlt="Editorial visual of hands learning a practical craft at a workshop table">
      <InnerSection className="inner-program-intro">
        <SectionHeading kicker="Our approach" title={<>From learning<br /><em>to earning.</em></>} copy="Each programme is designed around a simple loop: learn something useful, try it in a supportive environment, and carry the confidence into the next decision." />
        <div className="inner-note-card"><ShieldCheck size={23} /><div><strong>Grounded in Uttar Pradesh</strong><p>Focused on practical opportunity, sustainable growth and the strength of a local community.</p></div></div>
      </InnerSection>
      <section className="inner-section inner-section-sand"><div className="container"><div className="program-detail-list">
        {programData.map((program) => { const Icon = program.icon; return <article className="program-detail" key={program.label}><div className="program-detail-top"><span>{program.label}</span><Icon size={24} /></div><div><h3>{program.title}</h3><p>{program.copy}</p></div><div className="program-detail-detail"><span>Field note</span><p>{program.detail}</p><a href="/donate">Support this pathway <ArrowUpRight size={15} /></a></div></article>; })}
      </div></div></section>
      <InnerSection className="inner-quote-section"><div className="inner-quote-grid"><div className="inner-quote-mark">“</div><blockquote>Stronger women create a better world — socially, environmentally and financially.</blockquote><div className="inner-quote-rule"><span>AASW Foundation</span><i /></div></div></InnerSection>
    </InnerPageShell>
  );
}

function TeamMemberCard({ member, index }: { member: (typeof allTeamMembers)[number]; index: number }) {
  const portraitMode = "portraitMode" in member ? member.portraitMode : undefined;
  return <article className={`team-card ${member.group === "core" ? "team-card-featured" : ""} ${member.category === "Patron" ? "team-card-patron" : ""} ${member.group === "state" ? "team-card-placeholder" : ""}`} data-reveal data-reveal-delay={index % 3 === 1 ? "1" : index % 3 === 2 ? "2" : undefined}>{"image" in member ? <div className={`team-photo ${portraitMode ? `team-photo-${portraitMode}` : ""}`}><img src={member.image} alt={member.name} loading={member.group === "core" ? "eager" : "lazy"} decoding="async" fetchPriority={member.group === "core" ? "high" : "auto"} /><span>{String(index + 1).padStart(2, "0")}</span></div> : <DefaultCouncilAvatar name={member.name} />}<div className="team-card-copy"><span className="section-kicker">{member.category}</span><h3>{member.name}</h3>{"bio" in member && member.bio && <p>{member.bio}</p>}{"bio" in member && member.bio && <><ProfileDetail name={member.name} role={member.category} bio={member.bio} /><TeamSocialLinks name={member.name} /></>}</div></article>;
}

export function TeamPage() {
  const [activeFilter, setActiveFilter] = useState<TeamFilter>("all");
  const visibleSections = teamSectionDefinitions.filter((section) => activeFilter === "all" || section.id === activeFilter);
  const visibleCount = visibleSections.reduce((total, section) => total + allTeamMembers.filter((member) => member.group === section.id).length, 0);
  return (
    <InnerPageShell activePath="/team" chapter="04 / OUR PEOPLE" eyebrow="Our team" title={<>Meet the people<br /><em>behind AASW.</em></>} intro="AASW is shaped by leadership, advisory experience and people who keep the work connected to real communities." heroImage={teamArchive} heroAlt="AASW source archive visual from the team and community work">
      <InnerSection className="team-intro"><SectionHeading kicker="Our people" title={<>Leadership, advisory<br /><em>and field teams.</em></>} copy="The official team roster is organised here by its leadership, Central Advisory, Digital Trainers and State Council membership." /><div className="patron-note"><span className="section-kicker">Leadership</span><h3>Patron, Founder<br />& Co-Founder</h3><p>Meet the Foundation’s founding leadership together in the first group below.</p></div></InnerSection>
      <section className="inner-section inner-section-paper"><div className="container"><div className="team-filter-bar" role="group" aria-label="Filter AASW team members by category"><div><span className="section-kicker">Browse the collective</span><p>{visibleCount} people shown</p></div><div className="team-filter-controls">{teamFilterOptions.map((filter) => <button type="button" key={filter.id} onClick={() => setActiveFilter(filter.id)} aria-pressed={activeFilter === filter.id} className={activeFilter === filter.id ? "is-active" : ""}>{filter.label}</button>)}</div></div><p className="team-filter-note">Each view retains its source-backed group heading. State Council cards use an editorial placeholder only where the official Team page does not publish a portrait.</p><div aria-live="polite">{visibleSections.map((section) => { const members = allTeamMembers.filter((member) => member.group === section.id); return <section className={`team-section-group team-section-${section.id}`} key={section.id} aria-labelledby={`team-group-${section.id}`}><header className="team-section-header"><div><span className="section-kicker">{section.kicker}</span><h2 id={`team-group-${section.id}`}>{section.title}</h2></div><p>{section.copy}</p></header><div className={`team-grid team-grid-${section.id}`}>{members.map((member, index) => <TeamMemberCard key={member.name} member={member} index={index} />)}</div></section>; })}</div></div></section>
      <InnerSection className="inner-join-section"><div className="inner-join-grid"><div><p className="eyebrow"><span className="eyebrow-dot" />Join the work</p><h2>Volunteer<br /><em>with AASW.</em></h2></div><div><p>Be part of the experience as a mentor, speaker or event coordinator — online or on the ground.</p><a href="mailto:aaswfoundation06@gmail.com?subject=I%20want%20to%20volunteer%20with%20AASW" className="button button-primary">Start a conversation <ArrowUpRight size={16} /></a></div></div></InnerSection>
    </InnerPageShell>
  );
}

export function ReportsPage() {
  const reportRows = [
    { icon: FileText, title: "Annual reports", detail: "A clear view of programmes, progress and the year in context.", action: "Request the report" },
    { icon: ShieldCheck, title: "Governance & policies", detail: "The institutional architecture behind accountable work.", action: "Explore governance" },
    { icon: BookOpen, title: "Impact notes", detail: "Themes and updates from digital inclusion, livelihoods and community.", action: "Read impact notes" },
  ];
  const reportLibrary = [
    { year: "2025", status: "In preparation", note: "The 2025 annual report is being assembled from verified programme records.", href: null as string | null },
    { year: "2024", status: "On request", note: "Programme progress, membership growth and the year in context.", href: null as string | null },
    { year: "2023", status: "On request", note: "Foundation activities, field notes and early green-enterprise results.", href: null as string | null },
  ];
  const requestHref = "mailto:aaswfoundation06@gmail.com?subject=Request%20for%20AASW%20Foundation%20annual%20report";
  return (
    <InnerPageShell activePath="/reports" chapter="05 / TRANSPARENCY" eyebrow="Reports & transparency" title={<>Our work,<br /><em>in full view.</em></>} intro="AASW’s public information should make it easy to understand the work, ask the right questions and stay close to how support moves." heroImage={reportDocument} heroAlt="AASW source archive certificate and document visual">
      <InnerSection className="reports-intro">
        <SectionHeading kicker="The report library" title={<>Annual reports<br /><em>and documents.</em></>} copy="Use this page as the front door to AASW’s reports, governance documents and impact updates. Download links can be connected as the latest PDFs are supplied." />
        <div className="reports-contact-card"><Mail size={22} /><div><strong>Need a specific document?</strong><p>Request it directly from the foundation team.</p><a href="mailto:aaswfoundation06@gmail.com?subject=Request%20for%20AASW%20Foundation%20reports">Request information <ArrowUpRight size={15} /></a></div></div>
      </InnerSection>
      <section className="inner-section inner-section-sand"><div className="container"><div className="report-list">
        {reportRows.map((row, index) => { const Icon = row.icon; const href = row.title === "Governance & policies" ? "/governance" : "mailto:aaswfoundation06@gmail.com?subject=Request%20for%20AASW%20Foundation%20information"; return <article className="report-row" key={row.title}><div className="report-row-index">{String(index + 1).padStart(2, "0")}</div><Icon className="report-row-icon" size={26} strokeWidth={1.4} /><div className="report-row-copy"><h3>{row.title}</h3><p>{row.detail}</p></div><a href={href} className="text-link">{row.action} <ArrowUpRight size={15} /></a></article>; })}
      </div></div></section>
      <InnerSection className="reports-library-section">
        <div className="report-library-heading" data-reveal><div><p className="eyebrow"><span className="eyebrow-dot" />The annual record</p><h2>Year by year,<br /><em>on the record.</em></h2></div><p>Annual reports are published as verified PDFs become available. Until a report is published for direct download, it can be requested from the Foundation team.</p></div>        <div className="report-library-grid">
          {reportLibrary.map((report, index) => <article className="report-card" key={report.year} data-reveal data-reveal-delay={String(Math.min(index, 3))}>
            <div className="report-card-cover"><FileText size={34} strokeWidth={1.3} /><span>Annual report</span><strong>{report.year}</strong></div>
            <div className="report-card-copy"><span className="section-kicker">{report.status}</span><p>{report.note}</p></div>
            <a href={report.href ?? requestHref} className={report.href ? "text-link" : "text-link report-card-request"}>{report.href ? "View the report" : "Request this report"} <ArrowUpRight size={15} /></a>
          </article>)}
        </div>
      </InnerSection>
      <InnerSection className="reports-principles"><div className="principle-grid"><div><span>01</span><strong>Visible</strong><p>Make the work easy to find.</p></div><div><span>02</span><strong>Readable</strong><p>Explain the work without jargon.</p></div><div><span>03</span><strong>Available</strong><p>Keep a direct line for questions.</p></div></div></InnerSection>
      <LiveContentAppendix kind="reports" />
    </InnerPageShell>
  );
}

export function GovernancePage() {
  const structures = ["Central Advisory Council", "General Body", "Board of Directors", "Executive Committee", "Programs Division"];
  const advisoryFunctions = [
    { title: "Advise the Governing Board", copy: "The Council advises the Governing Board on key programmes, outreach and innovation." },
    { title: "Promote initiatives across states", copy: "Promotion of AASW Foundation initiatives across different states, ensuring visibility in a real sense." },
    { title: "Identify unique local projects", copy: "Identifying local projects in different areas so members can implement tailor-made, community-driven solutions." },
    { title: "Generate awareness", copy: "Generate awareness on various women-related issues and digital inclusion." },
    { title: "Facilitate seminars and events", copy: "Organisational, logistical and promotional assistance for seminars and events." },
    { title: "Assist publications", copy: "Assist in publishing newsletters, achievements and case studies that promote the progress of our members." },
  ];
  return (
    <InnerPageShell activePath="/reports" chapter="06 / GOVERNANCE" eyebrow="Our governance" title={<>How AASW is<br /><em>governed.</em></>} intro="AASW's governance page describes the people, bodies and policies that help move the foundation's mission from intention into accountable action." heroImage={governanceArchive} heroImageNatural heroAlt="NGO Management — AASW Foundation cover visual with the team planning around a table">
      <InnerSection><SectionHeading kicker="Institutional architecture" title={<>The bodies behind<br /><em>the mission.</em></>} copy="Governance is the quiet system behind the visible work: roles, policies, oversight and a commitment to transparency." /><div className="governance-grid">{structures.map((item, index) => <div className="governance-card" key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong><p>{index < 2 ? "Strategic guidance and shared direction." : "A defined place in the foundation's operating system."}</p></div>)}</div></InnerSection>
      <InnerSection className="inner-section-sand"><div className="container"><SectionHeading kicker="Central Advisory Council" title={<>Guidance for strategy<br /><em>and integrity.</em></>} copy="The Central Advisory Council acts as an important asset for the Aapka Apna Social Welfare Foundation in shaping its strategy, integrity and impact. The President of the Foundation is the Chair of the Council, and the Secretary acts as the Member Secretary." /><div className="live-policy-grid advisory-functions-list">{advisoryFunctions.map((fn, index) => <div key={fn.title}><span>{String(index + 1).padStart(2, "0")}</span><strong>{fn.title}</strong><p>{fn.copy}</p></div>)}</div><p className="advisory-functions-note"><ShieldCheck size={18} />Thanks are extended from the bottom of our hearts to the members of the Advisory Council for their generosity, leadership and commitment to the enhancement of our mission.</p></div></InnerSection>
      <InnerSection className="inner-section-paper"><div className="policy-band"><ShieldCheck size={26} /><div><span className="section-kicker">Policy promise</span><h3>Transparency, financial auditing, anti-corruption, conflict of interest, whistleblower and data privacy.</h3></div></div></InnerSection>
      <LiveContentAppendix kind="governance" />
    </InnerPageShell>
  );
}

export function StoriesPage() {
  const lenses = [{ number: "01", title: "Digital inclusion", copy: "When a screen becomes a doorway, not a barrier.", icon: Wifi }, { number: "02", title: "Livelihoods", copy: "When a skill becomes a practical next step.", icon: HandCoins }, { number: "03", title: "Community", copy: "When support gets stronger because it is shared.", icon: HeartHandshake }];
  const impactFigures = [["800+", "Women trained in digital skills, entrepreneurship and eco-friendly practices"], ["300+", "Successful small businesses launched or scaled"], ["30+", "Eco-friendly projects run by women entrepreneurs"], ["5+", "Districts operating, with expansion in the pipeline"]];
  return (
    <InnerPageShell activePath="/stories" chapter="07 / IMPACT" eyebrow="Our impact" title={<>Real numbers.<br /><em>Real women.</em></>} intro="Since our inception, we've trained, mentored and given leading roles to hundreds of women in rural and semi-urban areas — with active partnerships with schools, colleges and community organisations." heroImage={communityEditorial} heroAlt="Editorial visual of a community gathering around a shared table">
      <InnerSection className="stories-inner-intro"><SectionHeading kicker="Three lenses on the work" title={<>Access, livelihoods<br /><em>and community.</em></>} copy="Stories at AASW are not only about outcomes. They are about the conditions that make progress more possible: access, practice, support and choice." /><div className="impact-lens-grid">{lenses.map((lens) => { const Icon = lens.icon; return <article key={lens.number} className="impact-lens"><span>{lens.number}</span><Icon size={28} strokeWidth={1.4} /><h3>{lens.title}</h3><p>{lens.copy}</p><a href="/programs" className="text-link">Explore the work <ArrowUpRight size={15} /></a></article>; })}</div></InnerSection>
      <InnerSection className="inner-section-sand"><div className="container"><div className="live-appendix-heading"><span className="section-kicker">Our impact so far</span><h2>Our impact<br /><em>in numbers.</em></h2></div><div className="live-impact-grid">{impactFigures.map(([value, label]) => <div key={value}><strong>{value}</strong><p>{label}</p></div>)}</div></div></InnerSection>
      <InnerSection className="stories-upcoming-section"><div className="live-report-notice stories-upcoming-note"><HeartHandshake size={28} /><div><span className="section-kicker">Success stories</span><h2>The women behind these numbers, coming soon.</h2><p>Documented success stories from our members will be placed here — real journeys of learning, enterprise and leadership, shared as inspiration for greater participation by more women in leadership and learning platforms.</p></div></div></InnerSection>
      <InnerSection className="inner-section-ink story-closing"><div className="inner-quote-grid"><div className="inner-quote-mark">“</div><blockquote>Learning becomes a real skill when women practise it together.</blockquote><div className="inner-quote-rule"><span>AASW Foundation</span><i /></div></div></InnerSection>
    </InnerPageShell>
  );
}

export function UpdatesPage() {
  const updates = [{ date: "July 2026 / Announcement", title: "Expanding to new districts in Uttar Pradesh.", detail: "The Digital Skills programme is launching in Kanpur Nagar and nearby rural pockets, aiming to train over 500 more women this quarter." }, { date: "June 2026 / Impact story", title: "Eco-Friendly Bags Initiative Takeoff.", detail: "Trained members manufactured and distributed 2,000+ plastic-alternative carry bags under the Green Entrepreneurship initiative." }, { date: "May 2026 / Mentorship", title: "Mentorship Cohort 2026 Graduated.", detail: "45 women leaders completed the three-month strategic training cohort, matching with local digital entrepreneurs for on-ground training." }];
  return (
    <InnerPageShell activePath="/stories" chapter="08 / UPDATES" eyebrow="News & updates" title={<>Latest news<br /><em>from the field.</em></>} intro="Progress is built through many small updates. Follow the programmes, milestones and moments that keep AASW moving forward." heroImage={updatesArchive} heroAlt="AASW source archive visual showing women learning together">
      <InnerSection><SectionHeading kicker="News & updates" title={<>What is happening<br /><em>right now.</em></>} copy="These updates are drawn from the existing AASW source content and can become a future newsroom once publishing tools are connected." /><div className="updates-list">{updates.map((update, index) => <article className="update-row" key={update.title}><span className="update-number">{String(index + 1).padStart(2, "0")}</span><div><span className="section-kicker">{update.date}</span><h3>{update.title}</h3><p>{update.detail}</p></div><ArrowUpRight className="update-arrow" size={20} /></article>)}</div></InnerSection>
    </InnerPageShell>
  );
}

export function MembershipPage() {
  const benefits = ["Connect with social entrepreneurs, philanthropists and changemakers", "Access quarterly workshops on non-profit management and advocacy", "Receive detailed quarterly audits of membership impact", "Early access to AASW summits and charity events", "Tax-exempt contributions under Section 80G", "Eligibility to lead regional chapters and represent AASW"];
  return (
    <InnerPageShell activePath="/membership" chapter="09 / MEMBERSHIP" eyebrow="Become a member" title={<>Join the<br /><em>AASW community.</em></>} intro="Membership turns one-time support into a relationship with the work — a practical way to stay close to the people and programmes you care about." heroImage={membershipArchive} heroImageNatural heroAlt="Join Our Membership — be a part of lasting change banner with AASW members at a community event">
      <InnerSection className="membership-intro"><SectionHeading kicker="Two paths to participate" title={<>Annual or lifetime<br /><em>membership.</em></>} copy="Choose an annual or lifetime membership to stay close to the people, programmes and practical work you care about." /><div className="membership-plans"><article className="membership-plan"><span className="section-kicker">Annual membership</span><strong>₹1,100</strong><p>A simple way to stand with the work for a year.</p><a href="#membership-application" className="membership-checkout-trigger">Complete application <ArrowUpRight size={15} /></a></article><article className="membership-plan membership-plan-featured"><span className="section-kicker">Lifetime membership</span><strong>₹10,000</strong><p>A permanent commitment to the foundation’s mission.</p><a href="#membership-application" className="membership-checkout-trigger membership-checkout-trigger-light">Complete application <ArrowUpRight size={15} /></a></article></div><p className="payment-inline-disclosure">The membership application collects the identity details required to register your membership. Live payment collection is not active yet.</p></InnerSection>
      <InnerSection id="membership-application" className="membership-application-section"><MembershipApplicationForm /></InnerSection>
      <InnerSection className="inner-section-sand"><div className="benefit-layout"><div><span className="section-kicker">Member advantages</span><h2>Benefits of<br /><em>AASW membership.</em></h2></div><div className="benefit-list">{benefits.map((benefit) => <div key={benefit}><span><Check size={14} /></span><p>{benefit}</p></div>)}</div></div></InnerSection>
      <LiveContentAppendix kind="membership" />
    </InnerPageShell>
  );
}

export function DonatePage() {
  const causes = [
    { label: "01 / Digital skills", title: "Fund digital skills training.", copy: "Support practical learning in e-commerce, social media marketing and online operations.", amount: 2000 },
    { label: "02 / Green enterprise", title: "Support green entrepreneurship.", copy: "Support ecologically conscious enterprise and sustainable business practice.", amount: 4000 },
    { label: "03 / Mentorship & community", title: "Back mentorship and community.", copy: "Support shared learning, workshops and professional mentorship for women building businesses.", amount: 8000 },
  ];
  return (
    <InnerPageShell activePath="/donate" chapter="10 / SUPPORT" eyebrow="Donate to AASW" title={<>Support a woman.<br /><em>Change a community.</em></>} intro="Every contribution helps extend AASW’s reach into new districts and regions through digital literacy, micro-enterprise tools and sustainable livelihood programmes." heroImage={donateArchive} heroImageNatural heroAlt="Donate Now — your support can change lives banner with AASW Foundation members and children">
      <InnerSection className="donate-inner-intro"><SectionHeading kicker="Donate to AASW" title={<>How your donation<br /><em>helps.</em></>} copy="Donation is a separate support flow from Membership. Complete the required donor details and select the amount you would like to give." /></InnerSection>
      <InnerSection id="donation-details" className="donation-details-section"><DonationDetailsForm /><TaxInlineNote /></InnerSection>
      <InnerSection className="donation-tax-section"><TaxBenefitBlock /></InnerSection>
      <section className="inner-section inner-section-sand"><div className="container"><div className="donation-cause-heading"><span className="section-kicker">Direct your support</span><h2>Choose where<br /><em>your donation goes.</em></h2></div><div className="donation-cause-grid">{causes.map((cause) => <article key={cause.label}><span>{cause.label}</span><h3>{cause.title}</h3><p>{cause.copy}</p><a href="#donation-details" className="text-link donation-cause-button">Choose ₹{cause.amount.toLocaleString("en-IN")} <ArrowUpRight size={15} /></a></article>)}</div></div></section>
      <InnerSection className="donation-trust-section"><div className="donation-trust-grid"><div><span className="section-kicker">Giving with clarity</span><h2>Receipts &<br /><em>tax benefits.</em></h2></div><div><ShieldCheck size={24} /><h3>Receipt & tax context</h3><p>The AASW live website states that tax-exempt contributions may be available under Section 80G. Confirm receipt and eligibility details with the foundation before making a live donation.</p></div><div><Mail size={24} /><h3>Need help before giving?</h3><p>For donation questions or an institutional contribution, contact the AASW team directly.</p><a href="mailto:aaswfoundation06@gmail.com?subject=Donation%20enquiry%20for%20AASW%20Foundation" className="text-link">Ask about donating <ArrowUpRight size={15} /></a></div></div></InnerSection>
      <InnerSection className="inner-section-sand"><div className="donate-impact-grid"><div><span>800+</span><p>Women trained</p></div><div><span>300+</span><p>Small businesses launched or scaled</p></div><div><span>30+</span><p>Eco-friendly projects</p></div><div><span>80G</span><p>Potential tax exemption</p></div></div></InnerSection>
      <LiveContentAppendix kind="donate" />
    </InnerPageShell>
  );
}

export function PolicyPage({ type }: { type: "privacy" | "refund" }) {
  const privacy = type === "privacy";
  const sections = privacy ? [
    ["Information we collect", "The public policy explains AASW’s approach to collecting contact details for donations and memberships. Membership applications may additionally require district, PAN information and an ID-proof document where the form clearly asks for them."],
    ["How we use your information", "Application details are used to process and respond to the relevant membership request. PAN and ID-proof information are not included in routine Foundation email alerts."],
    ["Data security", "PAN values are encrypted before storage, while ID-proof files are kept as restricted application documents. AASW does not sell, trade or transfer personally identifiable information without consent."],
    ["Contacting us", `For a privacy question or request about information submitted through the website, contact ${AASW_CONTACT.email} or ${AASW_CONTACT.primaryPhoneDisplay}.`],
  ] : [
    ["No refund policy", "The live policy states that online membership-fee cancellation or refund requests will not be entertained after payment is completed."],
    ["Secure payments", "Online payments are processed through secure gateway partners when live payment activation is enabled."],
    ["Need help?", "For a payment or support question, contact the Foundation directly before completing a live transaction."],
  ];
  return (
    <InnerPageShell activePath="/reports" chapter={privacy ? "11 / PRIVACY" : "12 / REFUND"} eyebrow="Clear terms" title={privacy ? <>Your privacy,<br /><em>protected.</em></> : <>Refund &<br /><em>cancellation policy.</em></>} intro={privacy ? "A plain-language overview of how AASW Foundation approaches privacy and data protection." : "The refund and cancellation policy for contributions and membership support."}>
      <InnerSection className="policy-page"><div className="policy-intro"><ShieldCheck size={27} /><p>{privacy ? "AASW Foundation respects your privacy and is committed to protecting personal data when you interact with the website, donate or apply for membership." : "The published refund and cancellation terms apply to online membership-fee payments. Please review tier details, benefits and pricing carefully before proceeding."}</p></div><div className="policy-sections">{sections.map(([title, copy], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{title}</h2><p>{copy}</p></div></article>)}</div><a href={`${AASW_CONTACT.emailHref}?subject=Policy%20question%20for%20AASW%20Foundation`} className="text-link">Ask a policy question <ArrowUpRight size={15} /></a></InnerSection>
      <LiveContentAppendix kind={privacy ? "privacy" : "refund"} />
    </InnerPageShell>
  );
}

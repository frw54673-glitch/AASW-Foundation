import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowUpRight, Award, CalendarPlus, Check, Download, Eye, EyeOff, FileText, FileUp, FolderKanban, Grid2X2, HandHeart, History, House, ImageUp, KeyRound, Laptop2, Leaf, LogOut, Mail, MapPin, Menu, Presentation, ShieldCheck, Sprout, UsersRound, UserRound, WifiOff, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatIndianDate } from "@shared/mis";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadMemberCertificatePdf } from "@/lib/memberCertificatePdf";
import { loadMemberDraft, saveMemberDraft } from "./MemberSidebarDrafts";
import { downloadMemberPaymentReceiptPdf } from "@/lib/memberPaymentReceiptPdf";
import { downloadNextRenewalCalendarEvent, nextRenewalEligibilityDate } from "@/lib/memberRenewalCalendar";
import { membershipExpiryTimeRemaining } from "@/lib/membershipTermTiming";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications";
import { AnimatedCounter } from "@/components/TrustAndImpact";
import "./member-dashboard.css";
import "./member-dashboard-urgency.css";

type Section = "home" | "profile" | "membership" | "history" | "services" | "password";
type Icon = typeof Award;
type MemberServiceType = "digital_skill_development" | "green_entrepreneurship" | "mentorship_business_support" | "workshops_seminars" | "building_community";

const memberServiceOptions: { value: MemberServiceType; label: string; summary: string; icon: Icon; details: { what: string; how: string[]; payment: string } }[] = [
  {
    value: "digital_skill_development",
    label: "Digital skill development",
    summary: "Digital tools, e-commerce, social-media marketing and online operations.",
    icon: Laptop2,
    details: {
      what: "Learn the digital skills that today's work demands: using smartphones and computers confidently, selling products online, marketing on social media, and handling digital payments and online operations safely.",
      how: [
        "Send your request here with a short note about what you want to learn",
        "The Foundation team accepts your request and confirms your programme place",
        "Attend the training sessions and practise the skills on real tasks",
        "Share a completion report with proof (photos, certificates or files of your work) from this portal",
      ],
      payment: "Honorarium payouts are settled to the UPI id or bank account you share with your completion report. Verified payouts start from ₹100 and the approved amount is shown to you before settlement.",
    },
  },
  {
    value: "green_entrepreneurship",
    label: "Green entrepreneurship",
    summary: "Environmental education and sustainable practices for enterprise.",
    icon: Leaf,
    details: {
      what: "Build an eco-friendly enterprise: environmental education, sustainable sourcing, waste-reduction practices, and green business models that can earn while protecting your local environment.",
      how: [
        "Send your request describing your green business idea or training need",
        "The Foundation team reviews and accepts your request",
        "Complete the guided training and apply the practices to your enterprise",
        "Submit your completion report with proof of the work you delivered",
      ],
      payment: "Honorarium payouts are settled to the UPI id or bank account you share with your completion report. Verified payouts start from ₹100 and the approved amount is shown to you before settlement.",
    },
  },
  {
    value: "mentorship_business_support",
    label: "Mentorship & business support",
    summary: "Practical guidance for aspiring women entrepreneurs.",
    icon: UsersRound,
    details: {
      what: "Get practical guidance from experienced mentors for starting and growing your enterprise: business planning, pricing, bookkeeping, licensing, and connecting to markets and schemes.",
      how: [
        "Send your request with a short note about your business stage",
        "The Foundation matches you with a suitable mentor and confirms your place",
        "Attend the mentorship sessions and complete the agreed business milestones",
        "Submit your completion report with proof of the progress you made",
      ],
      payment: "Honorarium payouts are settled to the UPI id or bank account you share with your completion report. Verified payouts start from ₹100 and the approved amount is shown to you before settlement.",
    },
  },
  {
    value: "workshops_seminars",
    label: "Workshops & seminars",
    summary: "Leadership, financial literacy, technology and innovation learning.",
    icon: Presentation,
    details: {
      what: "Join leadership, financial literacy, technology and innovation workshops. Learn in groups, hear from experts, and take home practical methods you can use immediately.",
      how: [
        "Send your request for the workshop or seminar you want to attend",
        "The Foundation team confirms your seat and shares the schedule",
        "Attend the sessions and take part in the activities",
        "Submit your completion report with proof such as attendance or photos",
      ],
      payment: "Honorarium payouts are settled to the UPI id or bank account you share with your completion report. Verified payouts start from ₹100 and the approved amount is shown to you before settlement.",
    },
  },
  {
    value: "building_community",
    label: "Building the community",
    summary: "Peer learning, collaboration and confidence-building support.",
    icon: HandHeart,
    details: {
      what: "Work with other members on community projects: peer learning circles, collaboration activities, and confidence-building support that strengthens your local group.",
      how: [
        "Send your request describing the community activity you want to lead or join",
        "The Foundation team accepts and supports your community activity",
        "Run the activity with your group and document the participation",
        "Submit your completion report with proof such as photos or attendance sheets",
      ],
      payment: "Honorarium payouts are settled to the UPI id or bank account you share with your completion report. Verified payouts start from ₹100 and the approved amount is shown to you before settlement.",
    },
  },
];

const serviceRequestLabel = (value: string) => value.replaceAll("_", " ");
// Payout receipts store the programme key in lower case; show it as a proper name.
const programmeTitle = (value?: string | null) => value ? value.replace(/\b\w/g, character => character.toUpperCase()) : null;

function FileTypeIcon({ mimeType }: { mimeType: string }) { return mimeType === "application/pdf" ? <FileText size={15} /> : <ImageUp size={15} />; }

const renewalBenefits = [
  "Digital certificate and online community access",
  "Monthly impact updates and reports",
  "Quarterly workshops on non-profit management and advocacy",
  "Early access to annual summits and charity events",
  "Regional chapter and national forum eligibility",
];

const sections: { id: Section; label: string; icon: Icon }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "profile", label: "My profile", icon: UserRound },
  { id: "membership", label: "My membership", icon: Award },
  { id: "history", label: "Membership history", icon: History },
  { id: "services", label: "My services", icon: Grid2X2 },
  { id: "password", label: "Change password", icon: KeyRound },
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function safeSection(value: string | null): Section {
  return value === "profile" || value === "membership" || value === "history" || value === "services" || value === "password" ? value : "home";
}

function daysBetween(start: Date, end: Date) {
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
}

function MemberInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [shown, setShown] = useState(false);
  return <label className="member-sidebar-field"><span>{label}</span><div><input type={shown ? "text" : "password"} value={value} onChange={event => onChange(event.target.value)} /><button type="button" onClick={() => setShown(previous => !previous)} aria-label={shown ? "Hide password" : "Show password"}>{shown ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>;
}

function Loading() {
  return <main className="member-sidebar-loading" aria-busy="true"><span /><p>Loading your member account…</p></main>;
}

function AccessRequired() {
  return <main className="member-sidebar-loading"><div><h1>Member login required</h1><p>Sign in to view your own membership information.</p><a href="/member/login">Go to Member Login</a></div></main>;
}

function MemberLoginWelcome() {
  const updateParallax = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - bounds.left) / bounds.width - .5) * 18);
    const y = Math.round(((event.clientY - bounds.top) / bounds.height - .5) * 14);
    event.currentTarget.style.setProperty("--member-parallax-x", `${x}px`);
    event.currentTarget.style.setProperty("--member-parallax-y", `${y}px`);
    event.currentTarget.style.setProperty("--member-parallax-x-soft", `${Math.round(x * .42)}px`);
    event.currentTarget.style.setProperty("--member-parallax-y-soft", `${Math.round(y * .42)}px`);
    event.currentTarget.style.setProperty("--member-parallax-x-deep", `${Math.round(x * 1.12)}px`);
    event.currentTarget.style.setProperty("--member-parallax-y-deep", `${Math.round(y * 1.12)}px`);
  };
  const resetParallax = (event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--member-parallax-x", "0px");
    event.currentTarget.style.setProperty("--member-parallax-y", "0px");
    event.currentTarget.style.setProperty("--member-parallax-x-soft", "0px");
    event.currentTarget.style.setProperty("--member-parallax-y-soft", "0px");
    event.currentTarget.style.setProperty("--member-parallax-x-deep", "0px");
    event.currentTarget.style.setProperty("--member-parallax-y-deep", "0px");
  };
  return <main className="member-login-welcome" role="status" aria-live="polite" onPointerMove={updateParallax} onPointerLeave={resetParallax}>
    <div className="member-login-welcome-grain" aria-hidden="true" />
    <div className="member-login-welcome-aurora" aria-hidden="true" />
    <div className="member-login-welcome-orbit orbit-one" aria-hidden="true" />
    <div className="member-login-welcome-orbit orbit-two" aria-hidden="true" />
    <section className="member-login-welcome-card">
      <div className="member-login-welcome-logo"><img src="/manus-storage/aasw-foundation-official-logo_41a4007d.png" alt="" /></div>
      <p>AASW MEMBER PORTAL</p>
      <h1>Welcome to<br /><em>AASW Foundation.</em></h1>
      <span>Your member space is ready.</span>
    </section>
    <div className="member-login-welcome-flight" aria-hidden="true"><i /><b /><span /><em /></div>
    <div className="member-login-welcome-reveal" aria-hidden="true" />
  </main>;
}

function ProjectsDetail({ projects }: { projects: { assignmentId: number; projectRole: string; assignedAt: string | Date; projectId: number; projectCode: string; projectName: string; projectTheme: string; projectLocation: string; projectStatus: string; startDate: string | Date; endDate: string | Date }[] }) {
  const statusTone = (status: string) => ({ active: "run", completed: "done", planned: "plan", on_hold: "hold", closed: "done", cancelled: "hold" } as Record<string, string>)[status] ?? "hold";
  return <div className="member-detail-page member-projects-page">
    <MemberDetailIntro eyebrow="MY PROJECTS" title="The work you are part of." lead="Only projects explicitly assigned to your member account by the Foundation are shown here, with your role and the current project status." tone="programmes" />
    {projects.length ? <section className="member-projects-grid" aria-label="Your assigned projects">{projects.map(project => <article key={project.assignmentId} className={`member-project-card-xl status-${statusTone(project.projectStatus)}`}><div className="member-project-card-xl-top"><span className="member-project-xl-role">{project.projectRole}</span><em className={`member-project-xl-status status-${statusTone(project.projectStatus)}`}>{project.projectStatus.replaceAll("_", " ")}</em></div><h2>{project.projectCode}</h2><h3>{project.projectName}</h3><p className="member-project-xl-theme">{project.projectTheme}</p><div className="member-project-xl-meta"><span><MapPin size={13} aria-hidden />{project.projectLocation}</span><span>{formatIndianDate(project.startDate)} — {formatIndianDate(project.endDate)}</span></div><small>Assigned {formatIndianDate(project.assignedAt)}</small></article>)}</section> : <section className="member-projects-empty"><h2>No projects assigned yet.</h2><p>When the Foundation assigns you to a project, it will appear here with your role and its current status. For access questions, contact the Foundation administrator.</p></section>}
    <section className="member-projects-foot"><div><span>YOUR FIELD ROLE</span><h2>Every assignment is real and current.</h2><p>AASW lists only Foundation-verified projects. If an assignment ends, it moves out of this view automatically.</p></div><a href="mailto:aaswfoundation06@gmail.com?subject=Member%20project%20support">Project support <ArrowUpRight size={16} /></a></section>
  </div>;
}

function FoundationPillar({ icon: IconComponent, title, text, tone }: { icon: Icon; title: string; text: string; tone: string }) {
  return <article className={`member-home-pillar ${tone}`}><div><IconComponent size={20} /></div><h3>{title}</h3><p>{text}</p></article>;
}

function FoundationHome() {
  return <div className="member-foundation-home">
    <section className="member-home-mast">
      <div className="member-home-mast-copy">
        <span className="member-home-eyebrow">AASW MEMBER PORTAL</span>
        <p className="member-home-kicker">Aapka Apna Social Welfare Foundation</p>
        <h1>Fueling women’s success through <em>tech &amp; enterprise.</em></h1>
        <p className="member-home-lead">AASW is a human-centred organisation in Uttar Pradesh, working to help women move with confidence through digital learning, enterprise support, mentorship and community care.</p>
        <div className="member-home-actions"><a href="/member/discover">Discover AASW <ArrowUpRight size={16} /></a><a href="/member/programmes">Explore our programmes <ArrowUpRight size={16} /></a></div>
      </div>
      <aside className="member-home-mast-note">
        <span>OUR CORE BELIEF</span>
        <p>Stronger women create a better world—socially, environmentally and financially.</p>
        <i />
        <small>Capability, care and accountability in practice.</small>
      </aside>
    </section>

    <section className="member-home-statement" aria-label="Foundation purpose">
      <div><span>OUR PURPOSE</span><h2>Practical support for women building their own next step.</h2></div>
      <p>AASW encourages women in digital entrepreneurship by connecting educational avenues with digital tools, environmental awareness and business mentoring for inclusive economic growth.</p>
    </section>

    <section className="member-home-pillar-grid" aria-label="What AASW does">
      <FoundationPillar icon={Laptop2} tone="gold" title="Digital skill development" text="Digital skills, e-commerce, social-media marketing and online operations for enterprise." />
      <FoundationPillar icon={Leaf} tone="sage" title="Green entrepreneurship" text="Environmental education and sustainable practices built into business possibilities." />
      <FoundationPillar icon={HandHeart} tone="terracotta" title="Mentorship & support" text="Practical guidance from mentors for aspiring women entrepreneurs." />
      <FoundationPillar icon={Presentation} tone="blue" title="Learning together" text="Workshops, webinars and seminars for leadership, literacy and innovation." />
      <FoundationPillar icon={UsersRound} tone="plum" title="Building community" text="Peer learning, collaboration and confidence for first-time entrepreneurs." />
    </section>

    <section className="member-home-impact">
      <div className="member-home-impact-heading"><span>OUR IMPACT</span><h2>Work that reaches beyond a single training room.</h2><p>Our programmes grow through local understanding, sustained mentorship and community participation.</p></div>
      <div className="member-home-impact-numbers"><article><strong><AnimatedCounter target={800} suffix="+" durationMs={1400} /></strong><span>women trained</span></article><article><strong><AnimatedCounter target={300} suffix="+" durationMs={1400} /></strong><span>small businesses launched or scaled</span></article><article><strong><AnimatedCounter target={30} suffix="+" durationMs={1400} /></strong><span>eco-friendly projects led by women</span></article></div>
    </section>

    <section className="member-home-connect">
      <div><span>WAYS TO PARTICIPATE</span><h2>Support, volunteer or spread the word.</h2><p>Offer support for the mission, share practical expertise, or help more women discover AASW’s work.</p></div>
      <a href="mailto:aaswfoundation06@gmail.com?subject=Member%20portal%20support">Contact AASW <ArrowUpRight size={16} /></a>
    </section>
  </div>;
}

function MemberDetailIntro({ eyebrow, title, lead, tone = "discover" }: { eyebrow: string; title: string; lead: string; tone?: "discover" | "programmes" }) {
  return <header className={`member-detail-intro ${tone}`}><a href="/member/dashboard" className="member-detail-back"><ArrowLeft size={16} />Back to Member Home</a><span>{eyebrow}</span><h1>{title}</h1><p>{lead}</p></header>;
}

function DiscoverAaswDetail() {
  return <div className="member-detail-page member-discover-page">
    <MemberDetailIntro eyebrow="DISCOVER AASW" title="A Foundation built for practical agency." lead="Aapka Apna Social Welfare Foundation is a community-driven effort that helps women thrive in the digital economy through skills, support and local connection." />
    <section className="member-detail-split member-detail-purpose"><div><span>WHO WE ARE</span><h2>Making room for women to step forward as leaders.</h2></div><div><p>AASW was founded to help change the barriers women face when seeking education, career opportunities and leadership roles—especially in business and technology.</p><p>Working in Uttar Pradesh, the Foundation brings together focused training, support systems and local programmes so women can build lasting careers and make a difference in their own neighbourhoods.</p></div></section>
    <section className="member-detail-objective"><span>OUR OBJECTIVE</span><p>To encourage women in digital entrepreneurship through educational avenues, digital tools, environmental awareness and business mentoring for inclusive economic growth.</p></section>
    <section className="member-detail-method"><div><span>HOW WE WORK</span><h2>Local understanding, carried forward with care.</h2></div><div className="member-detail-method-list"><article><b>01</b><p>Identify local challenges and potential changemakers.</p></article><article><b>02</b><p>Offer tailored digital training and mentorship.</p></article><article><b>03</b><p>Build collaboration through community and advisory leadership.</p></article><article><b>04</b><p>Use data and feedback to grow successful initiatives responsibly.</p></article></div></section>
    <section className="member-detail-governance"><span>GOVERNANCE &amp; TRUST</span><h2>Guided by strategy, integrity and impact.</h2><p>The Central Advisory Council supports the Foundation’s strategy, outreach and local project direction, while helping promote initiatives and member achievements across different states.</p><a href="/member/programmes">See the programmes <ArrowUpRight size={16} /></a></section>
  </div>;
}

function ProgrammeDetail({ icon: IconComponent, title, intro, detail, tone }: { icon: Icon; title: string; intro: string; detail: string; tone: string }) {
  return <article className={`member-programme-detail ${tone}`}><div><IconComponent size={22} /></div><span>{title}</span><h2>{intro}</h2><p>{detail}</p></article>;
}

function ProgrammesDetail() {
  return <div className="member-detail-page member-programmes-page">
    <MemberDetailIntro eyebrow="EXPLORE OUR PROGRAMMES" title="Tools, confidence and a community to grow with." lead="Each AASW programme translates a practical need into an opportunity for learning, enterprise and sustained participation." tone="programmes" />
    <section className="member-programmes-intro"><div><span>WHAT WE DO</span><h2>Five connected ways to support women entrepreneurs.</h2></div><p>From learning digital tools to building peer confidence, the programme areas are designed to help women take practical next steps in their own work and communities.</p></section>
    <section className="member-programme-detail-grid" aria-label="AASW programme areas">
      <ProgrammeDetail icon={Laptop2} tone="gold" title="DIGITAL SKILL DEVELOPMENT" intro="Skills for the digital economy." detail="Training in digital skills, e-commerce, social-media marketing and online operations helps women start and sustain businesses." />
      <ProgrammeDetail icon={Leaf} tone="sage" title="GREEN ENTREPRENEURSHIP" intro="Enterprise with environmental care." detail="Environmental education supports ecologically conscious solutions and sustainable practices in business." />
      <ProgrammeDetail icon={HandHeart} tone="terracotta" title="MENTORSHIP & BUSINESS SUPPORT" intro="Guidance at the point of growth." detail="Mentors connect aspiring women entrepreneurs with professionals who can guide them step by step in building and scaling their business." />
      <ProgrammeDetail icon={Presentation} tone="blue" title="WORKSHOPS & SEMINARS" intro="Learning in conversation." detail="Regular online and offline gatherings cover leadership development, financial literacy, technology applications, branding and digital innovation." />
      <ProgrammeDetail icon={UsersRound} tone="plum" title="BUILDING THE COMMUNITY" intro="Confidence grows alongside peers." detail="A growing network enables peer learning, collaboration and confidence, especially for first-time entrepreneurs in remote locations." />
    </section>
    <section className="member-programmes-closing"><div><span>YOUR PLACE IN THE WORK</span><h2>Keep learning. Share knowledge. Strengthen the community.</h2></div><a href="mailto:aaswfoundation06@gmail.com?subject=Member%20portal%20support">Connect with AASW <ArrowUpRight size={16} /></a></section>
  </div>;
}

export function MemberSidebarDashboard() {
  // Deep-linkable sections: /member/membership, /member/profile, etc. resolve
  // to their sidebar section; plain /member/dashboard keeps the remembered one.
  const [memberPath] = useLocation();
  const sectionFromPath = memberPath.replace(/^\/member\/?/, "").split("?")[0] === "dashboard" ? null : safeSection(memberPath.replace(/^\/member\/?/, "").split("?")[0] || "home");
  const [section, setSection] = useState<Section>(() => sectionFromPath ?? safeSection(localStorage.getItem("member_dashboard_active_section")));
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("member_dashboard_sidebar_collapsed") === "true");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showLoginWelcome, setShowLoginWelcome] = useState(() => sessionStorage.getItem("aasw_member_welcome_intro") === "true");
  const [revealDashboard, setRevealDashboard] = useState(() => sessionStorage.getItem("aasw_member_welcome_intro") === "true");
  // React to in-app navigations between the member/* alias routes.
  useEffect(() => { if (sectionFromPath) setSection(sectionFromPath); }, [sectionFromPath]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<MemberServiceType>("digital_skill_development");
  // The programme card the member opened for full details (what/how/payment).
  const [programmeDetail, setProgrammeDetail] = useState<MemberServiceType | null>(null);
  // Escape closes the programme details dialog like every other portal dialog.
  useEffect(() => {
    if (!programmeDetail) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setProgrammeDetail(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [programmeDetail]);
  const [serviceMessage, setServiceMessage] = useState("");
  // Optional MIS project the request is routed at. "none" keeps it general;
  // the option list mirrors the member's live project assignments.
  const [selectedProjectId, setSelectedProjectId] = useState("none");
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportDraft, setSupportDraft] = useState("");
  const [completionFor, setCompletionFor] = useState<string | null>(null);
  // Escape closes the completion-report dialog like every other portal dialog.
  useEffect(() => {
    if (!completionFor) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setCompletionFor(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [completionFor]);
  const [completionDetails, setCompletionDetails] = useState("");
  const [completionDriveLink, setCompletionDriveLink] = useState("");
  const [payoutMode, setPayoutMode] = useState<"upi" | "bank">("upi");
  const [payoutUpiId, setPayoutUpiId] = useState("");
  const [payoutAccountName, setPayoutAccountName] = useState("");
  const [payoutAccountNumber, setPayoutAccountNumber] = useState("");
  const [payoutIfsc, setPayoutIfsc] = useState("");
  type CompletionProofFile = { storageKey: string; originalName: string; mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf"; fileSize: number; uploading: boolean };
  const [completionProofs, setCompletionProofs] = useState<CompletionProofFile[]>([]);  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsCity, setSettingsCity] = useState("");
  const [settingsDistrict, setSettingsDistrict] = useState("");
  const [settingsState, setSettingsState] = useState("");
  const [settingsAddress, setSettingsAddress] = useState("");
  const [foundationUpdatesOptIn, setFoundationUpdatesOptIn] = useState(true);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === "object" ? navigator.onLine : true));
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [repliesSeenAt, setRepliesSeenAt] = useState<Date | null>(null);
  const [renewalBenefitsOpen, setRenewalBenefitsOpen] = useState(false);
  const [countdownNow, setCountdownNow] = useState(() => new Date());
  const photoInput = useRef<HTMLInputElement>(null);
  const serviceSelect = useRef<HTMLSelectElement>(null);
  const portalPath = window.location.pathname;
  const isDiscoverDetail = portalPath === "/member/discover";
  const isProgrammesDetail = portalPath === "/member/programmes";
  const isProjectsDetail = portalPath === "/member/projects";
  const isMemberDetail = isDiscoverDetail || isProgrammesDetail || isProjectsDetail;
  const utils = trpc.useUtils();
  const member = trpc.member.me.useQuery();
  const draftMemberId = member.data?.membershipNo ?? null;
  const profile = trpc.member.dashboard.useQuery(undefined, { enabled: Boolean(member.data) });
  const projects = trpc.member.myProjects.useQuery(undefined, { enabled: Boolean(member.data) });
  // Live MIS projects assigned to this member — drives the request-form
  // project selector and the live-projects strip on the services page.
  const projectOptions = (projects.data ?? []).map(project => ({ projectId: project.projectId, projectCode: project.projectCode, projectName: project.projectName, projectStatus: project.projectStatus }));
  const membershipHistory = trpc.member.membershipHistory.useQuery(undefined, { enabled: Boolean(member.data) });
  const serviceRequests = trpc.member.myServiceRequests.useQuery(undefined, { enabled: Boolean(member.data) });
  const completions = trpc.member.myCompletions.useQuery(undefined, { enabled: Boolean(member.data) });
  const supportMessages = trpc.member.mySupportMessages.useQuery(undefined, { enabled: Boolean(member.data) });
  const paymentReceipts = trpc.member.myReceipts.useQuery(undefined, { enabled: Boolean(member.data) });
  // Total honorarium actually settled to this member (paid payout receipts only).
  const payoutReceivedPaise = (paymentReceipts.data ?? []).reduce((total, receipt) => total + (receipt.kind === "payout" && receipt.status !== "refunded" ? receipt.amount : 0), 0);
  const logout = trpc.member.logout.useMutation({ onSuccess: () => window.location.assign("/member/login") });
  const changePassword = trpc.member.changePassword.useMutation({ onSuccess: () => { setCurrentPassword(""); setNewPassword(""); setConfirmation(""); setPasswordError(null); notifySuccess("Password updated successfully."); }, onError: issue => { setPasswordError(issue.message); notifyError(issue.message); } });
  const uploadPhoto = trpc.member.uploadProfilePhoto.useMutation({ onSuccess: () => { void utils.member.dashboard.invalidate(); notifySuccess("Profile photo updated."); }, onError: issue => notifyError(issue.message) });
  const joinService = trpc.member.joinService.useMutation({ onSuccess: (result) => { void utils.member.myServiceRequests.invalidate(); if (result.created) { setServiceMessage(""); notifySuccess("Service request sent", "AASW Foundation will review your request in the Member Portal."); } else notifyInfo("Already requested", "You already have a request for this programme area."); }, onError: issue => notifyError(issue.message) });
  const sendSupportMessage = trpc.member.sendSupportMessage.useMutation({ onSuccess: () => { setSupportDraft(""); void utils.member.mySupportMessages.invalidate(); notifySuccess("Support message sent", "AASW Foundation can now review your message."); }, onError: issue => notifyError(issue.message) });
  const uploadCompletionProof = trpc.member.uploadCompletionProof.useMutation({ onError: issue => { setCompletionProofs(previous => previous.filter(proof => !proof.uploading)); notifyError(issue.message); } });
  const submitCompletion = trpc.member.submitCompletion.useMutation({ onSuccess: () => { if (draftMemberId && completionFor) saveMemberDraft(draftMemberId, `completion-${completionFor}`, ""); setCompletionFor(null); setCompletionDetails(""); setCompletionDriveLink(""); setPayoutUpiId(""); setPayoutAccountName(""); setPayoutAccountNumber(""); setPayoutIfsc(""); setCompletionProofs([]); void utils.member.myCompletions.invalidate(); void utils.member.myServiceRequests.invalidate(); notifySuccess("Completion report submitted", "The Foundation team will verify your report and share payment details."); }, onError: issue => notifyError(issue.message) });
  const updateProfileSettings = trpc.member.updateProfileSettings.useMutation({ onSuccess: () => { setSettingsDirty(false); void utils.member.dashboard.invalidate(); notifySuccess("Profile settings saved", "Your contact details and communication preference have been updated."); }, onError: issue => notifyError(issue.message) });
  // Replies newer than the last time the member opened the support chat are
  // surfaced as a badge; opening the conversation marks them as read.
  const unseenSupportReplies = (supportMessages.data ?? []).filter(message => message.adminReply && (!repliesSeenAt || new Date(message.repliedAt ?? message.createdAt) > repliesSeenAt));

  useEffect(() => { localStorage.setItem("member_dashboard_active_section", section); }, [section]);
  useEffect(() => { localStorage.setItem("member_dashboard_sidebar_collapsed", String(collapsed)); }, [collapsed]);
  useEffect(() => { if (window.location.pathname === "/member/projects") setSection("services"); }, []);
  // Server profile loads after mount, so seed the settings form once per member.
  // An in-progress edit is never clobbered by a background refetch.
  useEffect(() => {
    if (!profile.data || !draftMemberId) return;
    if (settingsDirty) return;
    setSettingsPhone(profile.data.phone ?? "");
    setSettingsCity(profile.data.city ?? "");
    setSettingsDistrict(profile.data.district ?? "");
    setSettingsState(profile.data.state ?? "");
    setSettingsAddress(profile.data.address ?? "");
    setFoundationUpdatesOptIn(profile.data.foundationUpdatesOptIn ?? true);
  }, [profile.data, draftMemberId, settingsDirty]);
  // Draft auto-save: a section switch, refresh or crash can never destroy a
  // half-typed message. Cleared on successful submit.
  useEffect(() => {
    if (!draftMemberId) return;
    setServiceMessage(loadMemberDraft(draftMemberId, "service-message"));
    setSupportDraft(loadMemberDraft(draftMemberId, "support-message"));
    const savedSettings = loadMemberDraft(draftMemberId, "profile-settings");
    if (!savedSettings) return;
    try {
      const draft = JSON.parse(savedSettings) as { phone?: unknown; city?: unknown; district?: unknown; state?: unknown; address?: unknown; foundationUpdatesOptIn?: unknown };
      if (typeof draft.phone === "string") setSettingsPhone(draft.phone);
      if (typeof draft.city === "string") setSettingsCity(draft.city);
      if (typeof draft.district === "string") setSettingsDistrict(draft.district);
      if (typeof draft.state === "string") setSettingsState(draft.state);
      if (typeof draft.address === "string") setSettingsAddress(draft.address);
      if (typeof draft.foundationUpdatesOptIn === "boolean") setFoundationUpdatesOptIn(draft.foundationUpdatesOptIn);
      setSettingsDirty(true);
    } catch {
      // Corrupt draft: ignore it and use the server copy.
    }
  }, [draftMemberId]);
  useEffect(() => {
    if (draftMemberId) saveMemberDraft(draftMemberId, "service-message", serviceMessage);
  }, [serviceMessage, draftMemberId]);
  useEffect(() => {
    if (draftMemberId) saveMemberDraft(draftMemberId, "support-message", supportDraft);
  }, [supportDraft, draftMemberId]);
  // Completion report drafts are keyed per request so reopening a report (or a
  // refresh while typing) never loses the member's description.
  useEffect(() => {
    if (completionFor && draftMemberId) setCompletionDetails(loadMemberDraft(draftMemberId, `completion-${completionFor}`));
  }, [completionFor, draftMemberId]);
  useEffect(() => {
    if (completionFor && draftMemberId) saveMemberDraft(draftMemberId, `completion-${completionFor}`, completionDetails);
  }, [completionDetails, completionFor, draftMemberId]);
  useEffect(() => {
    if (!draftMemberId) return;
    // Persist unsaved profile edits; once saved (or reverted) the server copy
    // is authoritative again, so the local draft is dropped.
    saveMemberDraft(draftMemberId, "profile-settings", settingsDirty ? JSON.stringify({ phone: settingsPhone, city: settingsCity, district: settingsDistrict, state: settingsState, address: settingsAddress, foundationUpdatesOptIn }) : "");
  }, [draftMemberId, settingsDirty, settingsPhone, settingsCity, settingsDistrict, settingsState, settingsAddress, foundationUpdatesOptIn]);
  useEffect(() => {
    if (!showLoginWelcome) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => { sessionStorage.removeItem("aasw_member_welcome_intro"); setShowLoginWelcome(false); setRevealDashboard(!reducedMotion); }, reducedMotion ? 0 : 1950);
    return () => window.clearTimeout(timer);
  }, [showLoginWelcome]);
  useEffect(() => {
    if (!revealDashboard || showLoginWelcome) return;
    const timer = window.setTimeout(() => setRevealDashboard(false), 900);
    return () => window.clearTimeout(timer);
  }, [revealDashboard, showLoginWelcome]);
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileSidebarOpen]);
  // Connection awareness: drafts keep unsaved work safe, so the banner only
  // needs to warn about actions that talk to the server.
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);
  // Restore the "replies seen" timestamp so the unread badge survives reloads.
  useEffect(() => {
    const saved = localStorage.getItem("member_support_replies_seen");
    if (saved) setRepliesSeenAt(new Date(Number(saved)));
  }, []);
  // Keyboard shortcuts: Alt+1..6 jump between sections, Alt+? shows the cheat
  // sheet. Ignored while typing so regular input is never hijacked.
  useEffect(() => {
    const onKeydown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key >= "1" && event.key <= String(sections.length)) {
        const destination = sections[Number(event.key) - 1];
        if (!destination) return;
        event.preventDefault();
        localStorage.setItem("member_dashboard_active_section", destination.id);
        // Detail routes render their own content, so they need a full load.
        if (window.location.pathname !== "/member/dashboard") window.location.assign("/member/dashboard");
        else setSection(destination.id);
        return;
      }
      if (event.key === "?" && event.altKey && !typing) {
        event.preventDefault();
        setShortcutsOpen(previous => !previous);
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);
  useEffect(() => {
    const interval = window.setInterval(() => setCountdownNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const strength = useMemo(() => [newPassword.length >= 8, /[A-Z]/.test(newPassword), /\d/.test(newPassword), /[^A-Za-z0-9]/.test(newPassword)].filter(Boolean).length, [newPassword]);
  if (showLoginWelcome) return <MemberLoginWelcome />;
  // Only the session + profile queries gate the whole dashboard — the home
  // screen does not render history, receipts, requests or support data.
  // Section-specific queries load independently so a slow receipts query
  // never blanks out the portal.
  if (member.isLoading || profile.isLoading) return <Loading />;
  if (!member.data) return <AccessRequired />;
  if (!profile.data || profile.isError) return <main className="member-sidebar-loading"><div><h1>Member account unavailable</h1><p>Please contact AASW Foundation for help with your membership record.</p></div></main>;
  // Each sidebar section waits only for the queries it actually renders, so
  // an error in any of them degrades that section instead of the whole portal.
  const sectionQueries: Partial<Record<Section, { label: string; states: { isLoading: boolean; isError: boolean }[] }>> = {
    profile: { label: "project assignments", states: [projects] },
    membership: { label: "membership history", states: [membershipHistory] },
    history: { label: "membership history", states: [membershipHistory, serviceRequests, supportMessages, paymentReceipts] },
    services: { label: "service requests and support messages", states: [serviceRequests, supportMessages, completions] },
  };
  const blockedSection = sectionQueries[section];
  if (blockedSection?.states.some(query => query.isLoading)) return <Loading />;
  if (blockedSection?.states.some(query => query.isError)) return <main className="member-sidebar-loading"><div><h1>This section could not load</h1><p>Your {blockedSection.label} could not be fetched right now. Check your connection and reopen this section from the sidebar.</p><a href="/member/dashboard">Reload portal</a></div></main>;

  const active = profile.data.portalAccessStatus === "active";
  const inGracePeriod = profile.data.portalAccessStatus === "grace";
  const portalEnabled = profile.data.portalAccessStatus !== "expired";
  const location = [profile.data.city, profile.data.district].filter(Boolean).join(", ") || "Not recorded";
  // Only the fields the member can actually edit on this page count towards
  // completeness, so the meter never dings them for data only the office sets.
  const profileCompleteness = Math.round(([profile.data.phone, profile.data.address, profile.data.city, profile.data.state, profile.data.profilePhotoUrl].filter(Boolean).length / 5) * 100);
  const joined = new Date(profile.data.joiningDate);
  const expires = profile.data.expiresOn ? new Date(profile.data.expiresOn) : null;
  const graceEnds = profile.data.graceEndsOn ? new Date(profile.data.graceEndsOn) : null;
  const totalDays = expires ? Math.max(1, daysBetween(joined, expires)) : 1;
  const elapsed = expires ? Math.min(100, Math.max(0, Math.round((1 - daysBetween(new Date(), expires) / totalDays) * 100))) : 0;
  const remaining = expires ? daysBetween(new Date(), expires) : 0;
  const graceRemaining = graceEnds ? Math.max(0, daysBetween(new Date(), graceEnds)) : 0;
  const expiryTone = !expires ? "lifetime" : inGracePeriod ? "grace" : remaining <= 7 ? "urgent" : remaining < 30 ? "soon" : "active";
  const exactExpiryTimeRemaining = expires ? membershipExpiryTimeRemaining(expires, countdownNow) : null;
  const isTermRenewalUrgent = Boolean(expires && active && remaining < 30);
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";
  // Next-steps board: every action only this member can take, derived from the
  // data already loaded — accepted work to report, rejected reports to fix,
  // approved payouts heading their way, unread Foundation replies and renewals.
  type NextStep = { id: string; title: string; text: string; cta: string; tone: "amber" | "maroon" | "green" | "blue"; icon: Icon; action: () => void };
  const nextSteps: NextStep[] = [];
  for (const request of serviceRequests.data ?? []) {
    const completion = completions.data?.find(entry => entry.requestRef === request.requestRef);
    const programmeLabel = memberServiceOptions.find(option => option.value === request.serviceType)?.label ?? serviceRequestLabel(request.serviceType);
    if (completion?.status === "verified") nextSteps.push({ id: `payout-${request.requestRef}`, title: "Payout approved — on its way", text: `Your ${programmeLabel} payout of ₹${((completion.payoutAmount ?? 0) / 100).toLocaleString("en-IN")} was approved. Watch your registered account for the transfer.`, cta: "See details", tone: "green", icon: HandHeart, action: () => setSection("services") });
    else if (completion?.status === "rejected") nextSteps.push({ id: `resubmit-${request.requestRef}`, title: "Fix your completion report", text: `Your ${programmeLabel} report needs one more try — ${completion.rejectionReason ? `the Foundation said: ${completion.rejectionReason}` : "update the details and attach proof again"}.`, cta: "Resubmit", tone: "maroon", icon: Presentation, action: () => { setSection("services"); setCompletionFor(request.requestRef); setCompletionDetails(""); setCompletionProofs([]); } });
    else if (!completion && request.status === "accepted") nextSteps.push({ id: `report-${request.requestRef}`, title: "Report your completed work", text: `You were accepted into ${programmeLabel}. Share what you did with proof so the Foundation can verify and settle your payout.`, cta: "Start report", tone: "amber", icon: Check, action: () => { setSection("services"); setCompletionFor(request.requestRef); setCompletionDetails(""); setCompletionProofs([]); } });
  }
  if (unseenSupportReplies.length) nextSteps.push({ id: "support-replies", title: `${unseenSupportReplies.length} unread repl${unseenSupportReplies.length === 1 ? "y" : "ies"} from the Foundation`, text: "The support team answered your message. Open the private chat to read the response.", cta: "Open chat", tone: "blue", icon: Mail, action: () => { setSupportOpen(true); const now = new Date(); setRepliesSeenAt(now); localStorage.setItem("member_support_replies_seen", String(now.getTime())); } });
  if (expires && inGracePeriod) nextSteps.push({ id: "renewal-grace", title: "Renew before you lose access", text: `Your renewal grace period ends ${formatIndianDate(profile.data.graceEndsOn!)}. Renew with the same email and PAN to keep your Member ID.`, cta: "Renew now", tone: "maroon", icon: CalendarPlus, action: () => setSection("membership") });
  const download = () => downloadMemberCertificatePdf(profile.data);
  const renewalEligibleOn = expires ? nextRenewalEligibilityDate(expires) : null;
  const daysUntilRenewalEligible = renewalEligibleOn ? daysBetween(new Date(), renewalEligibleOn) : 0;
  const addRenewalReminder = () => {
    if (!expires || !renewalEligibleOn) return;
    downloadNextRenewalCalendarEvent(expires, `${window.location.origin}/member/dashboard`);
    notifySuccess("Calendar reminder downloaded", `Add the reminder to your calendar for ${formatIndianDate(renewalEligibleOn)}.`);
  };
  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    if (!currentPassword || !newPassword || !confirmation) return setPasswordError("Please complete all password fields.");
    if (newPassword !== confirmation) return setPasswordError("Passwords do not match.");
    if (strength < 4) return setPasswordError("Use 8+ characters with uppercase, number and special character.");
    changePassword.mutate({ currentPassword, password: newPassword });
  };
  const submitServiceRequest = (event: FormEvent) => { event.preventDefault(); joinService.mutate({ serviceType: selectedService, projectId: selectedProjectId !== "none" ? Number(selectedProjectId) : undefined, message: serviceMessage.trim() || undefined }); };
  // Proof files upload one at a time (5 MB cap each) so a single request never
  // exceeds the server body limit; the storage key returns before final submit.
  const addCompletionProofs = (files: FileList | null) => {
    if (!completionFor || !files?.length) return;
    const supported = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const accepted = Array.from(files).slice(0, 6 - completionProofs.length);
    for (const file of accepted) {
      if (!supported.includes(file.type)) { notifyError(`"${file.name}" is not a JPG, PNG, WebP or PDF file.`); continue; }
      if (file.size > 5 * 1024 * 1024) { notifyError(`"${file.name}" is larger than 5 MB.`); continue; }
      const reader = new FileReader();
      reader.onerror = () => notifyError(`"${file.name}" could not be read.`);
      reader.onload = () => {
        const dataBase64 = typeof reader.result === "string" ? reader.result.split(",")[1] : "";
        if (!dataBase64) return notifyError(`"${file.name}" could not be read.`);
        setCompletionProofs(previous => [...previous, { storageKey: "", originalName: file.name, mimeType: file.type as CompletionProofFile["mimeType"], fileSize: file.size, uploading: true }]);
        uploadCompletionProof.mutate({ requestRef: completionFor, originalName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf", dataBase64 }, { onSuccess: result => setCompletionProofs(previous => previous.map(proof => proof.uploading && proof.originalName === file.name ? { ...proof, storageKey: result.storageKey, fileSize: result.fileSize, uploading: false } : proof)) });
      };
      reader.readAsDataURL(file);
    }
  };
  const submitCompletionReport = (event: FormEvent) => {
    event.preventDefault();
    if (!completionFor) return;
    if (completionProofs.some(proof => proof.uploading)) return notifyError("Please wait for the proof files to finish uploading.");
    if (!completionProofs.length) return notifyError("Attach at least one proof file (image, PDF) or a Drive link.");
    const payoutDetails = payoutMode === "upi"
      ? { upiId: payoutUpiId.trim() }
      : { accountName: payoutAccountName.trim(), accountNumber: payoutAccountNumber.trim(), ifsc: payoutIfsc.trim().toUpperCase() };
    submitCompletion.mutate({ requestRef: completionFor, details: completionDetails.trim(), driveLink: completionDriveLink.trim() || undefined, payoutDetails, proofs: completionProofs.map(proof => ({ storageKey: proof.storageKey, originalName: proof.originalName, mimeType: proof.mimeType, fileSize: proof.fileSize })) });
  };
  const submitSupportMessage = (event: FormEvent) => { event.preventDefault(); if (!supportDraft.trim()) return notifyError("Please write your support message."); sendSupportMessage.mutate({ message: supportDraft.trim() }); };
  const submitProfileSettings = (event: FormEvent) => {
    event.preventDefault();
    updateProfileSettings.mutate({ phone: settingsPhone.trim(), city: settingsCity.trim(), district: settingsDistrict.trim(), state: settingsState.trim(), address: settingsAddress.trim(), foundationUpdatesOptIn });
  };
  const startPhotoUpload = (file?: File) => {
    if (!file) return;
    const supported = ["image/jpeg", "image/png", "image/webp"];
    if (!supported.includes(file.type)) return notifyError("Use a JPG, PNG or WebP profile photo.");
    if (file.size > 2 * 1024 * 1024) return notifyError("Use a profile photo up to 2 MB.");
    const reader = new FileReader();
    reader.onerror = () => notifyError("The selected photo could not be read.");
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const dataBase64 = dataUrl.split(",")[1];
      if (!dataBase64) return notifyError("The selected photo could not be read.");
      uploadPhoto.mutate({ originalName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", dataBase64 });
    };
    reader.readAsDataURL(file);
  };
  const avatar = profile.data.profilePhotoUrl ? <img src={profile.data.profilePhotoUrl} alt={`${profile.data.fullName} profile`} /> : initials(profile.data.fullName);
  const toggleSidebar = () => {
    if (window.matchMedia?.("(max-width: 768px)").matches) {
      setMobileSidebarOpen(previous => !previous);
      return;
    }
    setCollapsed(previous => !previous);
  };
  const toggleFromKeyboard = (event: KeyboardEvent<HTMLElement>) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleSidebar(); } };

  return <main className={`member-sidebar-page ${revealDashboard ? "member-login-dashboard-reveal" : ""}`}>
    <header className="member-sidebar-topbar"><div className="member-sidebar-topbar-left"><button type="button" className="member-mobile-menu-trigger" onClick={() => setMobileSidebarOpen(previous => !previous)} aria-label={mobileSidebarOpen ? "Close member navigation" : "Open member navigation"} aria-expanded={mobileSidebarOpen} aria-controls="member-sidebar-navigation">{mobileSidebarOpen ? <X size={21} /> : <Menu size={21} />}</button><a href="/" className="member-sidebar-brand"><img src="/manus-storage/aasw-foundation-official-logo_41a4007d.png" alt="AASW Foundation" /><span>AASW FOUNDATION</span></a></div><div><a href="/member/certificate"><Award size={16} /><span>My certificate</span></a><button onClick={() => logout.mutate()}><LogOut size={16} /><span>Sign out</span></button></div></header>
    <div className="member-sidebar-shell">
      {!online && <div className="member-connection-banner" role="alert"><WifiOff size={16} /><span>You are offline. Typed messages are saved on this device, but new actions need a connection.</span></div>}
      {shortcutsOpen && <div className="member-support-dialog-backdrop" role="presentation" onMouseDown={() => setShortcutsOpen(false)}><section className="member-support-dialog member-shortcuts-dialog" role="dialog" aria-modal="true" aria-labelledby="member-shortcuts-title" onMouseDown={event => event.stopPropagation()}><header><div><p>KEYBOARD SHORTCUTS</p><h2 id="member-shortcuts-title">Move faster in your portal.</h2></div><button type="button" onClick={() => setShortcutsOpen(false)} aria-label="Close shortcuts dialog"><X size={18} /></button></header><ul className="member-shortcuts-list">{sections.map((item, index) => <li key={item.id}><kbd>Alt + {index + 1}</kbd><span>{item.label}</span></li>)}<li><kbd>Alt + ?</kbd><span>Show or hide this list</span></li><li><kbd>Esc</kbd><span>Close dialogs and the mobile menu</span></li></ul></section></div>}
      {mobileSidebarOpen && <button type="button" className="member-sidebar-overlay" onClick={() => setMobileSidebarOpen(false)} aria-label="Close member navigation" />}
      <aside id="member-sidebar-navigation" className={`member-sidebar ${collapsed ? "collapsed" : ""} ${mobileSidebarOpen ? "mobile-open" : ""}`}>
        <section className="member-sidebar-identity member-sidebar-identity-toggle" role="button" tabIndex={0} onClick={toggleSidebar} onKeyDown={toggleFromKeyboard} aria-expanded={!collapsed} aria-label={collapsed ? "Expand member navigation" : "Collapse member navigation"} title={collapsed ? "Expand member navigation" : "Collapse member navigation"}><div className="member-sidebar-avatar">{avatar}</div><strong>{profile.data.fullName}</strong><code>{profile.data.membershipNo}</code><span className={active ? "active" : inGracePeriod ? "grace" : "expired"}>● {active ? "Active" : inGracePeriod ? "Grace period" : "Expired"}</span></section>
        <nav>{sections.map((item, index) => { const IconComponent = item.icon; const badgeCount = item.id === "services" && unseenSupportReplies.length ? unseenSupportReplies.length : 0; return <button key={item.id} className={!isMemberDetail && section === item.id ? "is-active" : ""} onClick={() => { setMobileSidebarOpen(false); localStorage.setItem("member_dashboard_active_section", item.id); if (isMemberDetail) window.location.assign("/member/dashboard"); else setSection(item.id); }} title={`${item.label} (Alt+${index + 1})`}><IconComponent size={18} /><span>{item.label}</span>{badgeCount > 0 && <em className="member-sidebar-badge" aria-label={`${badgeCount} new support repl${badgeCount === 1 ? "y" : "ies"}`}>{badgeCount}</em>}</button>; })}</nav>
        <footer><button onClick={() => logout.mutate()}><LogOut size={18} /><span>Sign out</span></button></footer>
      </aside>
      <section className="member-sidebar-content"><div key={portalPath} className="member-sidebar-section">
        {isDiscoverDetail && <DiscoverAaswDetail />}
        {isProgrammesDetail && <ProgrammesDetail />}
        {isProjectsDetail && <ProjectsDetail projects={projects.data ?? []} />}
        {!isMemberDetail && section === "home" && <><section className="member-welcome-strip" aria-label="Your membership at a glance">
          <div><p>WELCOME BACK</p><h2>{greeting}, {profile.data.fullName.split(" ")[0]}.</h2><span>{active ? "Your membership is active and all member services are available." : inGracePeriod ? `Renewal grace period — ${graceRemaining} day${graceRemaining === 1 ? "" : "s"} left to renew without losing your Member ID.` : profile.data.memberType === "annual" ? "Your annual term has ended — renewal is available now." : "Your lifetime membership remains active."}</span></div>
          <ul>
            <li><span>MEMBERSHIP</span><strong>{profile.data.membershipTypeLabel}</strong></li>
            <li><span>{expires ? "RENEWS IN" : "VALIDITY"}</span><strong>{expires ? `${remaining} day${remaining === 1 ? "" : "s"}` : "Lifetime"}</strong></li>
            <li><span>SUPPORT REPLIES</span><strong className={unseenSupportReplies.length ? "member-welcome-alert" : ""}>{unseenSupportReplies.length ? `${unseenSupportReplies.length} unread` : "All read"}</strong></li>
            <li><span>RECEIVED FROM AASW</span><strong>₹{(payoutReceivedPaise / 100).toLocaleString("en-IN")}</strong></li>
          </ul>
        </section>{nextSteps.length ? <section className="member-next-steps" aria-labelledby="member-next-steps-heading"><div><p>YOUR NEXT STEPS</p><h2 id="member-next-steps-heading">{nextSteps.length === 1 ? "One thing needs your attention." : `${nextSteps.length} things need your attention.`}</h2><span>Actions only you can take — each card opens the exact place in your portal.</span></div><div className="member-next-steps-list" role="list">{nextSteps.map(step => { const StepIcon = step.icon; return <button key={step.id} type="button" role="listitem" className={`member-next-step-card ${step.tone}`} onClick={step.action} aria-label={`${step.title}. ${step.text}`}><span className="member-next-step-icon" aria-hidden="true"><StepIcon size={18} /></span><span className="member-next-step-copy"><strong>{step.title}</strong><small>{step.text}</small></span><em aria-hidden="true">{step.cta} <ArrowUpRight size={13} /></em></button>; })}</div></section> : <section className="member-next-steps caught-up" aria-label="No pending actions"><div><p>YOUR NEXT STEPS</p><h2>All caught up.</h2><span>No pending actions right now. Your payout and programme updates will appear here the moment they need you.</span></div><div className="member-next-steps-list" role="list"><button type="button" role="listitem" className="member-next-step-card green" onClick={() => setSection("services")}><span className="member-next-step-icon" aria-hidden="true"><Sprout size={18} /></span><span className="member-next-step-copy"><strong>Explore a new programme</strong><small>Join another AASW programme area whenever you are ready.</small></span><em aria-hidden="true">Browse <ArrowUpRight size={13} /></em></button><button type="button" role="listitem" className="member-next-step-card blue" onClick={() => setSupportOpen(true)}><span className="member-next-step-icon" aria-hidden="true"><Mail size={18} /></span><span className="member-next-step-copy"><strong>Talk to the Foundation</strong><small>Questions about programmes or payouts? The support chat is private.</small></span><em aria-hidden="true">Open chat <ArrowUpRight size={13} /></em></button></div></section>}<FoundationHome /></>}
        {section === "profile" && <><SectionHeader title="My profile" subtitle="Your personal details, contact information and communication preferences" /><dl className="member-info-grid"><Info label="Full name" value={profile.data.fullName} /><Info label="Role" value={member.data.role.replaceAll("_", " ")} /><Info label="Email" value={profile.data.email} /><Info label="Membership ID" value={profile.data.membershipNo} mono /><Info label="Phone" value={profile.data.phone || "Not recorded"} /><Info label="City" value={location} /><Info label="State" value={profile.data.state || "Not recorded"} /><Info label="Member since" value={formatIndianDate(profile.data.joiningDate)} wide /><Info label="Last sign-in" value={profile.data.lastLogin ? `${formatIndianDate(profile.data.lastLogin)}${new Date(profile.data.lastLogin).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) ? " · " + new Date(profile.data.lastLogin).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}` : "Not recorded"} wide /><Info label="Projects assigned" value={`${projects.data?.length ?? 0} assigned`} wide /><div className="member-profile-completeness" data-completeness={profileCompleteness >= 80 ? "high" : profileCompleteness >= 50 ? "medium" : "low"}><dt>Profile completeness</dt><div role="progressbar" aria-label={`Profile ${profileCompleteness}% complete`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={profileCompleteness}><i style={{ width: `${profileCompleteness}%` }} /></div><dd>{profileCompleteness >= 80 ? "Excellent — the Foundation can reach you easily." : profileCompleteness >= 50 ? "Good — add the remaining details for quicker support." : "Add your contact details so the Foundation can support you faster."}</dd></div></dl><section className="member-profile-settings" aria-labelledby="member-profile-settings-title"><div><p>PROFILE SETTINGS</p><h2 id="member-profile-settings-title">Keep your contact details up to date.</h2><span>Your login email stays protected because it is linked to your Member ID and secure renewal matching.</span></div><form onSubmit={submitProfileSettings}><div className="member-profile-settings-grid"><label><span>Mobile number</span><input value={settingsPhone} onChange={event => { setSettingsDirty(true); setSettingsPhone(event.target.value); }} inputMode="tel" autoComplete="tel" /></label><label><span>City</span><input value={settingsCity} onChange={event => { setSettingsDirty(true); setSettingsCity(event.target.value); }} autoComplete="address-level2" /></label><label><span>District</span><input value={settingsDistrict} onChange={event => { setSettingsDirty(true); setSettingsDistrict(event.target.value); }} /></label><label><span>State</span><input value={settingsState} onChange={event => { setSettingsDirty(true); setSettingsState(event.target.value); }} autoComplete="address-level1" /></label><label className="wide"><span>Address <em>Optional</em></span><textarea value={settingsAddress} onChange={event => { setSettingsDirty(true); setSettingsAddress(event.target.value); }} maxLength={1000} rows={3} autoComplete="street-address" /></label></div><label className="member-preference-toggle"><input type="checkbox" checked={foundationUpdatesOptIn} onChange={event => { setSettingsDirty(true); setFoundationUpdatesOptIn(event.target.checked); }} /><span><strong>Foundation updates</strong><small>Send me non-essential AASW programme and community updates. Important membership notices remain protected.</small></span></label><button disabled={updateProfileSettings.isPending}>{updateProfileSettings.isPending ? "Saving settings…" : "Save profile settings"}</button>{settingsDirty && <p className="member-unsaved-note" role="status">You have unsaved profile edits — they stay saved on this device until you press Save.</p>}</form></section><input ref={photoInput} className="member-photo-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { startPhotoUpload(event.target.files?.[0]); event.currentTarget.value = ""; }} /><div className="member-profile-actions"><button onClick={() => photoInput.current?.click()} disabled={uploadPhoto.isPending}><ImageUp size={16} />{uploadPhoto.isPending ? "Uploading…" : "Upload photo"}</button></div></>}
        {section === "membership" && <><SectionHeader title="My membership" subtitle="Membership status, validity, renewal timing and certificate" /><section className="member-membership-summary" aria-label="Membership overview"><article><span>CURRENT STATUS</span><strong>{active ? "Active member" : inGracePeriod ? "Renewal grace period" : "Renewal available"}</strong><small>{active ? "Your member services and certificate remain available." : inGracePeriod ? `${graceRemaining} day${graceRemaining === 1 ? "" : "s"} of protected renewal access remain.` : "Your annual term has ended; you can now renew."}</small></article><article><span>VALID THROUGH</span><strong>{expires ? formatIndianDate(profile.data.expiresOn!) : "Lifetime"}</strong><small>{expires ? `${remaining} day${remaining === 1 ? "" : "s"} remaining in the current term.` : "No renewal date applies to lifetime membership."}</small></article><article><span>RENEWAL HISTORY</span><strong>{membershipHistory.data?.length ?? 0} cycle{membershipHistory.data?.length === 1 ? "" : "s"}</strong><button type="button" onClick={() => setSection("history")}>View history <ArrowUpRight size={14} /></button></article></section>{expires && <section className={`member-term-progress ${expiryTone}`} aria-label={`${elapsed}% of your current membership term has elapsed`}><div className="member-term-progress-heading"><div><span>MEMBERSHIP TERM PROGRESS</span><strong>{elapsed}% elapsed</strong><small>{remaining} day{remaining === 1 ? "" : "s"} remaining in the current term</small></div>{isTermRenewalUrgent && <div className="member-term-urgency-actions"><Tooltip><TooltipTrigger asChild><button type="button" className="member-term-renew-now" onClick={() => notifyInfo("Renewal opens after your current term", `Your membership remains protected through ${formatIndianDate(profile.data.expiresOn!)}. Secure online renewal opens on ${formatIndianDate(renewalEligibleOn!)}.`)}>Renew Now <ArrowUpRight size={15} /></button></TooltipTrigger><TooltipContent side="top">Early renewal is protected. Your secure renewal opens on {formatIndianDate(renewalEligibleOn!)}.</TooltipContent></Tooltip><button type="button" className="member-term-benefits-link" onClick={() => setRenewalBenefitsOpen(true)}>Benefits of renewing</button></div>}</div><div className="member-term-progress-track-wrap"><div className="member-term-progress-track" role="progressbar" tabIndex={0} aria-describedby="member-term-progress-exact-time" aria-valuemin={0} aria-valuemax={100} aria-valuenow={elapsed} aria-valuetext={`${elapsed}% elapsed; ${exactExpiryTimeRemaining?.label ?? `${remaining} days remaining`}`}><i style={{ width: `${elapsed}%` }} /></div><span id="member-term-progress-exact-time" className="member-term-progress-tooltip" role="tooltip" aria-live="polite">Live countdown: {exactExpiryTimeRemaining?.label}</span></div><div className="member-term-progress-dates"><span>Started {formatIndianDate(profile.data.joiningDate)}</span><span>Ends {formatIndianDate(profile.data.expiresOn!)}</span></div></section>}<section className={`member-expiry-countdown ${expiryTone}`} aria-label={!expires ? "Lifetime membership has no expiry date" : active ? `Renewal opens on ${formatIndianDate(renewalEligibleOn!)} in ${daysUntilRenewalEligible} days` : inGracePeriod ? `${graceRemaining} days remaining in membership renewal grace period` : "Membership renewal is available"}><span>{active && expires ? "EARLY RENEWAL" : inGracePeriod ? "RENEWAL GRACE PERIOD" : "MEMBERSHIP COUNTDOWN"}</span><strong>{!expires ? "Lifetime member" : active ? `Renewal opens ${formatIndianDate(renewalEligibleOn!)}` : inGracePeriod ? `${graceRemaining} day${graceRemaining === 1 ? "" : "s"} to renew` : "Renewal is available"}</strong><p>{!expires ? "Your membership does not have an expiry date." : active ? `Your annual membership remains active through ${formatIndianDate(profile.data.expiresOn!)}. To protect your current term, online renewal opens on ${formatIndianDate(renewalEligibleOn!)} — ${daysUntilRenewalEligible} day${daysUntilRenewalEligible === 1 ? "" : "s"} from now.` : inGracePeriod ? `Your annual term ended on ${formatIndianDate(profile.data.expiresOn!)}. Portal access remains available through ${formatIndianDate(profile.data.graceEndsOn!)} so you can renew.` : "Your annual term has ended. Renew with the same email and exact PAN to keep your Member ID, profile and history."}</p>{active && expires && <button type="button" className="member-renew-link member-calendar-reminder" onClick={addRenewalReminder}><CalendarPlus size={15} />Add to calendar</button>}{portalEnabled && profile.data.memberType === "annual" && !active && <a className="member-renew-link" href="/membership?renewal=annual">Renew Membership <ArrowUpRight size={15} /></a>}</section><dl className="member-info-grid"><Info label="Membership ID" value={profile.data.membershipNo} mono wide green /><Info label="Plan" value={profile.data.membershipTypeLabel} /><Info label="Status" value={active ? "● Active" : inGracePeriod ? "● Grace period" : "Expired"} pill={portalEnabled} /><Info label="Valid from" value={formatIndianDate(profile.data.joiningDate)} /><Info label="Valid through" value={expires ? formatIndianDate(profile.data.expiresOn!) : "Lifetime"} />{renewalEligibleOn && <Info label="Renewal eligible from" value={formatIndianDate(renewalEligibleOn)} />}{inGracePeriod && <Info label="Grace ends" value={formatIndianDate(profile.data.graceEndsOn!)} />}<Info label={inGracePeriod ? "Days to renew" : "Days remaining"} value={expires ? `${inGracePeriod ? graceRemaining : remaining} days` : "Not applicable"} /><div className="member-validity-card"><dt>Membership validity</dt>{expires ? <><div><i style={{ width: `${elapsed}%` }} /></div><dd>{inGracePeriod ? `Membership term ended · ${graceRemaining} days of renewal access remain` : `${elapsed}% elapsed · ${remaining} days remaining`}</dd></> : <dd>Lifetime membership</dd>}</div></dl><div className="member-profile-actions"><button onClick={download} className="primary"><Download size={16} />Download certificate</button><a href="/member/certificate"><Award size={16} />View certificate</a></div><Dialog open={renewalBenefitsOpen} onOpenChange={setRenewalBenefitsOpen}><DialogContent className="member-renewal-benefits-dialog"><DialogHeader><p>MEMBERSHIP RENEWAL</p><DialogTitle>Continue your membership benefits.</DialogTitle><DialogDescription>Renewal keeps your annual member access and the existing benefits listed for AASW membership.</DialogDescription></DialogHeader><ul>{renewalBenefits.map(benefit => <li key={benefit}><Check size={16} />{benefit}</li>)}</ul><p className="member-renewal-benefits-policy">Your current membership remains active through {formatIndianDate(profile.data.expiresOn!)}. Online renewal becomes available on {formatIndianDate(renewalEligibleOn!)}.</p><button type="button" onClick={() => setRenewalBenefitsOpen(false)}>Close</button></DialogContent></Dialog></>}
        {section === "history" && <><SectionHeader title="Membership & activity history" subtitle="Your own past membership terms, programme requests and support conversations" /><section className="member-history-overview"><div><p>PRIVATE MEMBER RECORD</p><h2>Your AASW journey, in one place.</h2><span>Only you and authorised Foundation administrators can view this history.</span></div><article><span>Membership cycles</span><strong><AnimatedCounter target={membershipHistory.data?.length ?? 0} durationMs={1100} /></strong></article><article><span>Programme requests</span><strong><AnimatedCounter target={serviceRequests.data?.length ?? 0} durationMs={1100} /></strong></article><article><span>Support messages</span><strong><AnimatedCounter target={supportMessages.data?.length ?? 0} durationMs={1100} /></strong></article><article><span>Payment receipts</span><strong><AnimatedCounter target={paymentReceipts.data?.length ?? 0} durationMs={1100} /></strong></article><article><span>Received from AASW</span><strong>₹{(payoutReceivedPaise / 100).toLocaleString("en-IN")}</strong></article></section><section className="member-history-stream" aria-labelledby="history-cycles"><h2 id="history-cycles">Membership cycles</h2>{membershipHistory.data?.length ? membershipHistory.data.map(cycle => <article key={`${cycle.cycleNumber}-${cycle.createdAt}`}><strong>Cycle {cycle.cycleNumber} · {cycle.membershipType === "lifetime" ? "Lifetime Membership" : "Annual Membership"}</strong><span className={`membership-cycle-${cycle.status}`}>{cycle.status}</span><p>{formatIndianDate(cycle.startsOn)}{cycle.expiresOn ? ` — ${formatIndianDate(cycle.expiresOn)}` : " — lifetime"}</p></article>) : <p className="member-service-empty">Your membership cycle will appear here.</p>}</section><section className="member-history-stream" aria-labelledby="history-activity"><h2 id="history-activity">Programme & support activity</h2>{serviceRequests.data?.map(request => <article key={request.requestRef}><strong>{memberServiceOptions.find(option => option.value === request.serviceType)?.label ?? serviceRequestLabel(request.serviceType)}</strong><span className={`status-${request.status}`}>{serviceRequestLabel(request.status)}</span><p>{formatIndianDate(request.createdAt)}{request.projectCode ? ` · Project ${request.projectCode}` : ""}{request.adminNote ? ` · Foundation update: ${request.adminNote}` : ""}</p></article>)}{supportMessages.data?.map(message => <article key={message.messageRef}><strong>Support conversation</strong><span className={`status-${message.status}`}>{serviceRequestLabel(message.status)}</span><p>{formatIndianDate(message.createdAt)} · {message.adminReply ? "Foundation replied" : "Awaiting Foundation response"}</p></article>)}{!serviceRequests.data?.length && !supportMessages.data?.length && <p className="member-service-empty">Your programme requests and support conversations will appear here.</p>}</section><section className="member-history-stream" aria-labelledby="history-receipts"><h2 id="history-receipts">Payment receipts</h2>{paymentReceipts.data?.length ? paymentReceipts.data.map(receipt => <article key={receipt.receipt}><strong>{receipt.receipt} · {formatIndianDate(receipt.createdAt)}</strong><span className={`status-${receipt.status === "refunded" ? "closed" : receipt.status}`}>{receipt.status}</span><p>{receipt.kind === "membership" ? "Membership contribution" : receipt.kind === "payout" ? "Programme payout" : "Donation"} · {receipt.kind === "payout" ? "Received from AASW Foundation" : "Paid to AASW Foundation"} · ₹{receipt.amount / 100}{receipt.kind === "payout" && programmeTitle(receipt.programme) ? ` · ${programmeTitle(receipt.programme)}` : ""}{receipt.kind === "payout" && receipt.payoutDestination ? ` · ${receipt.payoutDestination}` : ""}</p>{receipt.status !== "refunded" && <button type="button" className="member-receipt-download" onClick={() => downloadMemberPaymentReceiptPdf({ receipt: receipt.receipt, kind: receipt.kind, amount: receipt.amount, currency: receipt.currency, status: receipt.status, supporterName: profile.data?.fullName ?? "", createdAt: receipt.createdAt, payoutMethod: receipt.kind === "payout" ? receipt.payoutMethod ?? null : undefined, payoutDestination: receipt.kind === "payout" ? receipt.payoutDestination ?? null : undefined, programme: receipt.kind === "payout" ? programmeTitle(receipt.programme) : undefined, gatewayPaymentId: receipt.kind === "payout" ? receipt.gatewayPaymentId : undefined })}><Download size={14} />Download receipt PDF</button>}</article>) : <p className="member-service-empty">Your verified payment receipts will appear here. Receipts are issued only for server-verified payments.</p>}</section></>}
        {section === "services" && <><SectionHeader title="My services" subtitle="Use your active member services or request support through an AASW programme" /><div className="member-service-grid"><Service icon={FolderKanban} title="My projects" text="View assigned projects" tag={`${projects.data?.length ?? 0} assigned`} tone="green" onClick={() => window.location.assign("/member/projects")} /><Service icon={Award} title="Certificate" text="Download membership PDF" tag="Ready" tone="green" onClick={download} /><Service icon={Sprout} title="Join a service" text="Request programme support" tag="Apply" tone="orange" onClick={() => serviceSelect.current?.focus()} /><Service icon={Mail} title="Support" text="Chat with admin" tag={unseenSupportReplies.length ? `${unseenSupportReplies.length} new repl${unseenSupportReplies.length === 1 ? "y" : "ies"}` : "Help"} tone={unseenSupportReplies.length ? "blue" : "gray"} onClick={() => { setSupportOpen(true); const now = new Date(); setRepliesSeenAt(now); localStorage.setItem("member_support_replies_seen", String(now.getTime())); }} /></div><section className="member-service-request-panel" aria-labelledby="join-service-heading"><div><p>MEMBER PROGRAMME REQUEST</p><h2 id="join-service-heading">Join a service that fits your next step.</h2><span>Choose from AASW’s published programme areas. Tap any programme card to see what it involves, how it works and how the payout reaches you. Your request is private to your member account and the authorised Foundation team.</span></div>{projectOptions.length > 0 && <section aria-label="AASW live projects" className="member-live-projects"><p>LIVE PROJECTS ON YOUR ACCOUNT</p><div className="member-programme-grid" role="list" aria-label="Projects assigned to your member account">{projectOptions.map(project => <article key={project.projectId} role="listitem" className="member-programme-card"><FolderKanban size={20} aria-hidden="true" /><strong>{project.projectCode} · {project.projectName}</strong><span>{project.projectStatus.replaceAll("_", " ")}</span></article>)}</div></section>}<div className="member-programme-grid" role="list" aria-label="Programme areas — select a card for full details">{memberServiceOptions.map(option => { const ProgrammeIcon = option.icon; return <button key={option.value} type="button" role="listitem" className={`member-programme-card${selectedService === option.value ? " selected" : ""}`} onClick={() => setProgrammeDetail(option.value)} aria-haspopup="dialog" title={`View full details for ${option.label}`}><ProgrammeIcon size={20} aria-hidden="true" /><strong>{option.label}</strong><span>{option.summary}</span><em>View details &amp; payout<ArrowUpRight size={13} aria-hidden="true" /></em></button>; })}</div><form onSubmit={submitServiceRequest}><label><span>Programme area</span><select ref={serviceSelect} value={selectedService} onChange={event => setSelectedService(event.target.value as MemberServiceType)}>{memberServiceOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><p className="member-service-option-summary">{memberServiceOptions.find(option => option.value === selectedService)?.summary}</p><label><span>AASW project <em>Optional</em></span><select value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)} aria-label="Link this request to an AASW project">{projectOptions.length ? <><option value="none">General request — no specific project</option>{projectOptions.map(project => <option key={project.projectId} value={String(project.projectId)}>{project.projectCode} · {project.projectName}</option>)}</> : <option value="none">No live projects on your account yet</option>}</select></label><p className="member-service-option-summary">{selectedProjectId !== "none" ? `Your request will reach the Foundation team with project ${projectOptions.find(project => String(project.projectId) === selectedProjectId)?.projectCode} attached.` : "Leave this as General request if you do not want to target a specific project."}</p><label><span>How can AASW support you? <em>Optional</em></span><textarea value={serviceMessage} onChange={event => setServiceMessage(event.target.value)} maxLength={1200} rows={4} placeholder="Share a short note about the support you are looking for." />{serviceMessage.trim() && <em className="member-draft-hint">Draft saved on this device</em>}</label><button disabled={joinService.isPending}>{joinService.isPending ? "Sending request…" : "Send service request"}</button></form></section>{programmeDetail && (() => { const option = memberServiceOptions.find(entry => entry.value === programmeDetail)!; const DetailIcon = option.icon; return <div className="member-support-dialog-backdrop" role="presentation" onMouseDown={() => setProgrammeDetail(null)}><section className="member-support-dialog member-programme-dialog" role="dialog" aria-modal="true" aria-labelledby="member-programme-dialog-title" onMouseDown={event => event.stopPropagation()}><header><div><p>PROGRAMME DETAILS</p><h2 id="member-programme-dialog-title">{option.label}</h2></div><button type="button" onClick={() => setProgrammeDetail(null)} aria-label="Close programme details"><X size={18} /></button></header><div className="member-programme-body"><p className="member-programme-tagline">{option.summary}</p><div className="member-programme-section"><h3>What you will do</h3><p>{option.details.what}</p></div><div className="member-programme-section"><h3>How it works</h3><ol className="member-programme-steps">{option.details.how.map((step, index) => <li key={step}><span aria-hidden="true">{index + 1}</span>{step}</li>)}</ol></div><div className="member-programme-section member-programme-payment"><h3>Payout &amp; payment</h3><p>{option.details.payment}</p><ul className="member-programme-facts"><li>Minimum verified payout is <strong>₹100</strong> — the Foundation approves the exact amount after checking your completion report, and it is visible to you before settlement.</li><li>You share your <strong>UPI id or bank account details</strong> with your completion report. They stay private to your portal and are never included in emails.</li><li>You receive an email update when the payout is <strong>approved</strong> and another when it is <strong>settled</strong>.</li><li>Your settlement <strong>receipt PDF</strong> is always available to download from Membership history.</li></ul></div></div><footer><button type="button" className="member-programme-cta" onClick={() => { setSelectedService(programmeDetail); setProgrammeDetail(null); serviceSelect.current?.scrollIntoView({ behavior: "smooth", block: "center" }); serviceSelect.current?.focus(); }}><DetailIcon size={15} aria-hidden="true" />Request this programme</button><small>Your request is reviewed privately by the authorised Foundation team.</small></footer></section></div>; })()}<section className="member-service-request-history" aria-labelledby="my-service-requests-heading"><div><h2 id="my-service-requests-heading">My service requests</h2><p>Track only requests submitted from your own member account.</p></div>{serviceRequests.data?.length ? <div>{serviceRequests.data.map(request => { const completion = completions.data?.find(entry => entry.requestRef === request.requestRef); return <article key={request.requestRef}><div><strong>{memberServiceOptions.find(option => option.value === request.serviceType)?.label ?? serviceRequestLabel(request.serviceType)}</strong><span>{formatIndianDate(request.createdAt)}</span></div><em className={`status-${request.status}`}>{serviceRequestLabel(request.status)}</em>{request.projectCode && <small>Project: {request.projectCode} · {request.projectName}</small>}{request.message && <p>{request.message}</p>}{request.adminNote && <small>Foundation update: {request.adminNote}</small>}{completion && <div className="member-completion-timeline" data-status={completion.status}><span>COMPLETION REPORT</span><ul><li data-done>Report submitted{completion.createdAt ? ` · ${formatIndianDate(completion.createdAt)}` : ""}</li><li data-done={completion.status !== "submitted"}>Foundation verification{completion.rejectionReason ? ` · rejected: ${completion.rejectionReason}` : completion.status === "submitted" ? " · under review" : ` · verified ${formatIndianDate(completion.verifiedAt ?? completion.updatedAt)}`}</li><li data-done={completion.status === "paid"}>{completion.status === "paid" ? `Payment settled · ${formatIndianDate(completion.paidAt ?? completion.updatedAt)}` : "Payment settlement"}</li></ul>{completion.status === "verified" && <div className="member-payout-details" role="status"><p>PAYMENT DETAILS</p><strong>₹{((completion.payoutAmount ?? 0) / 100).toLocaleString("en-IN")}</strong><span>via {completion.payoutMethod === "upi" ? "UPI transfer" : completion.payoutMethod === "bank_transfer" ? "Bank transfer" : "Foundation transfer"}{completion.payoutNote ? ` — ${completion.payoutNote}` : ""}</span><small>The Foundation is processing this payment to your registered account details.{completion.payoutUpiId ? ` Destination: UPI id ${completion.payoutUpiId}.` : completion.payoutAccountNumber ? ` Destination: bank account ${completion.payoutAccountNumber.replace(/.(?=.{4})/g, "•")}.` : ""}</small></div>}{completion.status === "paid" && <div className="member-payout-details paid"><p>PAYMENT SETTLED</p><strong>₹{((completion.payoutAmount ?? 0) / 100).toLocaleString("en-IN")}</strong><span>Reference {completion.payoutReference} · {formatIndianDate(completion.paidAt ?? completion.updatedAt)}</span><small className="member-payout-destination">{completion.payoutUpiId ? `Sent to your UPI id ${completion.payoutUpiId}` : completion.payoutAccountNumber ? `Sent to bank account ${completion.payoutAccountNumber.replace(/.(?=.{4})/g, "•")}` : "Sent to the account details you shared"}</small><button type="button" className="member-receipt-download" onClick={() => downloadMemberPaymentReceiptPdf({ receipt: completion.completionRef, kind: "payout", amount: completion.payoutAmount ?? 0, currency: "INR", status: "paid", supporterName: profile.data?.fullName ?? "", createdAt: completion.paidAt ?? completion.updatedAt, payoutMethod: completion.payoutMethod ?? null, payoutDestination: completion.payoutUpiId ? `UPI · ${completion.payoutUpiId}` : completion.payoutAccountNumber ? `Bank · ${completion.payoutAccountNumber.replace(/.(?=.{4})/g, "•")}` : null, programme: programmeTitle(serviceRequestLabel(request.serviceType)), gatewayPaymentId: completion.payoutReference })}><Download size={14} />Download payout receipt</button></div>}{completion.status === "rejected" && <button type="button" className="member-resubmit-completion" onClick={() => { setCompletionFor(request.requestRef); setCompletionDetails(""); setCompletionProofs([]); }}>Resubmit completion report</button>}</div>}{!completion && request.status === "accepted" && <div className="member-completion-cta"><button type="button" onClick={() => { setCompletionFor(request.requestRef); setCompletionDetails(""); setCompletionProofs([]); }}><Check size={15} />Submit completion report</button><span>Finished this programme? Share what you did with proof so the Foundation can verify and settle your payout.</span></div>}</article>; })}</div> : <p className="member-service-empty">You have not sent a service request yet.</p>}</section>{supportOpen && <div className="member-support-dialog-backdrop" role="presentation" onMouseDown={() => setSupportOpen(false)}><section className="member-support-dialog" role="dialog" aria-modal="true" aria-labelledby="member-support-dialog-title" onMouseDown={event => event.stopPropagation()}><header><div><p>PRIVATE MEMBER SUPPORT</p><h2 id="member-support-dialog-title">How can AASW help?</h2></div><button type="button" onClick={() => setSupportOpen(false)} aria-label="Close support chat"><X size={18} /></button></header><div className="member-support-thread" aria-live="polite">{supportMessages.data?.length ? supportMessages.data.map(message => <article key={message.messageRef}><div className="member-support-bubble member"><strong>You</strong><p>{message.message}</p><span>{formatIndianDate(message.createdAt)} · {serviceRequestLabel(message.status)}</span></div>{message.adminReply && <div className="member-support-bubble admin"><strong>AASW Foundation</strong><p>{message.adminReply}</p><span>{message.repliedAt ? formatIndianDate(message.repliedAt) : "Foundation reply"}</span></div>}</article>) : <p className="member-support-empty">Start a private conversation with the Foundation support team. Your message will appear only in your member portal and the authorised admin inbox.</p>}</div><form onSubmit={submitSupportMessage}><label><span>Write your message</span><textarea value={supportDraft} onChange={event => setSupportDraft(event.target.value)} maxLength={3000} rows={4} placeholder="Describe your question or concern here." autoFocus />{supportDraft.trim() && <em className="member-draft-hint">Draft saved on this device</em>}</label><button disabled={sendSupportMessage.isPending}>{sendSupportMessage.isPending ? "Sending…" : "Send message"}</button></form></section></div>}
{completionFor && <div className="member-support-dialog-backdrop" role="presentation" onMouseDown={() => setCompletionFor(null)}><section className="member-support-dialog member-completion-dialog" role="dialog" aria-modal="true" aria-labelledby="member-completion-dialog-title" onMouseDown={event => event.stopPropagation()}><header><div><p>PROGRAMME COMPLETION</p><h2 id="member-completion-dialog-title">What did you build?</h2></div><button type="button" onClick={() => setCompletionFor(null)} aria-label="Close completion report"><X size={18} /></button></header><form className="member-completion-form" onSubmit={submitCompletionReport}><label><span>Describe your completed work <em>required · min 30 characters</em></span><textarea value={completionDetails} onChange={event => setCompletionDetails(event.target.value)} maxLength={4000} rows={5} placeholder="Share what you did, the training you delivered, outcomes you achieved and anything the Foundation should know before verifying." autoFocus />{completionDetails.trim().length > 0 && completionDetails.trim().length < 30 && <em className="member-completion-warning">{30 - completionDetails.trim().length} more characters needed</em>}</label><label><span>Attach proof files <em>JPG, PNG, WebP or PDF · up to 6 files · 5 MB each</em></span><div className="member-completion-dropzone"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={event => { addCompletionProofs(event.target.files); event.currentTarget.value = ""; }} aria-label="Attach proof files" /><FileUp size={18} /><span>{completionProofs.length ? `${completionProofs.length} file${completionProofs.length === 1 ? "" : "s"} attached — click to add more` : "Click to attach images or PDFs of your work"}</span></div>{completionProofs.length > 0 && <ul className="member-completion-prooflist">{completionProofs.map((proof, index) => <li key={`${proof.originalName}-${index}`}><FileTypeIcon mimeType={proof.mimeType} /><span>{proof.originalName}</span><small>{(proof.fileSize / 1024).toFixed(0)} KB</small>{proof.uploading ? <em>Uploading…</em> : <button type="button" aria-label={`Remove ${proof.originalName}`} onClick={() => setCompletionProofs(previous => previous.filter((_, i) => i !== index))}><X size={14} /></button>}</li>)}</ul>}</label><label><span>Google Drive link <em>optional</em></span><input type="url" value={completionDriveLink} onChange={event => setCompletionDriveLink(event.target.value)} maxLength={500} placeholder="https://drive.google.com/…" autoComplete="off" /></label><div className="member-payout-fieldset"><span>Payout destination <em>required · where should the Foundation send your payment?</em></span><div className="member-payout-mode" role="radiogroup" aria-label="Payout method"><button type="button" className={payoutMode === "upi" ? "active" : ""} onClick={() => setPayoutMode("upi")} aria-pressed={payoutMode === "upi"}>UPI</button><button type="button" className={payoutMode === "bank" ? "active" : ""} onClick={() => setPayoutMode("bank")} aria-pressed={payoutMode === "bank"}>Bank transfer</button></div>{payoutMode === "upi" ? <input type="text" inputMode="email" value={payoutUpiId} onChange={event => setPayoutUpiId(event.target.value)} maxLength={120} placeholder="yourname@bank" autoComplete="off" aria-label="UPI id" /> : <div className="member-payout-bank"><input type="text" value={payoutAccountName} onChange={event => setPayoutAccountName(event.target.value)} maxLength={140} placeholder="Account holder name" autoComplete="off" aria-label="Account holder name" /><input type="text" inputMode="numeric" value={payoutAccountNumber} onChange={event => setPayoutAccountNumber(event.target.value.replace(/[^0-9]/g, ""))} maxLength={20} placeholder="Account number" autoComplete="off" aria-label="Bank account number" /><input type="text" value={payoutIfsc} onChange={event => setPayoutIfsc(event.target.value.toUpperCase())} maxLength={11} placeholder="IFSC code (e.g. HDFC0001234)" autoComplete="off" aria-label="Bank IFSC code" /></div>}</div><button disabled={submitCompletion.isPending || completionProofs.some(proof => proof.uploading)}>{submitCompletion.isPending ? "Submitting report…" : "Submit completion report"}</button></form></section></div>}</>}
        {section === "password" && <><SectionHeader title="Change password" subtitle="Update your account password securely" /><form className="member-password-form" onSubmit={submitPassword}><MemberInput label="Current password" value={currentPassword} onChange={setCurrentPassword} /><MemberInput label="New password" value={newPassword} onChange={setNewPassword} /><div className="member-password-strength" aria-label={`Password strength ${strength} of 4`}><div>{[1, 2, 3, 4].map(level => <i key={level} className={level <= strength ? `filled strength-${strength}` : ""} />)}</div><span>{["Weak", "Medium", "Strong", "Very strong"][Math.max(0, strength - 1)] || "Password strength"}</span></div><p>Min 8 characters, 1 uppercase, 1 number, 1 special character.</p><MemberInput label="Confirm new password" value={confirmation} onChange={setConfirmation} />{passwordError && <p className="member-password-error">{passwordError}</p>}<button disabled={changePassword.isPending}>{changePassword.isPending ? "Updating…" : "Update password"}</button><small><ShieldCheck size={14} />Passwords are stored securely and are never emailed by AASW Foundation.</small></form></>}
      </div></section>
    </div>
  </main>;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) { return <header className="member-section-heading"><h1>{title}</h1><p>{subtitle}</p></header>; }
function Info({ label, value, wide = false, mono = false, green = false, pill = false }: { label: string; value: string; wide?: boolean; mono?: boolean; green?: boolean; pill?: boolean }) { return <div className={`${wide ? "wide" : ""} ${mono ? "mono" : ""} ${green ? "green" : ""}`}><dt>{label}</dt><dd className={pill ? "member-status-pill" : ""}>{value}</dd></div>; }
function Service({ icon: IconComponent, title, text, tag, tone, onClick }: { icon: Icon; title: string; text: string; tag: string; tone: string; onClick: () => void }) { return <button className="member-service" onClick={onClick}><IconComponent size={22} /><strong>{title}</strong><span>{text}</span><em className={tone}>{tag}</em></button>; }

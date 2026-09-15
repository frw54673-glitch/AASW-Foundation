import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dashboardSource = readFileSync(resolve(process.cwd(), "client/src/pages/MemberAccessPages.tsx"), "utf8");
const sidebarSource = readFileSync(resolve(process.cwd(), "client/src/pages/MemberSidebarDashboard.tsx"), "utf8");
const sidebarStyles = readFileSync(resolve(process.cwd(), "client/src/pages/member-dashboard.css"), "utf8");
const membershipStyles = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const membershipFormSource = readFileSync(resolve(process.cwd(), "client/src/components/MembershipApplicationForm.tsx"), "utf8");

describe("member dashboard presentation", () => {
  it("keeps membership validity, assigned projects and a protected certificate entry in the active sidebar dashboard", () => {
    expect(sidebarSource).toContain("trpc.member.dashboard.useQuery");
    expect(sidebarSource).toContain("trpc.member.myProjects.useQuery");
    expect(sidebarSource).toContain("My membership");
    expect(sidebarSource).toContain("My services");
    expect(sidebarSource).toContain("/member/certificate");
    expect(sidebarSource).toContain("downloadMemberCertificatePdf");
    expect(sidebarSource).toContain("member_dashboard_active_section");
    expect(sidebarSource).toContain('title="My projects"');
    expect(sidebarSource).toContain('title="Certificate"');
    expect(sidebarSource).toContain('title="Join a service"');
    expect(sidebarSource).toContain('title="Support"');
    expect(sidebarSource).not.toContain("Coming soon");
    expect(sidebarSource).toContain("trpc.member.changePassword.useMutation");
  });

  it("retains the protected official certificate route and loading state used by the member portal", () => {
    expect(dashboardSource).toContain("officialCertificateTemplateUrl");
    expect(dashboardSource).toContain("MemberDashboardLoading");
    expect(dashboardSource).toContain("Loading your assigned projects…");
    expect(dashboardSource).toContain('aria-busy="true"');
  });

  it("adds a session-aware member account control to the main public-site header", () => {
    expect(homeSource).toContain("MemberHeaderAccount");
    expect(homeSource).toContain("mobile onNavigate={closeMenu}");
  });

  it("defines responsive compact sidebar and mobile bottom-tab behavior", () => {
    expect(sidebarStyles).toContain("@media (min-width: 769px) and (max-width: 1024px)");
    expect(sidebarStyles).toContain("@media (max-width: 768px)");
    expect(sidebarStyles).toContain("position: fixed");
    expect(sidebarStyles).toContain("grid-template-columns: repeat(4, 1fr)");
    expect(sidebarStyles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
  });

  it("moves the desktop expand-collapse control from the header to the upper sidebar identity area", () => {
    expect(sidebarSource).toContain("member-sidebar-identity-toggle");
    expect(sidebarSource).toContain('aria-label={collapsed ? "Expand member navigation" : "Collapse member navigation"}');
    expect(sidebarSource).not.toContain("member-sidebar-toggle");
    expect(sidebarStyles).toContain(".member-sidebar-identity-toggle");
  });

  it("restores a visible upper-left mobile hamburger that opens an accessible member-navigation drawer", () => {
    expect(sidebarSource).toContain("member-mobile-menu-trigger");
    expect(sidebarSource).toContain("Open member navigation");
    expect(sidebarSource).toContain("Close member navigation");
    expect(sidebarSource).toContain("mobileSidebarOpen");
    expect(sidebarSource).toContain('id="member-sidebar-navigation"');
    expect(sidebarStyles).toContain(".member-sidebar.mobile-open");
    expect(sidebarStyles).toContain(".member-sidebar-overlay");
  });

  it("renders the source-backed AASW Foundation Home presentation with clear programme and participation sections", () => {
    expect(sidebarSource).toContain("function FoundationHome()");
    expect(sidebarSource).toContain("Fueling women’s success through");
    expect(sidebarSource).toContain("Aapka Apna Social Welfare Foundation");
    expect(sidebarSource).toContain("Digital skill development");
    expect(sidebarSource).toContain("Green entrepreneurship");
    expect(sidebarSource).toContain("Mentorship & support");
    expect(sidebarSource).toContain("Support, volunteer or spread the word.");
    expect(sidebarSource).toContain('AnimatedCounter target={800} suffix="+"');
    expect(sidebarSource).toContain('AnimatedCounter target={300} suffix="+"');
    expect(sidebarSource).toContain('AnimatedCounter target={30} suffix="+"');
  });

  it("keeps the premium member Home responsive through semantic editorial layout hooks", () => {
    expect(sidebarStyles).toContain(".member-foundation-home");
    expect(sidebarStyles).toContain(".member-home-mast");
    expect(sidebarStyles).toContain(".member-home-pillar-grid");
    expect(sidebarStyles).toContain(".member-home-impact");
    expect(sidebarStyles).toContain(".member-home-connect");
    expect(sidebarStyles).toContain(".member-home-pillar.gold");
    expect(sidebarStyles).toContain("@media (max-width: 768px) { .member-foundation-home");
  });

  it("opens Discover AASW and programmes as dedicated protected member-portal detail views", () => {
    expect(appSource).toContain('path={"/member/discover"} component={MemberSidebarDashboard}');
    expect(appSource).toContain('path={"/member/programmes"} component={MemberSidebarDashboard}');
    expect(sidebarSource).toContain('href="/member/discover"');
    expect(sidebarSource).toContain('href="/member/programmes"');
    expect(sidebarSource).toContain("function DiscoverAaswDetail()");
    expect(sidebarSource).toContain("function ProgrammesDetail()");
    expect(sidebarSource).toContain("A Foundation built for practical agency.");
    expect(sidebarSource).toContain("Five connected ways to support women entrepreneurs.");
    expect(sidebarSource).toContain("Back to Member Home");
  });

  it("styles the two member detail views as responsive editorial pages", () => {
    expect(sidebarStyles).toContain(".member-detail-page");
    expect(sidebarStyles).toContain(".member-detail-intro");
    expect(sidebarStyles).toContain(".member-programme-detail-grid");
    expect(sidebarStyles).toContain(".member-detail-governance");
    expect(sidebarStyles).toContain(".member-programmes-closing");
  });

  it("adds reduced-motion-safe loading transitions and premium hover interactions to member detail pages", () => {
    expect(sidebarStyles).toContain("@keyframes member-detail-reveal");
    expect(sidebarStyles).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(sidebarStyles).toContain(".member-detail-page > *");
    expect(sidebarStyles).toContain(".member-programme-detail:hover");
    expect(sidebarStyles).toContain(".member-programme-detail:hover > div");
    expect(sidebarStyles).toContain(".member-detail-governance a:hover");
    expect(sidebarStyles).toContain(".member-programmes-closing a:hover");
    expect(sidebarStyles).toContain("@media (prefers-reduced-motion: reduce) { .member-detail-page > *");
  });

  it("shows a one-time, reduced-motion-safe AASW welcome reveal after successful member login", () => {
    expect(dashboardSource).toContain('sessionStorage.setItem("aasw_member_welcome_intro", "true")');
    expect(sidebarSource).toContain("function MemberLoginWelcome()");
    expect(sidebarSource).toContain("Welcome to");
    expect(sidebarSource).toContain("AASW Foundation.");
    expect(sidebarSource).toContain('sessionStorage.getItem("aasw_member_welcome_intro")');
    expect(sidebarSource).toContain("prefers-reduced-motion: reduce");
    expect(sidebarStyles).toContain(".member-login-welcome");
    expect(sidebarStyles).toContain(".member-login-welcome-flight");
    expect(sidebarStyles).toContain("@keyframes member-login-welcome-wipe");
    expect(sidebarStyles).toContain(".member-login-welcome-reveal { display: none; }");
  });

  it("extends the post-login experience with cinematic background motion and a staged dashboard reveal", () => {
    expect(sidebarSource).toContain("member-login-welcome-aurora");
    expect(sidebarSource).toContain("member-login-welcome-orbit orbit-one");
    expect(sidebarSource).toContain("setRevealDashboard(!reducedMotion)");
    expect(sidebarSource).toContain("member-login-dashboard-reveal");
    expect(sidebarStyles).toContain("@keyframes member-login-aurora");
    expect(sidebarStyles).toContain("@keyframes member-login-welcome-flight");
    expect(sidebarStyles).toContain("@keyframes member-login-dashboard-content");
    expect(sidebarStyles).toContain(".member-login-dashboard-reveal .member-sidebar-content");
    expect(sidebarStyles).toContain(".member-login-dashboard-reveal .member-sidebar-section > *");
    expect(sidebarStyles).toContain(".member-login-welcome-aurora");
  });

  it("adds accessible dashboard hover feedback and pointer parallax with device-safe fallbacks", () => {
    expect(sidebarSource).toContain("function MemberLoginWelcome()");
    expect(sidebarSource).toContain("onPointerMove={updateParallax}");
    expect(sidebarSource).toContain("--member-parallax-x-deep");
    expect(sidebarSource).toContain('event.pointerType === "touch"');
    expect(sidebarStyles).toContain(".member-sidebar nav button:hover");
    expect(sidebarStyles).toContain(".member-service:hover");
    expect(sidebarStyles).toContain(".member-service:focus-visible");
    expect(sidebarStyles).toContain(".member-info-grid > div:hover");
    expect(sidebarStyles).toContain(".member-login-welcome { --member-parallax-x");
    expect(sidebarStyles).toContain("@media (hover: none), (pointer: coarse), (prefers-reduced-motion: reduce)");
  });

  it("provides an expiry-aware renewal call-to-action that opens the secure renewal application context", () => {
    expect(sidebarSource).toContain('href="/membership?renewal=annual"');
    expect(sidebarSource).toContain("Renew Membership");
    expect(sidebarStyles).toContain(".member-renew-link");
    expect(membershipFormSource).toContain("isAnnualRenewalSearch(window.location.search)");
    expect(membershipFormSource).toContain("Renew with your");
    expect(membershipFormSource).toContain("same email address and exact PAN");
    expect(membershipFormSource).toContain("You are renewing your AASW membership.");
    expect(membershipFormSource).toContain("membershipSubmissionErrorMessage");
    expect(membershipFormSource).toContain("aria-busy={isSubmitting}");
    expect(membershipFormSource).toContain("RenewalTroubleshootingFaq");
    expect(membershipFormSource).toContain("Why does the form say my email address and PAN do not match?");
    expect(membershipFormSource).toContain('"Renew membership"');
  });

  it("adds a subtle, reduced-motion-safe renewal celebration only to renewal success", () => {
    expect(membershipFormSource).toContain("RenewalConfetti");
    expect(membershipFormSource).toContain("membership-renewal-success");
    expect(membershipStyles).toContain(".membership-renewal-confetti");
    expect(membershipStyles).toContain("@keyframes membership-confetti-fall");
    expect(membershipStyles).toContain(".membership-renewal-confetti i { animation: none; }");
  });

  it("explains the three-day renewal grace period without changing lifetime membership treatment", () => {
    expect(sidebarSource).toContain("RENEWAL GRACE PERIOD");
    expect(sidebarSource).toContain("Portal access remains available through");
    expect(sidebarSource).toContain("Days to renew");
    expect(sidebarStyles).toContain(".member-expiry-countdown.grace");
  });
});

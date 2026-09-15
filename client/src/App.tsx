// Design reminder: Human-first Civic Editorial — keep the public experience warm, legible and action-oriented.
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect, useRef } from "react";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { FloatingWhatsApp } from "./components/FloatingWhatsApp";
import { AssistantChat } from "./components/AssistantChat";
import { ReadingProgress, RevealController } from "./lib/reveal";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const AboutPage = lazy(() => import("./pages/InnerPages").then(module => ({ default: module.AboutPage })));
const DonatePage = lazy(() => import("./pages/InnerPages").then(module => ({ default: module.DonatePage })));
const GovernancePage = lazy(() => import("./pages/InnerPages").then(module => ({ default: module.GovernancePage })));
const MembershipPage = lazy(() => import("./pages/InnerPages").then(module => ({ default: module.MembershipPage })));
const PolicyPage = lazy(() => import("./pages/InnerPages").then(module => ({ default: module.PolicyPage })));
const ProgramsPage = lazy(() => import("./pages/InnerPages").then(module => ({ default: module.ProgramsPage })));
const ReportsPage = lazy(() => import("./pages/InnerPages").then(module => ({ default: module.ReportsPage })));
const StoriesPage = lazy(() => import("./pages/InnerPages").then(module => ({ default: module.StoriesPage })));
const TeamPage = lazy(() => import("./pages/InnerPages").then(module => ({ default: module.TeamPage })));
const UpdatesPage = lazy(() => import("./pages/InnerPages").then(module => ({ default: module.UpdatesPage })));
const DigitalSkillsPage = lazy(() => import("./pages/MegaMenuPages").then(module => ({ default: module.DigitalSkillsPage })));
const GreenEntrepreneurshipPage = lazy(() => import("./pages/MegaMenuPages").then(module => ({ default: module.GreenEntrepreneurshipPage })));
const MentorshipCommunityPage = lazy(() => import("./pages/MegaMenuPages").then(module => ({ default: module.MentorshipCommunityPage })));
const VisionMissionPage = lazy(() => import("./pages/MegaMenuPages").then(module => ({ default: module.VisionMissionPage })));
const WhatWeDoOverviewPage = lazy(() => import("./pages/MegaMenuPages").then(module => ({ default: module.WhatWeDoOverviewPage })));
const WhoWeAreOverviewPage = lazy(() => import("./pages/MegaMenuPages").then(module => ({ default: module.WhoWeAreOverviewPage })));
const VolunteerPage = lazy(() => import("./pages/VolunteerPage"));
const ThankYouPage = lazy(() => import("./pages/ThankYouPage").then(module => ({ default: module.ThankYouPage })));
const ContactUsPage = lazy(() => import("./pages/MediaContactPages").then(module => ({ default: module.ContactUsPage })));
const FieldGalleryPage = lazy(() => import("./pages/MediaContactPages").then(module => ({ default: module.FieldGalleryPage })));
const FaqPage = lazy(() => import("./pages/MediaContactPages").then(module => ({ default: module.FaqPage })));
const MediaCentrePage = lazy(() => import("./pages/MediaContactPages").then(module => ({ default: module.MediaCentrePage })));
const FoundationAdminPage = lazy(() => import("./pages/FoundationAdminPage").then(module => ({ default: module.FoundationAdminPage })));
const FoundationServiceRequestsPage = lazy(() => import("./pages/FoundationServiceRequestsPage").then(module => ({ default: module.FoundationServiceRequestsPage })));
const FoundationSupportInboxPage = lazy(() => import("./pages/FoundationSupportInboxPage").then(module => ({ default: module.FoundationSupportInboxPage })));
const MisProjectsPage = lazy(() => import("./pages/MisProjectsPage").then(module => ({ default: module.MisProjectsPage })));
const MisDeliveryPage = lazy(() => import("./pages/MisDeliveryPage").then(module => ({ default: module.MisDeliveryPage })));
const MisOperationsPage = lazy(() => import("./pages/MisOperationsPage").then(module => ({ default: module.MisOperationsPage })));
const MisGovernancePage = lazy(() => import("./pages/MisGovernancePage").then(module => ({ default: module.MisGovernancePage })));
const MisDashboardPage = lazy(() => import("./pages/MisDashboardPage").then(module => ({ default: module.MisDashboardPage })));
const MemberCertificatePage = lazy(() => import("./pages/MemberAccessPages").then(module => ({ default: module.MemberCertificatePage })));
const MemberEmailCertificatePage = lazy(() => import("./pages/MemberAccessPages").then(module => ({ default: module.MemberEmailCertificatePage })));
const MemberLoginPage = lazy(() => import("./pages/MemberAccessPages").then(module => ({ default: module.MemberLoginPage })));
const MemberResetPasswordPage = lazy(() => import("./pages/MemberAccessPages").then(module => ({ default: module.MemberResetPasswordPage })));
const MemberSetupPasswordPage = lazy(() => import("./pages/MemberAccessPages").then(module => ({ default: module.MemberSetupPasswordPage })));
const MemberSidebarDashboard = lazy(() => import("./pages/MemberSidebarDashboard").then(module => ({ default: module.MemberSidebarDashboard })));
const MemberAdminPage = lazy(() => import("./pages/MemberProjectPages").then(module => ({ default: module.MemberAdminPage })));

function RouteLoading() {
  return (
    <main className="route-loading" aria-live="polite" aria-busy="true">
      <div className="route-loading-card">
        <span className="route-loading-mark" aria-hidden="true"><i /></span>
        <p className="route-loading-kicker">AASW Foundation</p>
        <strong>Preparing your next page.</strong>
        <span className="route-loading-copy">Loading the Foundation experience…</span>
        <span className="route-loading-lines" aria-hidden="true"><i /><i /><i /></span>
      </div>
    </main>
  );
}

type RouteMetadata = { title: string; description: string };

const defaultRouteMetadata: RouteMetadata = {
  title: "AASW Foundation | NGO for Women Empowerment in Uttar Pradesh",
  description: "Fueling women's success through tech & enterprise — AASW Foundation is a registered NGO in Uttar Pradesh: 800+ women trained, 300+ businesses launched or scaled, 30+ eco-friendly projects across 5 districts.",
};

const routeMetadata: Record<string, RouteMetadata> = {
  "/about": { title: "About AASW Foundation | Purpose, people and public trust", description: "Learn about AASW Foundation’s purpose, approach, people and public commitment in Uttar Pradesh." },
  "/programs": { title: "AASW Foundation Programmes | Capability in practice", description: "Explore AASW Foundation programmes in digital capability, green enterprise, mentorship and community support." },
  "/team": { title: "Our Team | AASW Foundation", description: "Meet the source-backed leadership, advisory and training team behind AASW Foundation." },
  "/membership": { title: "Membership | AASW Foundation", description: "Apply for AASW Foundation membership and stay connected to practical support, learning and community." },
  "/volunteer": { title: "Volunteer | AASW Foundation", description: "Volunteer with AASW Foundation and support digital education, green entrepreneurship and community work in Uttar Pradesh." },
  "/donate": { title: "Donate | Support AASW Foundation", description: "Support AASW Foundation’s work with women through digital education, enterprise and community support." },
  "/contact": { title: "Contact AASW Foundation | Get in touch", description: "Contact AASW Foundation for programme questions, partnerships, membership, donations or support enquiries." },
  "/contact-us": { title: "Contact AASW Foundation | Get in touch", description: "Contact AASW Foundation for programme questions, partnerships, membership, donations or support enquiries." },
  "/faq": { title: "FAQ | AASW Foundation", description: "Frequently asked questions about AASW Foundation donations, membership, volunteering and transparency." },
  "/media-centre": { title: "Media Centre | AASW Foundation", description: "Read AASW Foundation updates, field notes and public information." },
  "/field-gallery": { title: "Field Gallery | AASW Foundation", description: "View Foundation-approved field photographs from AASW work and community activity." },
};

function setMetadata(selector: string, attribute: "name" | "property", content: string) {
  const element = document.querySelector<HTMLMetaElement>(selector) ?? document.head.appendChild(document.createElement("meta"));
  element.setAttribute(attribute, selector.includes("og:") ? selector.match(/og:[^"]+/)?.[0] ?? "og:title" : selector.match(/name="([^"]+)/)?.[1] ?? "description");
  element.content = content;
}

function RouteMetadataManager() {
  const [location] = useLocation();

  useEffect(() => {
    const path = location.split("?")[0]?.split("#")[0] || "/";
    const metadata = routeMetadata[path] ?? defaultRouteMetadata;
    const canonicalUrl = new URL(path, window.location.origin).toString();
    document.title = metadata.title;
    setMetadata('meta[name="description"]', "name", metadata.description);
    setMetadata('meta[property="og:title"]', "property", metadata.title);
    setMetadata('meta[property="og:description"]', "property", metadata.description);
    setMetadata('meta[property="og:url"]', "property", canonicalUrl);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]') ?? document.head.appendChild(document.createElement("link"));
    canonical.rel = "canonical";
    canonical.href = canonicalUrl;
  }, [location]);

  return null;
}

function Router() {
  const [location] = useLocation();
  const routeKey = location.split("?")[0]?.split("#")[0] || "/";
  // Drop the finished entrance animation so its lingering `transform` doesn't
  // become a containing block for position:fixed children (back-to-top etc.).
  const transitionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = transitionRef.current;
    if (!el) return;
    el.addEventListener("animationend", () => el.classList.add("route-page-settled"), { once: true });
    return () => el.classList.remove("route-page-settled");
  }, [routeKey]);

  // make sure to consider if you need authentication for certain routes
  return (
    <div className="route-page-transition" key={routeKey} ref={transitionRef}>
      <Suspense fallback={<RouteLoading />}>
        <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/about"} component={AboutPage} />
      <Route path={"/who-we-are"} component={WhoWeAreOverviewPage} />
      <Route path={"/vision-mission"} component={VisionMissionPage} />
      <Route path={"/what-we-do"} component={WhatWeDoOverviewPage} />
      <Route path={"/digital-skills"} component={DigitalSkillsPage} />
      <Route path={"/green-entrepreneurship"} component={GreenEntrepreneurshipPage} />
      <Route path={"/mentorship-community"} component={MentorshipCommunityPage} />
      <Route path={"/programs"} component={ProgramsPage} />
      <Route path={"/team"} component={TeamPage} />
      <Route path={"/reports"} component={ReportsPage} />
      <Route path={"/governance"} component={GovernancePage} />
      <Route path={"/stories"} component={StoriesPage} />
      <Route path={"/updates"} component={UpdatesPage} />
      <Route path={"/membership"} component={MembershipPage} />
      <Route path={"/volunteer"} component={VolunteerPage} />
      <Route path={"/media-centre"} component={MediaCentrePage} />
      <Route path={"/field-gallery"} component={FieldGalleryPage} />
      <Route path={"/contact"} component={ContactUsPage} />
      <Route path={"/contact-us"} component={ContactUsPage} />
      <Route path={"/faq"} component={FaqPage} />
      <Route path={"/member/login"} component={MemberLoginPage} />
      {/* Bare /member behaves like /member/dashboard — it is the portal entry
          members naturally type after signing in, not a 404. */}
      <Route path={"/member"} component={MemberSidebarDashboard} />
      <Route path={"/member/setup-password"} component={MemberSetupPasswordPage} />
      <Route path={"/member/reset-password"} component={MemberResetPasswordPage} />
      <Route path={"/member/dashboard"} component={MemberSidebarDashboard} />
      <Route path={"/member/projects"} component={MemberSidebarDashboard} />
      <Route path={"/member/discover"} component={MemberSidebarDashboard} />
      <Route path={"/member/programmes"} component={MemberSidebarDashboard} />
      {/* Sidebar sections are deep-linkable too — these land on the matching
          panel instead of the 404 page when typed or shared directly. */}
      <Route path={"/member/membership"} component={MemberSidebarDashboard} />
      <Route path={"/member/profile"} component={MemberSidebarDashboard} />
      <Route path={"/member/history"} component={MemberSidebarDashboard} />
      <Route path={"/member/services"} component={MemberSidebarDashboard} />
      <Route path={"/member/password"} component={MemberSidebarDashboard} />
      <Route path={"/member/email-certificate"} component={MemberEmailCertificatePage} />
      <Route path={"/member/certificate"} component={MemberCertificatePage} />
      <Route path={"/foundation-admin"} component={FoundationAdminPage} />
      <Route path={"/foundation-admin/members"} component={MemberAdminPage} />
      <Route path={"/foundation-admin/service-requests"} component={FoundationServiceRequestsPage} />
      <Route path={"/foundation-admin/support-inbox"} component={FoundationSupportInboxPage} />
      <Route path={"/mis/dashboard"} component={MisDashboardPage} />
      <Route path={"/mis/projects"} component={MisProjectsPage} />
      <Route path={"/mis/delivery"} component={MisDeliveryPage} />
      <Route path={"/mis/operations"} component={MisOperationsPage} />
      <Route path={"/mis/governance"} component={MisGovernancePage} />
      <Route path={"/donate"} component={DonatePage} />
      <Route path={"/thank-you"} component={ThankYouPage} />
      <Route path={"/privacy"}>{() => <PolicyPage type="privacy" />}</Route>
      <Route path={"/refund"}>{() => <PolicyPage type="refund" />}</Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
        <Route component={NotFound} />
        </Switch>
      </Suspense>
    </div>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster position="top-right" closeButton={false} />
          <ReadingProgress />
          <RouteMetadataManager />
          <Router />
          <RevealController />
          <FloatingWhatsApp />
          <AssistantChat />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

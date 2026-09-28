import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "frontend/src/App.tsx"), "utf8");
const notFoundSource = readFileSync(resolve(process.cwd(), "frontend/src/pages/NotFound.tsx"), "utf8");
const homeSource = readFileSync(resolve(process.cwd(), "frontend/src/pages/Home.tsx"), "utf8");
const innerShellSource = readFileSync(resolve(process.cwd(), "frontend/src/components/InnerPageShell.tsx"), "utf8");
const membershipFormSource = readFileSync(resolve(process.cwd(), "frontend/src/components/MembershipApplicationForm.tsx"), "utf8");
const renewalHelperSource = readFileSync(resolve(process.cwd(), "frontend/src/lib/membershipRenewal.ts"), "utf8");
const sharedStyles = readFileSync(resolve(process.cwd(), "frontend/src/index.css"), "utf8");

describe("public AASW visual polish", () => {
  it("keeps a direct contact alias inside the same branded contact experience", () => {
    expect(appSource).toContain('path={"/contact"} component={ContactUsPage}');
    expect(appSource).toContain('"/contact": { title: "Contact AASW Foundation | Get in touch"');
  });

  it("replaces the generic fallback with an AASW editorial not-found screen", () => {
    expect(notFoundSource).toContain("Sorry, we couldn’t");
    expect(notFoundSource).toContain("find this page.");
    expect(notFoundSource).toContain('href="/contact-us"');
    expect(notFoundSource).toContain("aasw-not-found");
    expect(notFoundSource).not.toContain("bg-gradient-to-br from-slate-50");
  });

  it("applies a consistent premium public identity with responsive and reduced-motion safeguards", () => {
    expect(sharedStyles).toContain(".site-header::after");
    expect(sharedStyles).toContain(".inner-hero-symbol::before");
    expect(sharedStyles).toContain(".team-section-header > div::before");
    expect(sharedStyles).toContain(".aasw-not-found-card");
    expect(sharedStyles).toContain(".site-header .brand-mark-wrap { width: 40px");
    expect(sharedStyles).toContain(".inner-hero-image:hover, .inner-hero-symbol:hover { transform: none; }");
  });

  it("keeps shared public content, cards, forms and footer on a responsive alignment rhythm", () => {
    expect(sharedStyles).toContain(".container { max-width: 1320px; padding-inline: clamp(1rem, 2.75vw, 2rem); }");
    expect(sharedStyles).toContain(".site-header .container, .inner-header-row { min-height: 78px; }");
    expect(sharedStyles).toContain(".section, .inner-section { padding-block: clamp(4.75rem, 8vw, 7.5rem); }");
    expect(sharedStyles).toContain(".story-card, .team-card, .get-in-touch-card, .transparency-card { height: 100%; }");
    expect(sharedStyles).toContain(".membership-application-form, .contact-inquiry-form { min-width: 0; }");
    expect(sharedStyles).toContain(".site-header .container, .inner-header-row { min-height: 68px; }");
  });

  it("provides accessible premium motion and an AASW route-loading state", () => {
    expect(appSource).toContain('className="route-page-transition" key={routeKey}');
    expect(appSource).toContain('className="route-loading-card"');
    expect(appSource).toContain("Preparing your next page.");
    expect(sharedStyles).toContain("@keyframes aasw-page-enter");
    expect(sharedStyles).toContain("@keyframes aasw-loader-pulse");
    expect(sharedStyles).toContain(".button:not(:disabled):hover");
    expect(sharedStyles).toContain(".story-card,.team-card,.get-in-touch-card");
    expect(sharedStyles).toContain(".route-page-transition, .route-loading-mark i, .route-loading-lines i::after { animation: none; }");
  });

  it("validates renewal identity fields while typing without claiming an account match prematurely", () => {
    expect(membershipFormSource).toContain("function RenewalInlineFeedback");
    expect(membershipFormSource).toContain("Email format looks ready. It will be checked securely against your member account when you submit.");
    expect(membershipFormSource).toContain("PAN format looks ready. Use the same PAN linked to your existing Member Portal.");
    expect(membershipFormSource).toContain('className={`member-renewal-inline-field ${renewalEmailState}`}');
    expect(membershipFormSource).toContain('className={`member-renewal-inline-field ${renewalPanState}`}');
    expect(sharedStyles).toContain(".member-renewal-inline-field.is-valid input");
  });

  it("normalizes typed and pasted PAN input into uppercase before live validation", () => {
    expect(renewalHelperSource).toContain("export function formatPanInput");
    expect(renewalHelperSource).toContain('value.replace(/\\s+/g, "").toUpperCase().slice(0, 10)');
    expect(membershipFormSource).toContain('formatPanInput(event.target.value)');
    expect(membershipFormSource).toContain('autoCapitalize="characters"');
    expect(membershipFormSource).toContain('spellCheck={false}');
  });

  it("shows a PAN check only for a fully valid format and keeps sensitive renewal data out of progress recovery", () => {
    expect(membershipFormSource).toContain("function renewalPanInlineError");
    expect(membershipFormSource).toContain("This 10-character PAN format is not valid. Use ABCDE1234F.");
    expect(membershipFormSource).toContain('className="member-renewal-input-check"');
    expect(membershipFormSource).toContain("window.sessionStorage.getItem(RENEWAL_PROGRESS_STORAGE_KEY)");
    expect(membershipFormSource).toContain("PAN and ID-proof files are never saved.");
    expect(membershipFormSource).not.toContain("panNumber: form.panNumber,");
    expect(membershipFormSource).not.toContain("idProofFile: form.idProofFile,");
    expect(sharedStyles).toContain(".member-renewal-input-check");
    expect(sharedStyles).toContain(".renewal-progress-note");
  });

  it("offers accessible renewal reset, PAN format help and a truthful post-success receipt", () => {
    expect(membershipFormSource).toContain("const clearRenewalForm");
    expect(membershipFormSource).toContain('window.sessionStorage.removeItem(RENEWAL_PROGRESS_STORAGE_KEY)');
    expect(membershipFormSource).toContain('idProofInputRef.current.value = ""');
    expect(membershipFormSource).toContain('aria-label="PAN format help"');
    expect(membershipFormSource).toContain("ABCDE1234F.");
    expect(membershipFormSource).toContain("downloadMembershipRenewalReceiptPdf");
    expect(membershipFormSource).toContain("Download renewal PDF receipt");
    expect(sharedStyles).toContain(".member-form-clear");
    expect(sharedStyles).toContain(".member-pan-tooltip");
  });

  it("makes renewal processing immediate and keeps success sharing free of a Membership ID", () => {
    expect(membershipFormSource).toContain('className="member-form-spinner"');
    expect(membershipFormSource).toContain('"Preparing ID proof"');
    expect(membershipFormSource).toContain("const copyMembershipId");
    expect(membershipFormSource).toContain('aria-label="Copy Membership ID"');
    expect(membershipFormSource).toContain("const shareRenewalStatus");
    expect(membershipFormSource).toContain("I have renewed my AASW Foundation membership and look forward to continuing the journey.");
    expect(membershipFormSource).toContain('const supportsWebShare = "share" in navigator');
    expect(membershipFormSource).not.toContain("I have renewed my AASW Foundation membership: ${membershipNo}");
    expect(sharedStyles).toContain(".member-submit-loader");
    expect(sharedStyles).toContain("@keyframes member-submit-spin");
    expect(sharedStyles).toContain(".membership-id-copy");
  });

  it("requires a privacy-safe final renewal review and supports a generic visual share badge", () => {
    expect(membershipFormSource).toContain("const [reviewOpen, setReviewOpen]");
    expect(membershipFormSource).toContain("setReviewOpen(true)");
    expect(membershipFormSource).toContain("const submitConfirmed");
    expect(membershipFormSource).toContain("PAN and the uploaded ID-proof file are not shown here.");
    expect(membershipFormSource).toContain("Your exact PAN and private ID proof stay out of this review panel.");
    expect(membershipFormSource).toContain("createMembershipRenewalShareBadgeFile");
    expect(membershipFormSource).toContain("Download share badge");
    expect(membershipFormSource).toContain("files: [badge]");
    expect(sharedStyles).toContain(".renewal-review-dialog");
    expect(sharedStyles).toContain(".renewal-review-list");
  });

  it("uses a reduced-motion-safe modal entrance and returns edit focus to the renewal form", () => {
    expect(membershipFormSource).toContain("const returnToFormDetails");
    expect(membershipFormSource).toContain("formStartRef.current?.focus()");
    expect(membershipFormSource).toContain("className=\"renewal-review-edit\"");
    expect(membershipFormSource).toContain("<PencilLine size={15} />Edit details");
    expect(sharedStyles).toContain(".renewal-review-dialog[data-state=\"open\"]");
    expect(sharedStyles).toContain("@keyframes renewal-review-modal-enter");
  });

  it("keeps the final review readable and only dismissible while confirmation is idle", () => {
    expect(membershipFormSource).toContain('const [confirmationProgress, setConfirmationProgress]');
    expect(membershipFormSource).toContain('confirmationProgress === "processing"');
    expect(membershipFormSource).toContain('confirmationProgress === "confirmed"');
    expect(membershipFormSource).toContain('const modalProcessing = isSubmitting || confirmationProgress !== "idle"');
    expect(membershipFormSource).toContain('onPointerDownOutside={(event) => { if (modalProcessing) event.preventDefault(); }}');
    expect(membershipFormSource).toContain('onEscapeKeyDown={(event) => { if (modalProcessing) event.preventDefault(); }}');
    expect(membershipFormSource).toContain('className="renewal-review-list renewal-review-list-grid"');
    expect(membershipFormSource).toContain('Details confirmed');
    expect(sharedStyles).toContain('.renewal-review-confirm[aria-busy="true"]');
  });

  it("uses the same scroll-aware sticky glass header in public and inner page shells", () => {
    expect(homeSource).toContain('const [headerScrolled, setHeaderScrolled] = useState(false);');
    expect(homeSource).toContain('className={`site-header ${headerScrolled ? "site-header-scrolled" : ""}`}');
    expect(innerShellSource).toContain('const [headerScrolled, setHeaderScrolled] = useState(false);');
    expect(innerShellSource).toContain('className={`site-header inner-header ${headerScrolled ? "site-header-scrolled" : ""}`}');
    expect(sharedStyles).toContain(".site-header.site-header-scrolled");
    expect(sharedStyles).toContain("backdrop-filter: blur(18px) saturate(1.2)");
  });
});

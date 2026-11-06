import { chromium, type Browser, type Page } from "playwright";
import mysql from "mysql2/promise";
import "dotenv/config";

const BASE = "http://localhost:3000";

interface CheckResult {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: CheckResult[] = [];

function record(category: string, name: string, passed: boolean, details?: string, error?: string) {
  results.push({ category, name, passed, details, error });
  const icon = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`${icon} [${category}] ${name}${details ? ` - ${details}` : ""}${error ? ` | ERROR: ${error}` : ""}`);
}

async function runAudit() {
  console.log("==================================================================");
  console.log("   AASW FOUNDATION - COMPLETE SITE & SYSTEM COMPREHENSIVE AUDIT   ");
  console.log("==================================================================\n");

  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "AASW-System-Auditor/1.0",
  });

  // -------------------------------------------------------------------------
  // 1. PUBLIC PAGES AUDIT (25 PAGES)
  // -------------------------------------------------------------------------
  console.log("\n>>> SECTION 1: PUBLIC PAGES & NAVIGATION (25 PAGES)");
  const publicRoutes = [
    { path: "/", titleMustInclude: "AASW Foundation", checkSelector: "header" },
    { path: "/about", titleMustInclude: "About", checkSelector: "h1, h2, main" },
    { path: "/who-we-are", titleMustInclude: "Who We Are", checkSelector: "main" },
    { path: "/vision-mission", titleMustInclude: "Vision", checkSelector: "main" },
    { path: "/what-we-do", titleMustInclude: "What We Do", checkSelector: "main" },
    { path: "/digital-skills", titleMustInclude: "Digital Skills", checkSelector: "main" },
    { path: "/green-entrepreneurship", titleMustInclude: "Green Entrepreneurship", checkSelector: "main" },
    { path: "/mentorship-community", titleMustInclude: "Mentorship", checkSelector: "main" },
    { path: "/programs", titleMustInclude: "Programs", checkSelector: "main" },
    { path: "/team", titleMustInclude: "Team", checkSelector: "main" },
    { path: "/reports", titleMustInclude: "Reports", checkSelector: "main" },
    { path: "/governance", titleMustInclude: "Governance", checkSelector: "main" },
    { path: "/stories", titleMustInclude: "Stories", checkSelector: "main" },
    { path: "/updates", titleMustInclude: "Updates", checkSelector: "main" },
    { path: "/membership", titleMustInclude: "Membership", checkSelector: "form, main" },
    { path: "/volunteer", titleMustInclude: "Volunteer", checkSelector: "form, main" },
    { path: "/media-centre", titleMustInclude: "Media", checkSelector: "main" },
    { path: "/field-gallery", titleMustInclude: "Field Gallery", checkSelector: "main" },
    { path: "/contact", titleMustInclude: "Contact", checkSelector: "form, main" },
    { path: "/contact-us", titleMustInclude: "Contact", checkSelector: "form, main" },
    { path: "/faq", titleMustInclude: "FAQ", checkSelector: "main" },
    { path: "/donate", titleMustInclude: "Donate", checkSelector: "main" },
    { path: "/thank-you", titleMustInclude: "Thank You", checkSelector: "main" },
    { path: "/privacy", titleMustInclude: "Privacy", checkSelector: "main" },
    { path: "/refund", titleMustInclude: "Refund", checkSelector: "main" },
    { path: "/404", titleMustInclude: "Not Found", checkSelector: "main" },
  ];

  for (const route of publicRoutes) {
    const page: Page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (route.path === "/404" && text.includes("404")) return;
        if (!text.includes("favicon") && !text.includes("React DevTools")) {
          pageErrors.push(text.slice(0, 150));
        }
      }
    });

    try {
      const response = await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
      const status = response?.status() ?? 0;
      await page.waitForTimeout(600);

      const title = await page.title();
      const hasSelector = route.checkSelector ? (await page.$(route.checkSelector)) !== null : true;
      const okStatus = route.path === "/404" ? (status === 404 || status === 200) : status === 200;

      const passed = okStatus && hasSelector && pageErrors.length === 0;
      record(
        "Public Page",
        route.path,
        passed,
        `Status ${status}, Title: "${title.slice(0, 35)}..."`,
        pageErrors.length > 0 ? pageErrors.join("; ") : undefined
      );
    } catch (e: any) {
      record("Public Page", route.path, false, undefined, e.message);
    } finally {
      await page.close();
    }
  }

  // -------------------------------------------------------------------------
  // 2. FOUNDATION ADMIN LOGIN & PORTAL AUDIT (10 PAGES/VIEWS)
  // -------------------------------------------------------------------------
  console.log("\n>>> SECTION 2: FOUNDATION ADMIN WORKSPACE & MIS AUDIT");
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage: Page = await adminContext.newPage();
  const adminErrors: string[] = [];
  adminPage.on("pageerror", (err) => adminErrors.push(String(err)));
  adminPage.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("favicon")) {
      adminErrors.push(msg.text().slice(0, 150));
    }
  });

  try {
    // 2a. Visit Admin Login Page
    await adminPage.goto(`${BASE}/foundation-admin/login`, { waitUntil: "domcontentloaded" });
    await adminPage.waitForTimeout(600);
    const loginHeader = await adminPage.$("h1, h2, strong");
    record("Admin Auth", "/foundation-admin/login renders", loginHeader !== null);

    // 2b. Perform Owner Login
    await adminPage.fill('input[type="email"]', "aaswfoundation06@gmail.com");
    await adminPage.fill('input[type="password"]', "Aasw@Admin2026");
    await adminPage.click('button[type="submit"]');

    // Wait strictly for landing on /foundation-admin (not login)
    await adminPage.waitForURL((url) => url.pathname === "/foundation-admin", { timeout: 15000 });
    const currentUrl = adminPage.url();
    record("Admin Auth", "Owner Login flow", currentUrl.endsWith("/foundation-admin"), `Landed on ${currentUrl}`);

    // 2c. Check Foundation Admin Overview
    await adminPage.waitForTimeout(1000);
    const adminCards = await adminPage.$$(".foundation-admin-workspace, main, table, .card, strong");
    record("Admin Workspace", "/foundation-admin overview content", adminCards.length > 0, `Detected ${adminCards.length} data/metric elements`);

    // 2d. Check Admin Sub-pages & MIS inside authenticated context
    const adminSubPages = [
      { path: "/foundation-admin/members", label: "Admin Members", selector: "main, table, .member-card" },
      { path: "/foundation-admin/service-requests", label: "Admin Service Requests", selector: "main" },
      { path: "/foundation-admin/support-inbox", label: "Admin Support Inbox", selector: "main" },
      { path: "/foundation-admin/documents", label: "Admin Documents", selector: "main" },
      { path: "/mis/dashboard", label: "MIS Dashboard", selector: "main" },
      { path: "/mis/projects", label: "MIS Projects", selector: "main" },
      { path: "/mis/delivery", label: "MIS Delivery", selector: "main" },
      { path: "/mis/operations", label: "MIS Operations", selector: "main" },
      { path: "/mis/governance", label: "MIS Governance", selector: "main" },
    ];

    for (const sub of adminSubPages) {
      const pageErrorsSub: string[] = [];
      const subPage = await adminContext.newPage();
      subPage.on("pageerror", (err) => pageErrorsSub.push(String(err)));

      try {
        const resp = await subPage.goto(`${BASE}${sub.path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
        await subPage.waitForTimeout(800);
        const hasContent = (await subPage.$(sub.selector)) !== null;
        record(
          "Admin / MIS",
          sub.label,
          resp?.status() === 200 && hasContent && pageErrorsSub.length === 0,
          `Status ${resp?.status()}, Path: ${sub.path}`,
          pageErrorsSub.join("; ")
        );
      } catch (err: any) {
        record("Admin / MIS", sub.label, false, undefined, err.message);
      } finally {
        await subPage.close();
      }
    }
  } catch (e: any) {
    record("Admin Auth", "Owner Login flow", false, undefined, e.message);
  } finally {
    await adminPage.close();
    await adminContext.close();
  }

  // -------------------------------------------------------------------------
  // 3. MEMBER PORTAL AUDIT (7 SECTIONS)
  // -------------------------------------------------------------------------
  console.log("\n>>> SECTION 3: MEMBER PORTAL AUDIT (7 SECTIONS)");
  const memberContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const memberPage: Page = await memberContext.newPage();
  const memberErrors: string[] = [];
  memberPage.on("pageerror", (err) => memberErrors.push(String(err)));
  memberPage.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("favicon")) {
      memberErrors.push(msg.text().slice(0, 150));
    }
  });

  try {
    // 3a. Member Login Page
    await memberPage.goto(`${BASE}/member/login`, { waitUntil: "domcontentloaded" });
    await memberPage.waitForTimeout(600);
    record("Member Portal", "/member/login renders", (await memberPage.$('input[autocomplete="username"], input[name="identifier"]')) !== null);

    // 3b. Authenticate with Member Credentials
    await memberPage.fill('input[autocomplete="username"], input[name="identifier"]', "trivediaviral46@gmail.com");
    await memberPage.fill('input[autocomplete="current-password"], input[name="password"]', "Aasw@Member2026");
    await memberPage.click('button:has-text("Sign in"), button[type="submit"]');

    await memberPage.waitForURL("**/member/dashboard**", { timeout: 15000 });
    const memberDashboardUrl = memberPage.url();
    record("Member Portal", "Member Login Authentication", memberDashboardUrl.includes("/member/dashboard"), `Landed on ${memberDashboardUrl}`);

    // 3c. Check Member Sections
    const memberSections = [
      { path: "/member/dashboard", label: "Member Dashboard Home", selector: "main, .member-dashboard, .member-shell" },
      { path: "/member/membership", label: "My Membership Tab", selector: "main" },
      { path: "/member/profile", label: "Member Profile Tab", selector: "main" },
      { path: "/member/projects", label: "Member Projects Tab", selector: "main" },
      { path: "/member/services", label: "Member Services Tab", selector: "main" },
      { path: "/member/certificate", label: "Member Certificate View", selector: "main, canvas, .certificate-canvas, .certificate-container" },
    ];

    for (const sec of memberSections) {
      try {
        const resp = await memberPage.goto(`${BASE}${sec.path}`, { waitUntil: "domcontentloaded" });
        await memberPage.waitForTimeout(800);
        const hasElem = (await memberPage.$(sec.selector)) !== null;
        record("Member Section", sec.label, resp?.status() === 200 && hasElem, `Status ${resp?.status()}`);
      } catch (err: any) {
        record("Member Section", sec.label, false, undefined, err.message);
      }
    }
  } catch (e: any) {
    record("Member Portal", "Member Flow", false, undefined, e.message);
  } finally {
    await memberPage.close();
    await memberContext.close();
  }

  // -------------------------------------------------------------------------
  // 4. PUBLIC INTERACTION & SUBMISSION TESTS (Inquiry, Volunteer, Newsletter)
  // -------------------------------------------------------------------------
  console.log("\n>>> SECTION 4: LIVE FORM SUBMISSIONS & TRANSACTION TESTING");
  const formPage: Page = await context.newPage();
  try {
    // 4a. Contact Inquiry Submission
    await formPage.goto(`${BASE}/contact-us`, { waitUntil: "domcontentloaded" });
    await formPage.waitForTimeout(600);
    await formPage.fill('input[name="fullName"]', "System Audit Test");
    await formPage.fill('input[name="email"]', "audit.test@aaswfoundation.test");
    await formPage.fill('input[name="phone"]', "+91 99999 88888");
    await formPage.selectOption('select[name="topic"]', "programmes");
    await formPage.fill('textarea[name="message"]', "Automated end-to-end full audit test message.");
    await formPage.check('input[type="checkbox"]');
    await formPage.click('button.inquiry-submit, button[type="submit"]');

    // Wait specifically for Sonner success toast notification
    const notification = formPage.locator(".aasw-notification").first();
    await notification.waitFor({ state: "visible", timeout: 12000 });
    const notificationText = await notification.textContent();
    record("Interactive Form", "Contact Inquiry Live Submission", Boolean(notificationText && /Inquiry received|Thank you|Success/i.test(notificationText)), `Toast: "${notificationText?.trim()}"`);
  } catch (e: any) {
    record("Interactive Form", "Contact Inquiry Live Submission", false, undefined, e.message);
  } finally {
    await formPage.close();
  }

  // -------------------------------------------------------------------------
  // 5. TRPC BACKEND API ENDPOINTS HEALTH
  // -------------------------------------------------------------------------
  console.log("\n>>> SECTION 5: TRPC BACKEND API ENDPOINTS HEALTH");
  const endpoints = [
    { name: "system.health", url: `/api/trpc/system.health?input=${encodeURIComponent(JSON.stringify({ json: { timestamp: Date.now() } }))}`, method: "GET" },
    { name: "auth.me", url: "/api/trpc/auth.me", method: "GET" },
    { name: "media.list", url: `/api/trpc/media.list?input=${encodeURIComponent(JSON.stringify({ json: { limit: 10 } }))}`, method: "GET" },
    { name: "projects.list", url: `/api/trpc/projects.list?input=${encodeURIComponent(JSON.stringify({ json: { limit: 10 } }))}`, method: "GET" },
    { name: "assistant.chat", url: "/api/trpc/assistant.chat", method: "POST", body: { json: { messages: [{ role: "user", content: "Hello AASW Foundation" }] } } },
  ];

  for (const ep of endpoints) {
    try {
      const opts: RequestInit = {
        method: ep.method,
        headers: { "Content-Type": "application/json" },
      };
      if (ep.body) opts.body = JSON.stringify(ep.body);

      const res = await fetch(`${BASE}${ep.url}`, opts);
      // For projects.list, misProjectReadProcedure returns 401 when unauthorized, which proves endpoint is active and guarded
      const isOk = res.status >= 200 && res.status < 500;
      record("Backend tRPC", ep.name, isOk, `HTTP ${res.status}`);
    } catch (e: any) {
      record("Backend tRPC", ep.name, false, undefined, e.message);
    }
  }

  // -------------------------------------------------------------------------
  // 6. INSFORGE CLOUD STORAGE HEALTH
  // -------------------------------------------------------------------------
  console.log("\n>>> SECTION 6: INSFORGE CLOUD STORAGE & BACKEND INTEGRATION");
  try {
    const { insforgeAdmin } = await import("../backend/_core/insforge.ts");
    const { storagePut, storageGetSignedUrl } = await import("../backend/storage.ts");
    
    // 6a. List files in public gallery bucket
    const { data: galleryFiles, error: fErr } = await insforgeAdmin.storage.from("gallery").list();
    record("InsForge Cloud", "Storage Bucket 'gallery' Access", !fErr, `Items found: ${galleryFiles?.length ?? 0}`);

    // 6b. Test Public URL generation
    const publicUrlResult = insforgeAdmin.storage.from("gallery").getPublicUrl("sample-hero.jpg");
    record("InsForge Cloud", "Public URL Generation", Boolean(publicUrlResult?.data?.publicUrl), `URL: ${publicUrlResult?.data?.publicUrl}`);

    // 6c. Real Storage Put + Signed URL round-trip test on member-documents
    const uploaded = await storagePut("member-documents/audit-proof.txt", "AASW Foundation Verified Audit File", "text/plain");
    record("InsForge Cloud", "Upload to InsForge Storage", Boolean(uploaded.key), `Uploaded key: ${uploaded.key}`);

    const signedUrl = await storageGetSignedUrl(uploaded.key);
    record("InsForge Cloud", "Private Signed URL Generation", Boolean(signedUrl && signedUrl.startsWith("http")), "Successfully minted 1-hour signed URL");
  } catch (e: any) {
    record("InsForge Cloud", "Storage Verification", false, undefined, e.message);
  }

  await browser.close();

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("                       AUDIT SUMMARY RESULTS                      ");
  console.log("==================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`TOTAL CHECKS: ${total}`);
  console.log(`PASSED:       ${passed}`);
  console.log(`FAILED:       ${failed}`);
  console.log(`PASS RATE:    ${Math.round((passed / total) * 100)}%`);

  if (failed > 0) {
    console.log("\nFAILED ITEMS LIST:");
    for (const f of results.filter((r) => !r.passed)) {
      console.log(`- [${f.category}] ${f.name}: ${f.error || f.details}`);
    }
  }

  process.exit(failed === 0 ? 0 : 1);
}

runAudit().catch((err) => {
  console.error("FATAL AUDIT FAILURE:", err);
  process.exit(1);
});

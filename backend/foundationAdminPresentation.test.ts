import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const adminSource = readFileSync(resolve(process.cwd(), "frontend/src/pages/FoundationAdminPage.tsx"), "utf8");
const adminStyles = readFileSync(resolve(process.cwd(), "frontend/src/pages/foundation-admin.css"), "utf8");

describe("Foundation Admin presentation", () => {
  it("uses the protected workspace and preserves all existing management domains", () => {
    expect(adminSource).toContain("FoundationAdminPage");
    expect(adminSource).toContain("DashboardLayout");
    expect(adminSource).toContain("trpc.management.summary.useQuery");
    expect(adminSource).toContain("Membership applications");
    expect(adminSource).toContain("Contact inquiries");
    expect(adminSource).toContain("Field photo publishing");
    expect(adminSource).toContain("Future Google Drive photo sync");
  });

  it("adds a scoped aligned dashboard visual system without changing management procedures", () => {
    expect(adminSource).toContain('import "./foundation-admin.css"');
    expect(adminSource).toContain("foundation-admin-workspace");
    expect(adminSource).toContain("foundation-admin-summary-grid");
    expect(adminSource).toContain("foundation-admin-summary-card");
    expect(adminStyles).toContain(".foundation-admin-workspace > header");
    expect(adminStyles).toContain(".foundation-admin-summary-card");
    expect(adminStyles).toContain(".foundation-admin-workspace .admin-record-section");
    expect(adminStyles).toContain("@media (max-width: 768px)");
  });

  it("uses a Foundation-branded access gate instead of a generic dashboard sign-in screen", () => {
    expect(adminSource).toContain('import { startLogin } from "@/const"');
    expect(adminSource).toContain("foundation-admin-access-shell");
    expect(adminSource).toContain("Sign in to Foundation Admin");
    expect(adminSource).toContain("onClick={() => startLogin()}");
    expect(adminStyles).toContain(".foundation-admin-access-shell");
    expect(adminStyles).toContain(".foundation-admin-access-shell button:focus-visible");
  });

  it("keeps the admin interaction styling keyboard and reduced-motion considerate", () => {
    expect(adminStyles).toContain(".foundation-admin-workspace .admin-record-section select:focus");
    expect(adminStyles).toContain(".foundation-admin-workspace .admin-record-section button:not(:disabled):hover");
    expect(adminStyles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("surfaces only protected, low-sensitivity alerts with a read action", () => {
    expect(adminSource).toContain("trpc.management.alerts.list.useQuery");
    expect(adminSource).toContain("trpc.management.alerts.markRead.useMutation");
    expect(adminSource).toContain("Foundation alerts");
    expect(adminSource).toContain("Mark read");
    expect(adminSource).toContain("Private identity-document and payment data are not shown here.");
    // Completion-report alerts deep-link straight to the verification queue.
    expect(adminSource).toContain('alert.alertType === "completion_submitted"');
    expect(adminSource).toContain("Verify report");
  });
});

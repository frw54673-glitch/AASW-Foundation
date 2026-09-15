import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schemaSource = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const memberRouterSource = readFileSync(resolve(process.cwd(), "server/routers/member.ts"), "utf8");
const memberDbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const sidebarSource = readFileSync(resolve(process.cwd(), "client/src/pages/MemberSidebarDashboard.tsx"), "utf8");
const sidebarStyles = readFileSync(resolve(process.cwd(), "client/src/pages/member-dashboard.css"), "utf8");

describe("member profile photo and sidebar home presentation", () => {
  it("persists only photo references instead of image bytes on the member record", () => {
    expect(schemaSource).toContain('profilePhotoKey: varchar("profilePhotoKey"');
    expect(schemaSource).toContain('profilePhotoUrl: varchar("profilePhotoUrl"');
    expect(schemaSource).not.toContain('profilePhotoData');
    expect(memberDbSource).toContain("updateMemberProfilePhoto");
  });

  it("keeps photo upload member-scoped with image limits, byte signatures and managed storage", () => {
    expect(memberRouterSource).toContain("uploadProfilePhoto: memberProcedure");
    expect(memberRouterSource).toContain("MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024");
    expect(memberRouterSource).toContain('"image/jpeg", "image/png", "image/webp"');
    expect(memberRouterSource).toContain("The selected file does not match its image type.");
    expect(memberRouterSource).toContain("member-profile-photos/${member.membershipNo}");
    expect(memberRouterSource).toContain("updateMemberProfilePhoto(member.id, stored)");
    expect(memberRouterSource).toContain("storageGetSignedUrl(member.profilePhotoKey)");
    expect(memberRouterSource).toContain("storageGetSignedUrl(stored.key)");
  });

  it("adds source-backed AASW Home content, profile upload UI and persistent desktop/mobile navigation controls", () => {
    expect(sidebarSource).toContain('{ id: "home", label: "Home"');
    expect(sidebarSource).toContain("AASW is a human-centred organisation in Uttar Pradesh");
    expect(sidebarSource).toContain("Fueling women’s success through");
    expect(sidebarSource).toContain("member_dashboard_sidebar_collapsed");
    expect(sidebarSource).toContain("uploadProfilePhoto.useMutation");
    expect(sidebarSource).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(sidebarStyles).toContain(".member-sidebar.collapsed");
    expect(sidebarSource).toContain("member-mobile-menu-trigger");
    expect(sidebarStyles).toContain(".member-sidebar.mobile-open");
  });
});

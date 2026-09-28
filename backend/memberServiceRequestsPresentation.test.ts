import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(resolve(process.cwd(), "backend/drizzle/schema.ts"), "utf8");
const database = readFileSync(resolve(process.cwd(), "backend/db.ts"), "utf8");
const memberRouter = readFileSync(resolve(process.cwd(), "backend/routers/member.ts"), "utf8");
const managementRouter = readFileSync(resolve(process.cwd(), "backend/routers/management.ts"), "utf8");
const memberPortal = readFileSync(resolve(process.cwd(), "frontend/src/pages/MemberSidebarDashboard.tsx"), "utf8");
const memberStyles = readFileSync(resolve(process.cwd(), "frontend/src/pages/member-dashboard.css"), "utf8");
const adminWorkspace = readFileSync(resolve(process.cwd(), "frontend/src/pages/FoundationServiceRequestsPage.tsx"), "utf8");
const app = readFileSync(resolve(process.cwd(), "frontend/src/App.tsx"), "utf8");

describe("member service requests", () => {
  it("persists requests per member and official programme area without a lifetime block", () => {
    expect(schema).toContain('mysqlTable("member_service_requests"');
    // Repeat programme requests must stay possible after a request is
    // completed or closed — the memberId FK rides a plain index, and only an
    // in-flight request blocks a new one for the same programme area.
    expect(schema).toContain("member_service_requests_member_id_idx");
    expect(schema).not.toContain("member_service_requests_member_service_unique");
    expect(schema).toContain('references(() => members.id');
    expect(schema).toContain('"digital_skill_development"');
    expect(schema).toContain('"mentorship_business_support"');
  });

  it("keeps requests member-scoped and duplicate-safe on the server", () => {
    expect(database).toContain("createMemberServiceRequest");
    expect(database).toContain("memberServiceRequests.memberId, input.memberId");
    expect(database).toContain('inArray(memberServiceRequests.status, ["submitted", "reviewing", "accepted"])');
    expect(database).toContain("listMemberServiceRequests(memberId");
    expect(memberRouter).toContain("myServiceRequests: memberProcedure");
    expect(memberRouter).toContain("joinService: memberProcedure");
    expect(memberRouter).toContain('member.status !== "active"');
  });

  it("renders a real join form and private request history in the Member Portal", () => {
    expect(memberPortal).toContain("Join a service");
    expect(memberPortal).toContain("Send service request");
    expect(memberPortal).toContain("trpc.member.myServiceRequests.useQuery");
    expect(memberPortal).toContain("trpc.member.joinService.useMutation");
    expect(memberPortal).toContain("My service requests");
    expect(memberPortal).toContain("Foundation update:");
    expect(memberStyles).toContain(".member-service-request-panel");
    expect(memberStyles).toContain(".member-service-request-history");
  });

  it("provides an admin-only review procedure and route", () => {
    expect(managementRouter).toContain("serviceRequests: router");
    expect(managementRouter).toContain("updateMemberServiceRequestStatus");
    expect(adminWorkspace).toContain("user.role !== \"admin\"");
    expect(adminWorkspace).toContain("trpc.management.serviceRequests.list.useQuery");
    expect(adminWorkspace).toContain("trpc.management.serviceRequests.updateStatus.useMutation");
    expect(adminWorkspace).toContain("Programme requests.");
    expect(adminWorkspace).toContain("Support inbox");
    expect(adminWorkspace).toContain("Foundation update for this member");
    expect(adminWorkspace).toContain("Save status & update");
    expect(app).toContain('path={"/foundation-admin/service-requests"} component={FoundationServiceRequestsPage}');
  });
});

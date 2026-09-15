import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
const database = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const memberRouter = readFileSync(resolve(process.cwd(), "server/routers/member.ts"), "utf8");
const managementRouter = readFileSync(resolve(process.cwd(), "server/routers/management.ts"), "utf8");
const memberPortal = readFileSync(resolve(process.cwd(), "client/src/pages/MemberSidebarDashboard.tsx"), "utf8");
const memberStyles = readFileSync(resolve(process.cwd(), "client/src/pages/member-dashboard.css"), "utf8");
const adminInbox = readFileSync(resolve(process.cwd(), "client/src/pages/FoundationSupportInboxPage.tsx"), "utf8");
const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("member support chat", () => {
  it("stores private support messages against a member with a server-owned reply/status lifecycle", () => {
    expect(schema).toContain('mysqlTable("member_support_messages"');
    expect(schema).toContain('references(() => members.id');
    expect(schema).toContain('"responded"');
    expect(schema).toContain("adminReply");
    expect(database).toContain("listMemberSupportMessages(memberId");
    expect(database).toContain("respondToMemberSupportMessage");
  });

  it("keeps member send/history calls behind the isolated member session", () => {
    expect(memberRouter).toContain("mySupportMessages: memberProcedure");
    expect(memberRouter).toContain("sendSupportMessage: memberProcedure");
    expect(memberRouter).toContain("min(3, \"Please enter at least 3 characters.\")");
    expect(memberRouter).toContain("member.status !== \"active\"");
  });

  it("replaces the support mail action with an accessible private chat dialog", () => {
    expect(memberPortal).toContain('title="Support"');
    expect(memberPortal).toContain("Chat with admin");
    expect(memberPortal).toContain("member-support-dialog");
    expect(memberPortal).toContain("Send message");
    expect(memberPortal).toContain("trpc.member.mySupportMessages.useQuery");
    expect(memberPortal).toContain("trpc.member.sendSupportMessage.useMutation");
    expect(memberStyles).toContain(".member-support-dialog-backdrop");
    expect(memberStyles).toContain(".member-support-bubble.member");
    expect(memberStyles).toContain(".member-support-bubble.admin");
  });

  it("provides an admin-only support inbox with reply and status controls", () => {
    expect(managementRouter).toContain("supportMessages: router");
    expect(managementRouter).toContain("respondToMemberSupportMessage");
    expect(adminInbox).toContain('user.role !== "admin"');
    expect(adminInbox).toContain("trpc.management.supportMessages.list.useQuery");
    expect(adminInbox).toContain("trpc.management.supportMessages.respond.useMutation");
    expect(app).toContain('path={"/foundation-admin/support-inbox"} component={FoundationSupportInboxPage}');
  });
});

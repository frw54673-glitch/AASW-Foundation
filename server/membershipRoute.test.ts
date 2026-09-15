import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("membership page route identity", () => {
  it("identifies the Membership page as /membership rather than Donate in the shared shell", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/InnerPages.tsx"), "utf8");
    const membershipBlock = source.split("export function MembershipPage()")[1]?.split("export function DonatePage()")[0] ?? "";
    expect(membershipBlock).toContain('activePath="/membership"');
    expect(membershipBlock).not.toContain('activePath="/donate"');
  });
});

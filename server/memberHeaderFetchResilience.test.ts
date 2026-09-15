import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const memberHeaderSource = readFileSync(resolve(process.cwd(), "client/src/components/MemberHeaderAccount.tsx"), "utf8");

describe("Member header session fetch resilience", () => {
  it("retries transient network and preview HTML-response failures before treating the member session as unavailable", () => {
    expect(memberHeaderSource).toContain('error.message === "Failed to fetch"');
    expect(memberHeaderSource).toContain('error.message.includes("received HTML instead of JSON")');
    expect(memberHeaderSource).toContain('error.message.includes("Unexpected token \'<\'")');
    expect(memberHeaderSource).toContain("failureCount < 3");
    expect(memberHeaderSource).toContain("retryDelay: (attemptIndex: number) => Math.min(500 * 2 ** attemptIndex, 4_000)");
  });

  it("keeps the member account header fresh after a transient preview connection interruption", () => {
    expect(memberHeaderSource).toContain("staleTime: 30_000");
    expect(memberHeaderSource).toContain("refetchOnWindowFocus: true");
    expect(memberHeaderSource).toContain("trpc.member.me.useQuery(undefined, memberHeaderQueryOptions)");
  });
});

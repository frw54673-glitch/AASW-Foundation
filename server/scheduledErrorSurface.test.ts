import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const expirySource = readFileSync(resolve(process.cwd(), "server/scheduled/membershipExpiry.ts"), "utf8");
const reminderSource = readFileSync(resolve(process.cwd(), "server/scheduled/membershipReminder.ts"), "utf8");

describe("scheduled automation error surface", () => {
  it("keeps internal callback errors in server logs rather than exposing them to callers", () => {
    for (const source of [expirySource, reminderSource]) {
      expect(source).toContain("console.error(");
      expect(source).toContain("Review the protected automation log.");
      expect(source).not.toContain("context: { url: req.originalUrl");
      expect(source).not.toContain("timestamp: new Date().toISOString()");
    }
  });
});

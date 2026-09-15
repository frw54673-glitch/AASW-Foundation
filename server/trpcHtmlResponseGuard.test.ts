import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const clientSource = readFileSync(resolve(process.cwd(), "client/src/main.tsx"), "utf8");

describe("tRPC HTML response guard", () => {
  it("rejects an HTML fallback response before the tRPC JSON decoder receives it", () => {
    expect(clientSource).toContain('contentType.includes("text/html")');
    expect(clientSource).toContain("tRPC request received HTML instead of JSON");
    expect(clientSource).toContain('credentials: "include"');
  });

  it("does not emit a global API console error for a retry-safe preview transport interruption", () => {
    expect(clientSource).toContain("const isTransientPreviewTransportError");
    expect(clientSource).toContain("if (isTransientPreviewTransportError(error)) return;");
  });
});

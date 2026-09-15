import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const formSource = readFileSync(resolve(projectRoot, "client/src/components/ContactInquiryForm.tsx"), "utf8");
const stylesSource = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");

describe("Contact inquiry interaction experience", () => {
  it("exposes an accessible pending state and does not alter submission validation", () => {
    expect(formSource).toContain('aria-busy={submission.isPending}');
    expect(formSource).toContain('data-submitting={submission.isPending ? "true" : "false"}');
    expect(formSource).toContain('className="inquiry-submit-dots"');
    expect(formSource).toContain('if (Object.keys(nextErrors).length || !form.topic)');
  });

  it("adds hover, focus and reduced-motion-safe loading treatments", () => {
    expect(stylesSource).toContain('.inquiry-form-grid label:focus-within { transform:translateY(-2px); }');
    expect(stylesSource).toContain('.inquiry-submit:not(:disabled):hover { box-shadow:0 12px 28px');
    expect(stylesSource).toContain('@keyframes inquiry-dot-pulse');
    expect(stylesSource).toContain('.inquiry-spinner,.inquiry-submit-dots i { animation:none; }');
  });
});

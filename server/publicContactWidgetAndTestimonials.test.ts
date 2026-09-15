import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const widgetSource = readFileSync(resolve(root, "client/src/components/FloatingWhatsApp.tsx"), "utf8");
const homeSource = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const carouselSource = readFileSync(resolve(root, "client/src/components/TestimonialsCarousel.tsx"), "utf8");
const stylesSource = readFileSync(resolve(root, "client/src/index.css"), "utf8");

describe("public WhatsApp contact and testimonial integrity", () => {
  it("uses the shared verified WhatsApp contact and excludes private workspaces", () => {
    expect(widgetSource).toContain("AASW_CONTACT.whatsappHref");
    expect(widgetSource).toContain("/^(?:\\/member|\\/foundation-admin|\\/mis)(?:\\/|$)/");
    expect(widgetSource).toContain('target="_blank"');
  });

  it("keeps the homepage testimonial carousel empty until approved source content exists", () => {
    expect(homeSource).toContain("const approvedTestimonials: readonly ApprovedTestimonial[] = []");
    expect(homeSource).toContain("<TestimonialsCarousel testimonials={approvedTestimonials} />");
    expect(carouselSource).toContain("if (testimonials.length === 0) return null");
    expect(carouselSource).not.toContain("rating");
  });

  it("provides responsive motion treatments with a reduced-motion fallback", () => {
    expect(stylesSource).toContain(".floating-whatsapp { position:fixed");
    expect(stylesSource).toContain(".testimonial-track { display:flex; transition:transform 380ms");
    expect(stylesSource).toContain("@media (prefers-reduced-motion:reduce) { .floating-whatsapp,.testimonial-track");
  });
});

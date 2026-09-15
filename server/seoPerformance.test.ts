import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const documentSource = readFileSync(resolve(projectRoot, "client/index.html"), "utf8");
const appSource = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");
const homeSource = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");
const robotsSource = readFileSync(resolve(projectRoot, "client/public/robots.txt"), "utf8");
const serverSource = readFileSync(resolve(projectRoot, "server/_core/index.ts"), "utf8");
const sitemapSource = readFileSync(resolve(projectRoot, "server/_core/sitemap.ts"), "utf8");
const viteSource = readFileSync(resolve(projectRoot, "vite.config.ts"), "utf8");

describe("SEO and performance delivery", () => {
  it("provides crawl directives and social metadata in the document shell", () => {
    expect(documentSource).toContain('name="robots" content="index,follow"');
    expect(documentSource).toContain('property="og:title"');
    expect(documentSource).toContain('name="twitter:card" content="summary_large_image"');
    expect(documentSource).toContain('rel="canonical" href="https://www.aaswfoundation.com/"');
    expect(documentSource).toContain('property="og:url" content="https://www.aaswfoundation.com/"');
    expect(robotsSource).toContain("Sitemap: https://www.aaswfoundation.com/sitemap.xml");
  });

  it("updates canonical and descriptive metadata per route", () => {
    expect(appSource).toContain("function RouteMetadataManager()");
    expect(appSource).toContain('canonical.rel = "canonical"');
    expect(appSource).toContain("setMetadata('meta[property=\"og:url\"]', \"property\", canonicalUrl)");
    expect(appSource).toContain('"/contact-us": { title: "Contact AASW Foundation | Get in touch"');
  });

  it("prioritises the homepage LCP image and lazy-loads below-the-fold editorial photos", () => {
    expect(homeSource).toContain('fetchPriority="high" decoding="async"');
    expect(homeSource).toContain('loading="lazy" decoding="async"');
  });

  it("serves a public XML sitemap and separates large client-only dependencies from the route shell", () => {
    expect(serverSource).toContain('app.get("/sitemap.xml"');
    expect(sitemapSource).toContain('"/membership"');
    expect(sitemapSource).toContain('"/field-gallery"');
    expect(viteSource).toContain('return "vendor-pdf"');
    expect(viteSource).toContain('return "vendor-data"');
  });
});

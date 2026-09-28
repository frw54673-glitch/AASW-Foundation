const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/about",
  "/who-we-are",
  "/vision-mission",
  "/what-we-do",
  "/programs",
  "/digital-skills",
  "/green-entrepreneurship",
  "/mentorship-community",
  "/team",
  "/stories",
  "/updates",
  "/reports",
  "/governance",
  "/membership",
  "/donate",
  "/contact",
  "/volunteer",
  "/media-centre",
  "/field-gallery",
  "/faq",
  "/privacy",
  "/refund",
] as const;

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
}

export function buildPublicSitemap(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const urls = PUBLIC_SITEMAP_PATHS.map(path => `<url><loc>${escapeXml(`${normalizedBaseUrl}${path}`)}</loc></url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export function publicSiteOrigin({ protocol, host }: { protocol: string; host?: string }) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${protocol === "http" ? "http" : "https"}://${host || "localhost:3000"}`;
}

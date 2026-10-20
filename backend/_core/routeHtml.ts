import { getRouteMetadata, isNotFoundRoute, normalizeRoutePath } from "../../shared/publicRouteMetadata";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export function renderRouteHtml(template: string, requestPath: string, origin: string) {
  const pathname = normalizeRoutePath(requestPath);
  const metadata = getRouteMetadata(pathname);
  const canonicalUrl = new URL(pathname, `${origin.replace(/\/+$/, "")}/`).toString();
  const replacements: Array<[RegExp, string]> = [
    [/<title>[^<]*<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`],
    [/<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="description" content="${escapeHtml(metadata.description)}" />`],
    [/<meta\s+name="robots"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="robots" content="${metadata.indexable === false ? "noindex,follow" : "index,follow"}" />`],
    [/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`],
    [/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:description" content="${escapeHtml(metadata.description)}" />`],
    [/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`],
    [/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?\s*>/i, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`],
  ];

  return replacements.reduce((html, [pattern, replacement]) => html.replace(pattern, replacement), template);
}

export function routeHttpStatus(requestPath: string) {
  return isNotFoundRoute(requestPath) ? 404 : 200;
}

# AASW Foundation: Performance and Technical SEO Audit

**Audit date:** 24 August 2026  
**Scope:** Local development delivery, production build output, crawl assets, page metadata and source-level image/chunking controls.  
**Important limitation:** These measurements are from the managed local preview environment. They are useful engineering checks, but they are **not** published-domain Core Web Vitals. A production Lighthouse/PageSpeed run should be recorded only after publishing under the final canonical domain.

## Executive summary

The public site already uses route-level lazy loading, route-aware titles/descriptions, an LCP image priority hint and lazy image decoding below the fold. This audit found two genuine technical SEO gaps: the document shell did not contain a non-empty canonical/absolute Open Graph URL, and the crawler endpoint `/sitemap.xml` fell back to the SPA HTML response. Both have been corrected locally.

The production build is successful and source-level SEO/performance regression coverage passes. The largest remaining technical concern is the optional PDF-generation vendor bundle, which is intentionally deferred to Member Portal/certificate flows but remains large when that workflow is opened. The larger strategic SEO limitation is that route-specific metadata is applied client-side in this SPA; server-side rendering would be needed for a crawler to receive every route’s final title/description/canonical without executing JavaScript.

## Measured local delivery baseline

The following `curl` measurements were taken against the running local server before the sitemap correction. All public SPA routes returned the same application shell, as expected for a client-routed application.

| Route group | HTTP status | TTFB range | HTML shell size | Interpretation |
|---|---:|---:|---:|---|
| `/`, `/about`, `/programs`, `/team`, `/membership`, `/contact` | 200 | 7.2–10.6 ms | 369,232 bytes | Local server delivery is responsive; this is not a measure of client-side render, image or real-network performance. |
| `/robots.txt` | 200 | — | 23 bytes | Crawl policy was present before this audit. |
| `/sitemap.xml` before remediation | 200 | — | 369,232 bytes | This was the SPA fallback document, not valid sitemap XML. |

After remediation, `/sitemap.xml` returns `Content-Type: application/xml; charset=utf-8` with an XML URL set containing public institutional, programme, contact, membership, donation and gallery routes.

## Technical SEO findings and local remediation

| Area | Finding | Local status |
|---|---|---|
| Canonical URL | The static document included an empty canonical link before JavaScript ran. | **Fixed.** The document now supplies `https://www.aaswfoundation.com/`; route transitions continue to update canonical URLs client-side. |
| Open Graph sharing | The static social image and URL were relative or incomplete for non-JavaScript link preview consumers. | **Fixed.** The root document now includes absolute `og:url` and `og:image` values using the verified canonical domain. |
| Sitemap discovery | `/sitemap.xml` resolved to the SPA shell and robots did not advertise a sitemap. | **Fixed.** A server XML sitemap endpoint and robots sitemap directive are now present. |
| Crawl directives | The public site allows crawling and contains social/title/description metadata. | **Verified.** Existing crawl directives, Open Graph fields and Twitter card remain in place. |
| Per-route metadata | React updates title, description, OG data and canonical on route changes. | **Verified with limitation.** This is effective for normal browsers; SSR or prerendering is the future option for crawler-first per-route HTML. |
| Image delivery | The hero field image uses `fetchPriority="high"`; below-fold editorial images use lazy loading and asynchronous decoding. | **Verified.** Existing regression coverage remains in place. |

## Production-build observations

The revised production build completed successfully. Manual vendor chunk boundaries were added so large optional functionality is less likely to inflate the route shell. The most relevant emitted JavaScript sizes were:

| Emitted bundle | Minified size | Gzip size | Delivery interpretation |
|---|---:|---:|---|
| `vendor-react` | 403.54 kB | 119.81 kB | Shared application runtime; still the largest shared runtime chunk. |
| `vendor-data` | 101.23 kB | 28.27 kB | tRPC, query/cache and serialization support. |
| `vendor-icons` | 38.24 kB | 7.43 kB | Icon library chunk. |
| `InnerPages` | 278.87 kB | 38.71 kB | Lazy-loaded grouped public editorial pages. |
| `vendor-pdf` | 593.97 kB | 177.07 kB | Optional PDF/canvas functionality used by member certificate/renewal workflows, not a public-homepage requirement. |

The build still gives a size warning for the optional PDF bundle. Splitting `jspdf` and `html2canvas` further is possible, but it should be benchmarked against certificate and renewal usability because their joint load is purposeful when a member requests document generation.

## Publication-ready recommendations

| Priority | Owner or engineering action | Reason |
|---|---|---|
| High | Publish under `https://www.aaswfoundation.com/` or update `APP_URL` and the canonical-domain constants together before indexing. | Canonical, sitemap, link previews and outbound email links must agree on one public origin. |
| High | Submit the published sitemap to Google Search Console and verify the domain property. | Confirms crawler discovery and reports indexing/canonical problems. |
| High | Run Lighthouse/PageSpeed on the final public domain for homepage, programme, contact and membership routes on mobile. | Captures real CDN, image, font and device conditions rather than preview-network variability. |
| Medium | Adopt SSR/prerendering for public institutional pages when search discovery is a primary acquisition channel. | Ensures per-route metadata/content is delivered without JavaScript execution. |
| Medium | Measure member certificate/receipt loading separately before further PDF splitting. | The current PDF vendor is intentionally deferred but needs user-flow evidence before structural changes. |
| Medium | Activate GA4 only after the owner supplies an approved Measurement ID and consent approach. | Avoids adding unapproved tracking or sending inquiry/member data to analytics. |

## Validation

TypeScript completed without errors. The complete suite passed with **63 test files / 206 tests**, and the production build completed successfully. The XML sitemap endpoint was requested directly and returned HTTP `200` with `application/xml` content. No real member, inquiry, payment, analytics or external platform record was created, and no GitHub push was performed.

## References

[1] [AASW local audit measurements and production-build output](./aasw-seo-performance-audit-2026-08-24.md)  
[2] [Prior AASW SEO and performance audit](./aasw-seo-performance-audit-2026-08-20.md)

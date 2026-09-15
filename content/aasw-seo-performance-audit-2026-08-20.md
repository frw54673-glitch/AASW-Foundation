# AASW SEO, Performance and Contact Verification Audit

## Live verification baseline

- The owner-provided Contact Us map action resolves successfully through Google Maps to `26.492420, 79.899711` / `FVRX+XV8 Rura, Uttar Pradesh`; the live destination presents a Directions action and matches the owner-authorised Rura location.
- The Contact Us page renders its route-specific title, Helpdesk form with required full-name, email, phone, topic, message and consent controls, together with the verified office contact details and Open live map action.
- The form will be checked through client-side validation only unless the Foundation explicitly supplies authorised real inquiry text, so the audit does not create a fabricated customer-support record.

## Contact form validation safety

The live Contact Us form is a controlled React form: empty or malformed full name, email, phone, topic, message and consent values produce inline accessible errors and a warning notification before any `inquiry.submit` request is made. Its API regression coverage separately proves malformed data, missing consent and honeypot-filled input are rejected without creating an inquiry. Browser navigation reached the live page and rendered its form labels; no inquiry was submitted during this audit.

The running application was also called with a deliberately malformed tRPC inquiry payload. It returned HTTP `400` with the expected full-name, email, phone, message and consent validation errors, confirming the server rejects invalid traffic before persistence. No inquiry reference was created.

## Performance and SEO audit status

The preview baseline mobile Lighthouse run measured Performance `0.47`, SEO `0.92`, FCP `20.7 s`, LCP `37.8 s`, TBT `340 ms` and CLS `0.044`. The baseline preview showed an invalid robots response and no canonical URL. Preview-network speed is not an equivalent substitute for a published production measurement, but it usefully identified delivery issues that could be addressed safely.

The optimization adds valid public `robots.txt`, crawl and theme directives, social-preview metadata, route-aware titles/descriptions, client-set absolute canonical URLs and an SEO-safe Open Graph URL. The homepage LCP image is explicitly prioritised while below-the-fold editorial images are lazy-loaded and decoded asynchronously. Route-level lazy imports now defer the Member Portal, Foundation Admin, MIS and inner-page code into separate production chunks rather than making public homepage visitors download those workflows upfront.

The follow-up preview run measured FCP `12.9 s`, LCP `22.4 s`, TBT `500 ms` and CLS `0`; its raw Performance score varied to `0.43` because the remote preview network and run conditions are variable, while its SEO score reached `1.00`. The source and production build confirm that protected-route chunks are independently emitted. A final public-domain Lighthouse run after publication remains the appropriate source of production Core Web Vitals reporting.

## Final validation

The complete regression suite passes with `46` test files / `149` tests, TypeScript is clean and the production build succeeds. Public Homepage, Contact Us and Membership routes rendered correctly after lazy loading. The unauthenticated MIS entry correctly remained at its protected loading/sign-in boundary.

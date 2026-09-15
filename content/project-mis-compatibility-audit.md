# Project MIS Compatibility Audit

## Existing application baseline

The project is a **React 19, TypeScript, Vite, Express, tRPC, Drizzle and MySQL/TiDB** application. Public-facing AASW Foundation pages use the existing civic editorial design system, while authenticated Foundation operations use the reusable `DashboardLayout` shell. The MIS will be added under new protected management routes so that the public website, donation flow, membership application, contact inquiries, field gallery and payment lifecycle continue unchanged.

| Existing area | Current working capability | Preservation requirement |
| --- | --- | --- |
| Public website | Homepage; about, programmes, team, reports, media, contact, membership, donation, policy and thank-you routes | Keep all current URLs and navigation unchanged. |
| Membership | Validated public application, encrypted PAN, private ID-proof storage, Foundation notification and status tracking | Do not expose identity-proof objects or PAN in MIS summaries. |
| Donation and payments | Donation detail persistence, encrypted PAN, demo/live gateway lifecycle and receipt status records | Preserve server-owned gateway verification and immutable payment records. |
| Contact | Validated inquiry persistence, spam honeypot and Foundation notification | Retain public inquiry form and Foundation follow-up status workflow. |
| Field gallery | Curated official records plus protected upload, draft/publish/archive and display ordering | Reuse gallery media model; future Drive ingestion must use the same public-only publishing boundary. |
| Foundation workspace | Authenticated `/foundation-admin` route with protected record management APIs | Extend the existing dashboard shell; never expose MIS records on public routes. |

## Current data model

The live schema includes `users`, `payment_transactions`, `donation_intents`, `payment_webhook_events`, `membership_applications`, `contact_inquiries` and `gallery_media`. All Project MIS tables will be additive. The existing `users.role` enum currently distinguishes `user` and `admin`; it must be widened carefully so all existing owner-admin behavior continues while adding the requested MIS roles.

## Gap map against the MIS request

| Requested capability group | Current status | Extension path |
| --- | --- | --- |
| SDG catalog, Indian locale formatters, operational IDs and alert palette | Not centralized | Add shared MIS constants/utilities and reusable status components. |
| Project lifecycle, partners, objectives, target groups and activities | Not present | Add additive relational tables, project router and protected command-center screens. |
| Beneficiaries, field events, outputs, outcomes and targets | Not present | Add validated per-project records, duplicate checks and server calculations. |
| Team, budget, documents, monitoring, risks and reporting | Not present | Add protected module routers with role-aware actions and managed file references. |
| Impact, closure, audit and exports | Not present | Add closing checklist guard, audit rows and download/export procedures. |
| Dashboard analytics | Existing Foundation workspace only | Add a separate MIS dashboard using live database aggregates; public pages remain distinct. |

## Implementation constraints confirmed

All database changes must be additive and applied through reviewed Drizzle migrations. Public, payment and Foundation workflows will remain on their existing routes. New MIS workflows will use protected tRPC procedures, `DashboardLayout`, S3-backed file references and role checks on the server. No placeholder beneficiary, financial, event or outcome records will be inserted; the MIS will begin empty until authorized Foundation staff enters real operational data.

## Phase 1 visual regression note

Desktop verification confirms that the existing public Membership route continues to render its original content after the protected MIS route was introduced. The protected `/mis/projects` route remains behind the authenticated management layout and shows its existing loading state until a user session is available; it does not expose project data to public visitors.

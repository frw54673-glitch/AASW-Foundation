# AASW Foundation Member Portal — Step 1 Codebase Analysis

**Status:** Analysis only. No schema, authentication, route, dependency, or UI implementation changes have been made for the proposed member portal.

## FRAMEWORK

The existing application is a **React 19 + TypeScript** single-page application built by **Vite 7**, using **Wouter** for client-side routes, Tailwind CSS 4 and existing shadcn/Radix UI primitives. The public site uses the established Human-first Civic Editorial system; protected MIS pages use the existing `DashboardLayout` component.

## BACKEND

The backend is **Express 4** with **tRPC 11** mounted at `/api/trpc`. Application procedures are composed in `server/routers.ts`; raw Express is currently used only for framework OAuth, the Razorpay webhook and internal storage proxy. There are **no existing custom REST member-auth endpoints** such as `/api/auth/login` or `/api/member/*`.

## DATABASE

The application uses **MySQL/TiDB** through `mysql2` and **Drizzle ORM** (`drizzle-orm`). The canonical schema is `drizzle/schema.ts`; thirteen reviewed additive SQL migrations (`0000` through `0012`) exist in `drizzle/`. Primary keys are currently auto-incrementing integers, and the MIS project primary key is `projects.id`.

## AUTH (existing)

Authentication is **Manus OAuth-backed session authentication**, not email/password authentication. `/api/oauth/callback` creates a signed JWT session cookie. For every tRPC request, `server/_core/context.ts` calls `sdk.authenticateRequest`; that code verifies the signed session cookie or Bearer fallback, synchronizes the Manus user to `users`, and puts the user on `ctx.user`.

Current role controls are server-side tRPC procedure guards:

| Guard | Existing access |
| --- | --- |
| `protectedProcedure` | Any authenticated Manus user |
| `adminProcedure` | `users.role === "admin"` |
| `misProjectReadProcedure` | Admin, project manager, field staff, finance, monitoring, management |
| `misProjectWriteProcedure` | Admin, project manager |
| `misFieldProcedure` | Admin, project manager, field staff |
| `misMonitoringProcedure` | Admin, project manager, monitoring |
| `misFinanceProcedure` | Admin, finance |
| `misOperationsProcedure` | Admin, project manager, field staff, monitoring |

The proposed member email/password system must therefore **extend rather than replace** Manus OAuth. In particular, its proposed `super_admin`, `member`, and `volunteer` roles cannot be inserted into the existing `users.role` enum without an explicit compatibility design, because the MIS guard layer already relies on the current role values.

## EMAIL

**Nodemailer 9** is already installed and used for Foundation notifications and donation receipts. Current mail modules are:

| Module | Current purpose |
| --- | --- |
| `server/email/membershipNotification.ts` | Sends a Foundation inbox alert for a submitted public membership application |
| `server/email/inquiryNotification.ts` | Sends a Foundation inbox alert for a public contact inquiry |
| `server/email/donationNotification.ts` | Sends a Foundation inbox alert for donation details |
| `server/email/receipt.ts` | Sends donor receipts |

The SMTP implementation reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_APP_PASSWORD` from runtime environment variables. It has no member welcome, account-setup, assignment, or password-reset functions yet. There is no committed `.env`, `.env.example`, or `.env.*` file; managed platform secrets supply runtime configuration.

## PROJECT INVENTORY

### Project root

`.git`, `.gitignore`, `.gitkeep`, `.manus-logs`, `.prettierignore`, `.prettierrc`, `.project-config.json`, `client`, `components.json`, `content`, `drizzle`, `drizzle.config.ts`, `ideas.md`, `node_modules`, `package.json`, `patches`, `pnpm-lock.yaml`, `scripts`, `server`, `shared`, `template.json`, `todo.md`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`.

### `client/src` inventory

| Area | Files |
| --- | --- |
| App/bootstrap | `App.tsx`, `main.tsx`, `const.ts`, `index.css` |
| Pages | `Home.tsx`, `InnerPages.tsx`, `MegaMenuPages.tsx`, `MediaContactPages.tsx`, `ThankYouPage.tsx`, `FoundationAdminPage.tsx`, `MisDashboardPage.tsx`, `MisProjectsPage.tsx`, `MisDeliveryPage.tsx`, `MisOperationsPage.tsx`, `MisGovernancePage.tsx`, `ComponentShowcase.tsx`, `NotFound.tsx` |
| Feature components | `ContactInquiryForm.tsx`, `DonationDetailsForm.tsx`, `ErrorBoundary.tsx`, `InnerPageShell.tsx`, `LiveContentPanels.tsx`, `MembershipApplicationForm.tsx`, `MisAccessDenied.tsx`, `SiteChrome.tsx`, `DashboardLayout.tsx`, `DashboardLayoutSkeleton.tsx`, `Map.tsx`, `ManusDialog.tsx`, `AIChatBox.tsx` |
| Hooks/context/lib | `contexts/ThemeContext.tsx`, `hooks/useComposition.ts`, `hooks/useMobile.tsx`, `hooks/usePersistFn.ts`, `lib/notifications.tsx`, `lib/notifications.test.ts`, `lib/trpc.ts`, `lib/utils.ts` |
| UI primitive directory | `components/ui/accordion.tsx`, `alert-dialog.tsx`, `alert.tsx`, `aspect-ratio.tsx`, `avatar.tsx`, `badge.tsx`, `breadcrumb.tsx`, `button-group.tsx`, `button.tsx`, `calendar.tsx`, `card.tsx`, `carousel.tsx`, `chart.tsx`, `checkbox.tsx`, `collapsible.tsx`, `command.tsx`, `context-menu.tsx`, `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `empty.tsx`, `field.tsx`, `form.tsx`, `hover-card.tsx`, `input-group.tsx`, `input-otp.tsx`, `input.tsx`, `item.tsx`, `kbd.tsx`, `label.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `pagination.tsx`, `popover.tsx`, `progress.tsx`, `radio-group.tsx`, `resizable.tsx`, `scroll-area.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`, `slider.tsx`, `sonner.tsx`, `spinner.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `toggle-group.tsx`, `toggle.tsx`, `tooltip.tsx` |

## EXISTING TABLES

The schema contains the following **27 tables**. Column names below use the application’s Drizzle camel-case names and database types.

| Table | Columns |
| --- | --- |
| `users` | `id int PK`, `openId varchar(64) unique`, `name text`, `email varchar(320)`, `loginMethod varchar(64)`, `role enum(user/admin/project_manager/field_staff/finance/monitoring/management)`, `createdAt timestamp`, `updatedAt timestamp`, `lastSignedIn timestamp` |
| `payment_transactions` | `id int PK`, `receipt varchar(40) unique`, `kind enum(donation/membership)`, `amount int`, `currency varchar(3)`, supporter identity/contact fields, Razorpay IDs, transaction/receipt status fields, timestamps |
| `donation_intents` | `id int PK`, `donationRef varchar(40) unique`, donor identity/address fields, encrypted PAN fields, `amount int`, lifecycle/notification fields, consent/timestamps |
| `payment_webhook_events` | `id int PK`, `gatewayEventId varchar(255) unique`, event/order/payment IDs, payload hash, processing state/timestamps |
| `membership_applications` | `id int PK`, `applicationRef varchar(40) unique`, applicant identity/location, membership type, encrypted PAN/ID-proof storage data, workflow/notification state, consent/timestamps |
| `contact_inquiries` | `id int PK`, `inquiryRef varchar(40) unique`, name/contact, topic, message, workflow/notification state, consent/timestamps |
| `gallery_media` | `id int PK`, `mediaRef varchar(40) unique`, title/description/alt/quarter/order, storage/file metadata, source/source file ID, publish state, uploader and timestamps |
| `gallery_drive_sync` | `id int PK`, Drive folder URL/ID, sync status/interval/task UID, last sync state/error, updater and timestamps |
| `projects` | `id int PK`, project name/code/theme/location, start/end dates, project status, project lead, creator and timestamps |
| `funders_partners` | `id int PK`, `projectId int FK`, funder/CSR/NGO/contact/MoU/reporting fields, creator and timestamps |
| `project_objectives` | `id int PK`, `projectId int FK`, problem/objective/outcome text, `sdgLinkage json`, creator and timestamps |
| `project_target_groups` | `id int PK`, `projectId int FK`, beneficiary/gender/age/population/target/geography fields, creator and timestamps |
| `project_activities` | `id int PK`, `projectId int FK`, optional objective FK, activity/workplan/status fields, creator and timestamps |
| `beneficiaries` | `id int PK`, `beneficiaryId varchar(32) unique`, optional code, identity/location/demographic/project/activity/status/duplicate fields, creator and timestamps |
| `targets_achievement` | `id int PK`, project/activity FKs, indicator/period fields, target/achievement decimals, creator and timestamps |
| `field_events` | `id int PK`, `eventId varchar(32) unique`, project/activity FKs, event/location/participant/staff/volunteer/evidence data, creator and timestamps |
| `project_outputs` | `id int PK`, project/activity FKs, output type, target/actual values, period/notes/evidence, creator and timestamps |
| `project_outcomes` | `id int PK`, project/activity FKs, outcome/change/indicator/value/measurement/evidence fields, creator and timestamps |
| `project_team_assignments` | `id int PK`, project FK, optional `staffOpenId`, staff/assignment/responsibility/contact/date/status fields, creator and timestamps |
| `project_budget_allocations` | `id int PK`, project FK, fiscal year/budget/amount/funder/notes fields, creator and timestamps |
| `project_finance_records` | `id int PK`, project FK, optional allocation FK, expense/payment/vendor/invoice/approval/document fields, creator and timestamps |
| `project_documents` | `id int PK`, project FK, document type/name/storage/visibility/review/uploader fields and timestamps |
| `monitoring_indicators` | `id int PK`, project/activity FKs, indicator/baseline/target/current/frequency/source/owner/measurement fields, creator and timestamps |
| `project_risks` | `id int PK`, project FK, risk/category/severity/likelihood/mitigation/owner/due/status fields, creator and timestamps |
| `project_reports` | `id int PK`, project FK, report type/period/due/status/narrative/finance/document/approval fields, creator and timestamps |
| `impact_evidence` | `id int PK`, project FK, evidence type/title/description/storage/consent/visibility/creator/timestamps |
| `project_closures` | `id int PK`, unique project FK, closure date/checklist/lessons/status/approval/creator/timestamps |
| `mis_audit_logs` | `id int PK`, actor OpenID, action/entity/entity ID, optional project FK, JSON details, timestamp |

## EXISTING ROUTES

### Frontend routes

Public routes include `/`, `/about`, `/who-we-are`, `/vision-mission`, `/what-we-do`, `/digital-skills`, `/green-entrepreneurship`, `/mentorship-community`, `/transparency`, `/programs`, `/team`, `/reports`, `/governance`, `/stories`, `/updates`, `/membership`, `/media-centre`, `/field-gallery`, `/contact-us`, `/donate`, `/thank-you`, `/privacy`, `/refund` and `/404`.

Existing protected application routes are `/foundation-admin`, `/mis/dashboard`, `/mis/projects`, `/mis/delivery`, `/mis/operations` and `/mis/governance`.

### Backend/API routes

| Route family | Existing procedures or mount |
| --- | --- |
| `/api/oauth/*` | Manus OAuth login/callback handling |
| `/api/razorpay/webhook` | Raw-body Razorpay webhook |
| `/api/trpc/auth.*` | `me`, `logout` |
| `/api/trpc/membership.*` | Public membership application submission |
| `/api/trpc/inquiry.*` | Public contact inquiry submission |
| `/api/trpc/donation.*` | Donation-intent submission |
| `/api/trpc/payment.*` | Live-status, checkout order, verification |
| `/api/trpc/management.*` | Admin membership/inquiry/donation/payment/media/Drive management |
| `/api/trpc/media.*` | Public published gallery feed |
| `/api/trpc/projects.*` | MIS project, partner, objective, target group and activity records |
| `/api/trpc/delivery.*` | Beneficiaries, targets, field events, outputs and outcomes |
| `/api/trpc/operations.*` | Team assignments, budgets/expenses, documents, indicators, risks and reports |
| `/api/trpc/governance.*` | Impact evidence, closure control, audit records, CSV export |
| `/api/trpc/dashboard.*` | Portfolio summary and project command centre |

## KEY OWNERSHIP FILES

| Concern | Current file(s) |
| --- | --- |
| Project data | `drizzle/schema.ts`, `server/db.ts`, `server/routers/projects.ts`, `delivery.ts`, `operations.ts`, `governance.ts` |
| User/admin data | `drizzle/schema.ts` (`users`), `server/_core/sdk.ts`, `server/_core/trpc.ts`, `server/routers/management.ts`, `client/src/pages/FoundationAdminPage.tsx` |
| Dashboard rendering | `client/src/pages/MisDashboardPage.tsx`, `server/routers/dashboard.ts`, `server/db.ts` |
| Existing session/OAuth | `server/_core/oauth.ts`, `server/_core/sdk.ts`, `server/_core/context.ts`, `server/_core/cookies.ts` |
| Email | `server/email/*.ts`, `server/payments/razorpay.ts`, `server/routers/membership.ts` |

## RELEVANT DEPENDENCIES

`@trpc/server`, `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query`, `express`, `drizzle-orm`, `drizzle-kit`, `mysql2`, `jose`, `cookie`, `nodemailer`, `zod`, `react-hook-form`, `wouter`, `vitest` and `playwright` are relevant to the proposed work. **`bcrypt`/`bcryptjs` is not currently installed.**

## RISK AREAS

| Area | Why it could break | Safe extension principle |
| --- | --- | --- |
| Parallel authentication | Existing access is Manus OAuth and cookie JWT; replacing it could lock the owner out of `/foundation-admin` and `/mis/*`. | Keep existing OAuth unchanged; introduce member credentials as a second, explicitly scoped session identity. |
| Role-model collision | Existing `users.role` enum is consumed by MIS guards; requested member roles differ. | Add a separate `members` account model and an adapter/permission layer rather than mutating current MIS roles blindly. |
| Project authorization | Existing project reads are role-based portfolio access, not per-member assignments. | Implement server-side assignment checks before any member-scoped project read/write; never trust a frontend project ID. |
| Audit data duplication | Existing `mis_audit_logs` already records MIS governance activity. | Decide whether the requested generic audit log is an extension/alias or a separate account-security audit table; avoid losing the existing MIS history. |
| Membership workflow overlap | `membership_applications` is a public intake workflow, not a credential account. | Approval should create/link a `members` record only after explicit admin approval; preserve original application/ref/proof privacy controls. |
| Email/security | Existing SMTP only notifies the Foundation. Reset/setup tokens, account enumeration resistance and expiry handling are new security controls. | Store only token hashes, use one-time expiry, throttle requests, and return generic responses for account discovery prevention. |
| Database portability | The current database is MySQL/TiDB; the supplied schema references `JSONB`, which is PostgreSQL-specific. | Use Drizzle MySQL `json` or `text` instead of JSONB and add migrations through the existing reviewed process. |
| New REST contract | The supplied specification asks for REST endpoints, while the application is tRPC-first. | Prefer tRPC procedures for browser UI; only add raw REST endpoints if an external client or compatibility requirement makes them necessary. |

## RECOMMENDED NEXT IMPLEMENTATION DECISION

The requested portal is feasible, but should be implemented as a **separate member-credential and assignment layer that coexists with Manus OAuth**, not as a replacement for the current Foundation/MIS authentication. Before Step 2, confirm whether the user wants:

1. **Member accounts to be created only after the existing public membership application is approved**, and
2. **Member login to coexist with Manus OAuth** (recommended), or to replace it (not recommended because it would disrupt the current owner/admin flow).

> No Step 2 database migration or code has been started. Awaiting confirmation.

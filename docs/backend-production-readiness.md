# AASW Backend Production Readiness

The AASW application already uses a full server-backed architecture. Member accounts, Foundation Admin, MIS, membership applications, protected uploads, member projects, service requests, support conversations, payment boundaries and membership lifecycle data are handled through server procedures and the production database. The Member Portal uses its own signed session, while Foundation Admin and MIS use protected organisational login and role checks.

## Deployment checks now available

The server provides two diagnostics endpoints that intentionally disclose no credential values, personal data or database connection strings.

| Endpoint | Purpose | Expected response |
|---|---|---|
| `/api/health` | Liveness check for a load balancer or hosting monitor. | HTTP 200 when the Node server is running. |
| `/api/ready` | Configuration readiness check for the database, session signing, Admin/MIS OAuth and managed storage. | HTTP 200 when all checks are configured; HTTP 503 when a required dependency is absent. |

## Owner-controlled production prerequisites

The items below are intentionally not hard-coded in source code. They must be supplied or enabled only by the Foundation owner when the corresponding service is ready.

| Area | Required owner-controlled setup | Current implementation boundary |
|---|---|---|
| Database | A production `DATABASE_URL` with TLS where the provider requires it. | Database schema and server queries are implemented. |
| Server sessions | A strong production `JWT_SECRET`. | Member and organisational sessions are signed server-side. |
| Foundation Admin and MIS sign-in | A compatible production OAuth configuration and approved callback URL. | Current Admin/MIS flow uses Manus OAuth and must keep its callback domain aligned with the deployed origin. |
| Transactional email | Foundation SMTP credentials and a verified sender mailbox. | Activation, password reset, membership notifications and lifecycle emails are server-side; no real test emails should be sent during QA. |
| Private uploads and gallery media | Managed storage credentials compatible with the deployed runtime. | Private identity proof access is signed and restricted; public gallery queries return only published entries. |
| Membership lifecycle schedules | Published production schedule task UIDs. | The expiry and reminder handlers are idempotent and cron-authenticated, but activation waits for published production schedules. |
| Google Drive gallery ingestion | A Foundation-owned Drive folder plus service-account access. | Manual gallery publishing and Drive configuration are implemented; automatic ingestion is deferred until access is supplied. |
| Payments | Live Razorpay keys and webhook secret, if payments are enabled. | The app remains in safe no-charge demo mode until approved credentials are configured. |

## External hosting boundary

The current app is built as one Node/Express server with tRPC, protected cookies, database access, private storage, scheduled callbacks and Manus OAuth. A static-only Vercel deployment is therefore not sufficient for the protected backend. Any external deployment must provide a compatible Node runtime, persistent database connectivity, all required secrets, OAuth callback alignment and an equivalent approach for the current managed storage and scheduled callback authentication.

Before switching hosting, use `/api/ready` in the target environment and complete an authenticated Admin, MIS and Member Portal smoke test. Do not expose the readiness response through a public dashboard, and do not copy any secret values into client-side variables or source control.

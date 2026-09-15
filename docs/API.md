# AASW Foundation — API Reference (tRPC procedures)

All application APIs are served through **tRPC** at `/api/trpc/*` with superjson
transformer. Roles are always resolved **server-side** from the session
(Manus OAuth cookie for Admin/MIS, signed member JWT cookie for the Member
Portal). The frontend can never raise a role by sending it in a request.

Auth guards used below:

| Guard | Meaning |
|---|---|
| `public` | No session required. Input is Zod-validated; sensitive ones are rate-limited. |
| `member` | Member Portal session required (signed `aasw_member_session` cookie). |
| `admin` | Manus OAuth user with `role = admin` (Foundation Admin workspace). |
| `mis:*` | Manus OAuth user with a role inside the listed MIS role set (see `server/_core/trpc.ts`). |
| `finance` | MIS finance procedure: roles `admin`, `finance`. |

Rate limits below are enforced by `server/_core/rateLimit.ts` per client IP
(in-memory single instance; shared Redis when `REDIS_URL` is set).

---

## system & auth

| Procedure | Guard | Purpose |
|---|---|---|
| `system.health` | public | Liveness ping for platform monitors. |
| `system.notifyOwner` | admin | Owner notification dispatch. |
| `auth.me` | public | Current Manus OAuth user or `null` (session-scoped, no params). |
| `auth.logout` | public | Clears the OAuth session cookie. |

HTTP endpoints (not tRPC): `GET /api/health`, `GET /api/ready`,
`GET /sitemap.xml`, `POST /api/razorpay/webhook`,
`POST /api/scheduled/membership-expiry`, `POST /api/scheduled/membership-reminder`.

## membership

| Procedure | Guard | Rate limit | Purpose / errors |
|---|---|---|---|
| `membership.submit` | public | 8/hour per IP | Stores the application, uploads ID proof to private storage, activates the member immediately (owner policy: immediate activation), dispatches Foundation notification + member setup/certificate emails. PAN is AES-256-GCM encrypted; only the last four digits and a keyed HMAC are stored for matching. Errors: `BAD_REQUEST` (validation/honeypot), `CONFLICT` (renewal identity mismatch, active membership exists), `NOT_FOUND` (renewal without existing membership). |

## inquiry (contact)

| Procedure | Guard | Rate limit | Purpose |
|---|---|---|---|
| `inquiry.submit` | public | 8/hour per IP | Stores contact inquiry, notifies the Foundation, tracks notification status. |

## donation

| Procedure | Guard | Rate limit | Purpose |
|---|---|---|---|
| `donation.submitDetails` | public | 8/hour per IP | Persists pre-checkout donor details (PAN encrypted) for Foundation follow-up independent of gateway configuration. |

## volunteer

| Procedure | Guard | Rate limit | Purpose / errors |
|---|---|---|---|
| `volunteer.submit` | public | 8/hour per IP | Stores a volunteer application (`submitted`), notifies the Foundation. Honeypot `website` field silently rejects bots. Errors: `BAD_REQUEST` (validation), `INTERNAL_SERVER_ERROR` (storage). |
| `volunteer.myStatus` | public | — (query) | Status lookup requiring **both** the unguessable `applicationRef` and the applicant email; mismatched email returns `found: false` without confirming the reference exists. |
| `management.volunteers.list` | admin | — | Paginated review list (limit 1–100, optional status filter). |
| `management.volunteers.review` | admin | — | Records a review decision (`submitted/reviewing/approved/rejected/inactive`) with optional notes, writes an audit log; approve/reject additionally email the applicant. Errors: `NOT_FOUND`. |

Volunteer roles are granted on top of existing member accounts; volunteer
applications never auto-create a portal account (documented limitation — see
docs/deployment.md §9).

## payment (Razorpay)

| Procedure | Guard | Rate limit | Purpose / errors |
|---|---|---|---|
| `payment.liveStatus` | public | — | Reports whether live keys are configured (boolean only, no secrets). |
| `payment.createOrder` | public | 12/15min per IP | Validates the amount against the server-side allow-list, creates the Razorpay order, persists a `created` transaction. Errors: `BAD_REQUEST` (unsupported amount), `PRECONDITION_FAILED` (no keys). |
| `payment.verifyCheckout` | public | 12/15min per IP | Verifies the checkout HMAC against the stored order, marks the transaction `verified`, emails the receipt. Errors: `NOT_FOUND`, `BAD_REQUEST` (signature). |
| `payment.admin.listRefunds` | finance | — | Refund records joined with transaction summaries (limit 1–100). |
| `payment.admin.refundPayment` | finance | — | Creates a gateway refund. Amount is always derived from the stored transaction; partial refunds need an explicit `allowPartial` flag and must be ≥ ₹1 and ≤ original. A duplicate-refund guard runs **before any gateway call** — a receipt with an existing initiated/processed refund is rejected, so double-clicks can never create two gateway refunds. Records the refund + audit log transactionally; donor email is sent and tracked. Errors: `NOT_FOUND`, `PRECONDITION_FAILED` (not verified/captured, refund already in progress/processed, or unconfigured), `BAD_REQUEST` (partial refund rules), `INTERNAL_SERVER_ERROR` (gateway). |

Webhook: `POST /api/razorpay/webhook` (raw-body HMAC verified, event-id dedupe;
handles `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`,
`refund.failed` idempotently). Retry-safe: replays return `duplicate: true`. Refunds created directly in the Razorpay dashboard (no local refund row) are reconciled by `refund.processed`: the transaction flips to `refunded` with an audit entry.

## member (Member Portal)

Public, token-gated by unguessable one-time hash links: `setupStatus`,
`emailCertificateStatus`, `setupPassword`, `requestPasswordReset` (generic
response — never reveals registered emails), `resetStatus`, `resetPassword`,
`login` (locks account 15 min after 5 failures), `logout`, `me`.

Member-session procedures (ownership is always scoped to the session member
server-side — no client-supplied member id is accepted anywhere):

| Procedure | Purpose |
|---|---|
| `member.dashboard` | Own profile, membership validity, profile photo (signed URL). |
| `member.myProjects` | Own project assignments. |
| `member.membershipHistory` | Own membership cycles. |
| `member.myReceipts` | Own payment receipts — query keyed to the session member's email; there is no id parameter to forge (IDOR-safe by construction). |
| `member.receiptStatus` | Single own receipt for PDF download; ownership re-checked inside the query (`NOT_FOUND` for anyone else's receipt). |
| `member.myServiceRequests`, `member.joinService` | Own programme service requests (one per programme area). |
| `member.mySupportMessages`, `member.sendSupportMessage` | Own support conversations. |
| `member.changePassword`, `member.updateProfileSettings`, `member.uploadProfilePhoto` | Own account updates. |
| `member.admin.listMembers`, `member.admin.listProjects`, `member.admin.assignProject` | Admin-gated member administration (Manus OAuth). |

## management (Foundation Admin workspace — all `admin`)

| Group | Procedures |
|---|---|
| `summary` | Workspace counts (now includes volunteers). |
| `alerts` | `list`, `markRead`. |
| `memberships` | `list` (explicit column set — no PAN), `updateStatus`, `proofUrl` (signed, time-limited private access). |
| `inquiries` | `list`, `updateStatus`. |
| `volunteers` | `list`, `review` (see volunteer section). |
| `donations` | `list`, `updateStatus`. |
| `payments` | `list` (read-only provider states). |
| `serviceRequests` | `list`, `updateStatus` (audit reviewer). |
| `supportMessages` | `list`, `respond` (audit responder). |
| `media` | `list`, `upload` (MIME sniffed server-side), `update`. |
| `galleryDrive` | `configuration`, `saveConfiguration` (sync stays disabled until owner connects Drive access). |

Public media read: `media.list` returns only `published` gallery entries.

## projects / delivery / operations / governance / dashboard (MIS)

All procedures require a Manus OAuth role from the MIS sets below; every write
also records an entry in `mis_audit_logs`.

- `projects` — read: admin, project_manager, field_staff, finance, monitoring, management; write: admin, project_manager. Sub-routers: partners, objectives, targetGroups, activities.
- `delivery` — beneficiaries, targets, events, outputs, outcomes (read + field write per `misFieldProcedure`).
- `operations` — team, finance (approval via finance roles), documents, monitoring, risks, reports.
- `governance` — impact evidence, closure, audit log reads, exports.
- `dashboard` — `stats`, `projectCommandCenter`.

## Error envelope

tRPC errors carry a safe `code` + human `message`; database errors, stack
traces, secrets and internal paths are never returned to clients and remain in
server logs only. Rate-limited requests receive HTTP 429 with a `Retry-After`
header.

## publicProcedure audit (2026-09-01)

Every `publicProcedure` was reviewed. Justified public surface: health/status
lookups, published media, submit-style mutations (rate-limited, Zod-validated,
honeypot where appropriate), login/reset/token flows (unguessable hashes),
and checkout flows whose integrity comes from gateway signatures. No public
procedure reads or mutates another user's private data. Pagination: all admin
and MIS list procedures enforce a 1–100 limit via Zod; `member.admin.listMembers`
is capped at 200 rows internally.

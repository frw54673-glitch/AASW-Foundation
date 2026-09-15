# AASW FOUNDATION — BACKEND COMPLETION & HARDENING PROMPT (v2)

> **How to use:** This is a DIFFERENTIAL prompt, not a full backend prompt. The repository ALREADY
> has a working backend (tRPC + Express + Drizzle/MySQL + Manus OAuth + member JWT sessions +
> real Razorpay server integration + webhook + email + 205 passing tests). A generic
> "implement the full backend" prompt will cause an AI agent to rebuild working code, break the
> frontend, or duplicate routers. Feed this prompt INSTEAD: it lists only the verified gaps,
> one intentional policy decision the owner must make, and the exact guardrails.

You are a senior full-stack backend architect and security engineer working on an EXISTING,
partially complete production repository.

## RULE ZERO — READ FIRST, CHANGE LITTLE

1. Audit before you write code. This repo already implements most of a standard backend spec.
   Do NOT rebuild it. Do NOT restructure folders. Do NOT introduce a second ORM, a second auth
   system, or new API styles alongside tRPC.
2. Preserve every existing frontend route, component, design and UX. Frontend changes are only
   allowed where explicitly listed below.
3. Keep the existing architecture: `server/routers/*` (tRPC), `server/db.ts` (Drizzle),
   `server/_core/*` (trpc/context/sdk/oauth/storageProxy/vite), `server/security/*`,
   `server/payments/*`, `server/email/*`, `server/scheduled/*`, `drizzle/schema.ts`.
4. Every schema change MUST ship as a new Drizzle migration (`drizzle-kit generate`) — never
   edit existing migration files, never drop or rename existing columns/tables.
5. Validation gate before you declare done: `pnpm install && pnpm check && pnpm test && pnpm build`.
   All must pass. Fix anything you break.

---

## CURRENT STATE (already verified — do not re-implement)

Already working and covered by tests — LEAVE AS-IS unless a task below says otherwise:

- **Auth:** members = signed JWT cookie sessions (`server/security/memberSession.ts`, bcryptjs
  password hashing, lockout rate limits). Admin/MIS = Manus platform OAuth (`server/_core/sdk.ts`)
  with `users.role` enum: user/admin/project_manager/field_staff/finance/monitoring/management.
  Server-side role middleware already exists in `server/_core/trpc.ts`
  (`memberProcedure`, `memberRoleProcedure`, `adminProcedure`, `mis*Procedure`).
- **Payments:** REAL Razorpay integration in `server/routers/payments.ts` (server-side order
  creation, amount validated via `shared/payment-demo.ts` allow-list, checkout signature
  verification, idempotent webhook with raw-body HMAC + event-id dedupe in
  `server/payments/webhook.ts`, receipts emailed). Demo checkout UI
  (`client/src/components/PaymentDemoCheckout.tsx`) is a conscious no-charge fallback when
  `VITE_PAYMENT_GATEWAY_MODE !== "razorpay"`.
- **PII:** PAN encrypted AES-256-GCM (`server/security/sensitive.ts`), ID-proof uploads to
  private storage with signed access (`server/storage.ts`, `server/_core/storageProxy.ts`).
- **Email:** nodemailer with per-flow templates, delivery-status persistence, async non-blocking.
- **Lifecycle:** cron-authenticated daily expiry + 7-day reminder + post-grace follow-up
  (`server/scheduled/*`), idempotent and platform-authenticated.
- **Ops:** `/api/health`, `/api/ready`, sitemap.xml, robots.txt, security headers + CSP, per-IP
  in-memory rate limiting on sensitive mutations, `mis_audit_logs` table for MIS actions.
- **Contact/inquiry, donation intents, media/gallery, MIS routers, member portal routers** all
  exist with server procedures and DB tables.
- Tests: 205 passing / 1 intentionally skipped (needs real SMTP creds).

---

## TASK 0 — OWNER POLICY DECISION (ask before touching code)

`server/routers/membership.ts` currently sets `status: "approved"` at submission time and
activates the member immediately (setup-password + certificate email are dispatched right away).
README documents this as "Immediate member activation".

Your spec instead requires admin review before approval (SUBMITTED → UNDER_REVIEW → APPROVED).
These are mutually exclusive. ASK THE OWNER FIRST, then implement exactly one:

- **Option A (keep immediate activation):** no membership-flow change; skip Task 1 entirely.
- **Option B (reviewed activation — default recommendation for production):** implement Task 1.

Do not silently flip this behaviour; tests, emails and the member dashboard all depend on it.

## TASK 1 — (only if owner picks Option B) Reviewed membership activation

1. New applications persist as `submitted` (add `under_review`, keep `approved`/`rejected`).
2. Add admin procedures (role-checked, reuse `adminProcedure`/`memberRoleProcedure`):
   `listApplications` (paginated + search + status filter), `getApplication`,
   `reviewDocuments` (signed URL access, audit-logged), `approveApplication`,
   `rejectApplication` (with notes).
3. On approve: ONE Drizzle transaction must atomically set
   `application.status = approved`, create/activate the member, generate membership number,
   issue setup-password + certificate tokens, write an audit log. Activation/setup emails move
   from the public submit mutation into the approval mutation.
4. On reject: transaction sets `application.status = rejected`; NO member row may become or stay
   active; rejection email dispatched; reason captured.
5. Add `reviewerId`, `reviewNotes`, `reviewedAt` to the application table (migration).
6. Update the existing membership integration test expectations; add tests for: approve
   transitions, reject transitions, unauthorized reviewer attempts, double-approve idempotency.
7. Member dashboard must gracefully show a pending-review state (no crash, no leaked internals).

## TASK 2 — DEDICATED PII ENCRYPTION KEY (do regardless of Task 0 outcome)

`server/security/sensitive.ts` currently derives the AES key from `process.env.JWT_SECRET`.
Change it to read `PII_ENCRYPTION_KEY` FIRST, falling back to `JWT_SECRET` ONLY IF
`PII_ENCRYPTION_KEY` is absent (keeps existing deployments/rows decryptable — existing
ciphertexts must remain readable or provide a documented re-encryption path). Add
`PII_ENCRYPTION_KEY` to `.env.example`. Never log the key or decrypted PII. Note the fallback
explicitly in code so the owner can retire `JWT_SECRET` derivation later.

## TASK 3 — REFUNDS (missing entirely)

1. Admin-only tRPC procedure `refundPayment` guarded by `memberRoleProcedure(["admin","super_admin"])`
   or a new `misFinanceProcedure` — pick the stricter existing pattern. Refund amount must be
   validated server-side against the captured transaction (full-refund first; partial refunds
   only if `allowPartial` flag passed by an authorized role — never trust the frontend amount).
2. Call Razorpay Refunds API using the existing `server/payments/razorpay.ts` helper style.
3. Transaction (`payment_transactions.status = refunded`, refund record with
   `razorpay_refund_id`, audit log, donor email) must be atomic via Drizzle transaction.
4. Handle Razorpay webhook `refund.processed`/`refund.failed` events idempotently in
   `server/payments/webhook.ts`.
5. Tests: unauthorized role rejected, invalid amount rejected, idempotent double-refund safe,
   webhook signature enforcement unchanged.

## TASK 4 — VOLUNTEER WORKFLOW (currently only a `volunteer` role value; no application pipeline)

1. New tables (migrations): `volunteer_applications` (name, email, phone, city, state, skills,
   availability, interests, consent, status enum submitted/reviewing/approved/rejected/inactive,
   reviewer, reviewNotes, timestamps) and reuse the existing `members.role` for granted access.
2. Public `volunteerRouter` procedures: `submit` (Zod-validated, rate-limited like
   `membership.submit`, spam honeypot field), `myStatus`.
3. Admin procedures: list/search/paginate, review, approve (→ create volunteer-role member or
   flag existing member), reject with reason, deactivate.
4. Email templates for submitted/approved/rejected, wired into the existing
   `server/email/*` pattern with delivery-status persistence.
5. Frontend: add ONE volunteer page/form matching the existing design system (reuse
   `InnerPageShell`), and an admin review tab in the existing Foundation Admin workspace. Do
   not redesign anything else.

## TASK 5 — RATE LIMITING UPGRADE (multi-instance safe)

`server/_core/rateLimit.ts` is an in-memory `Map` — it resets per instance and per restart.
1. Introduce a pluggable store interface with two adapters: the current in-memory one (default,
   single-instance dev) and a Redis adapter (used when `REDIS_URL` is set). No new hard
   dependency in the default install — use a lazy dynamic import for redis.
2. Apply the same existing rule limits; add rules for the new volunteer submit and
   (if Option B) admin review endpoints.
3. Tests for both adapters (mock Redis in tests).

## TASK 6 — RECEIPT HARDBENING

1. Verify/ensure the member-facing receipt view authorizes ownership server-side (a member must
   never fetch another member's receipt by ID/number — test for this IDOR case).
2. Keep receipt numbers unguessable (currently `nanoid(16)` — keep; do NOT switch to sequential).
3. If not already present, add an authenticated PDF/download procedure reusing the existing
   jsPDF certificate pattern in the member portal.

## TASK 7 — ADMIN & MEMBER DASHBOARD API AUDIT

1. Grep every router for `publicProcedure` that reads or mutates non-public data and justify or
   fix each one. Known-safe public procedures: health, sitemap, published media/gallery,
   membership/donation/volunteer submit, login/reset.
2. For every list-style admin/member procedure, confirm pagination + search bounds exist (no
   unbounded `SELECT *` dumps). Add limits where missing.
3. Verify no router returns sensitive columns (panEncrypted, idProofStorageKey, tokens,
   password hashes) in any query result — add explicit column selection where needed.

## TASK 8 — DOCS

1. `docs/API.md`: document every tRPC procedure group — purpose, auth requirement, input,
   output, errors, rate limits. Note demo vs live payment mode.
2. `.env.example`: every variable with placeholder names only — DATABASE_URL, NODE_ENV, APP_URL,
   JWT_SECRET, PII_ENCRYPTION_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET,
   SMTP_*, VITE_PAYMENT_GATEWAY_MODE, REDIS_URL (optional), storage vars.
3. `docs/deployment.md`: migration apply order, backup/rollback notes, cron schedule activation
   steps, Razorpay webhook setup (endpoint URL, events: payment.captured, order.paid,
   payment.failed, refund.processed), and the demo→live cutover checklist.

---

## EXPLICIT PROHIBITIONS

- NO auto-approval changes unless the owner explicitly selects Option B.
- NO frontend rewrite. Only the volunteer page and (if Option B) a member-dashboard pending
  state may be added.
- NO new auth system, no replacing Manus OAuth for Admin/MIS, no replacing member JWT cookies.
- NO demo/mock left reachable when `VITE_PAYMENT_GATEWAY_MODE === "razorpay"` and keys exist.
- NO secrets, tokens, decrypted PII or full PAN in logs; no stack traces to clients.
- NO editing existing migrations; new schema = new migration only.
- NO changes to scheduled-callback cron authentication.
- bcryptjs is the approved password hasher (spec allows "existing secure equivalent").

## ACCEPTANCE CHECKLIST (verify before reporting done)

[ ] Owner decision on Task 0 recorded and implemented accordingly
[ ] PII key separation done with backward-compatible decryption
[ ] Refunds: role-guarded, atomic, webhook-covered, idempotent, tested
[ ] Volunteer pipeline: submit → admin review → decision → email, tested
[ ] Rate limiting works with and without REDIS_URL
[ ] Receipt IDOR test passes; admin list endpoints all paginated
[ ] No publicProcedure exposes private data (grep audit documented)
[ ] docs/API.md, .env.example, docs/deployment.md written
[ ] `pnpm check` / `pnpm test` / `pnpm build` all green
[ ] `pnpm audit` run; production-relevant advisables fixed without breaking changes
[ ] Deliverables list: changed files, new files, migrations, new env vars, Razorpay/webhook
    setup steps, test results, remaining limitations

Report at the end: what was already complete (untouched), what you changed per task, migration
details, and any behaviour the owner must review.

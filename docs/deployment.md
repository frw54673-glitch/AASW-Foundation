# AASW Foundation — Deployment Guide

This guide covers the new backend pieces (refunds, volunteer workflow, PII key
separation, shared rate limiting) and the operational steps required to run the
application in production. The existing `docs/backend-production-readiness.md`
remains the owner-prerequisites checklist; read it first.

## 1. Validation before every handoff

```bash
pnpm install
pnpm check    # TypeScript, zero errors
pnpm test     # full vitest suite
pnpm build    # vite client + esbuild server bundle into dist/
```

`pnpm audit` should also be reviewed for production-relevant advisories before
a release (see §10).

## 2. Database migrations

Schema changes introduced in this release:

- New table `payment_refunds` (gateway refund lifecycle, unique `gatewayRefundId`).
- New table `volunteer_applications` (public volunteer pipeline with review state).
- `payment_transactions.status` enum extended with `refunded` (appended —
  existing rows unaffected).

Apply order (never edit an existing migration file):

```bash
# Backup first (mandatory before production migrations)
mysqldump --single-transaction <database> > backup-$(date +%F).sql

pnpm db:push   # drizzle-kit generate + migrate
```

Rollback: restore the backup taken above. The `refunded` enum value is
additive; rolling back the app alone is safe because no query writes `refunded`
except through the new refund paths.

## 3. New environment variables

| Variable | Required | Notes |
|---|---|---|
| `PII_ENCRYPTION_KEY` | recommended | Dedicated AES key for PAN/PII. **Backward compatible:** when unset, encryption falls back to `JWT_SECRET` so existing ciphertexts stay decryptable. Once you set it, keep it stable — changing it without re-encryption makes old rows unreadable. |
| `REDIS_URL` | optional | Enables the shared rate-limit store. Requires `pnpm add redis` in the deployment image. Without it the limiter is per-instance in-memory. The store **fails closed** (rejects with 429) if Redis is unreachable — a rejected connection is never cached, so recovery happens on the next request once Redis returns — and the runtime import fails loudly if the package is missing. |

Everything else is unchanged — see `.env.example` for the full template with
placeholder names only.

### Migrating PII to its dedicated key

1. Deploy with `PII_ENCRYPTION_KEY` set and verify a renewal flow works (the
   fallback path is exercised only for rows written before the switch).
2. Rows written under `JWT_SECRET` remain readable because the fallback
   applies only while `PII_ENCRYPTION_KEY` is unset — **decide the cut-over
   before rotating `JWT_SECRET`**: rotating both at once would orphan old rows.
3. Recommended re-encryption pass: decrypt each `panEncrypted`/`panHash`
   dependent row with the old key and re-store with the new key, inside one
   maintenance window. Until that pass is run, keep the old secret available
   (e.g. as `PII_ENCRYPTION_KEY_PREVIOUS` in a secure vault) — it is not read
   automatically.

## 4. Razorpay setup

1. Dashboard → API Keys: create a live key pair, set `RAZORPAY_KEY_ID`,
   `RAZORPAY_KEY_SECRET`.
2. Dashboard → Webhooks: point to `https://<your-domain>/api/razorpay/webhook`
   with secret `RAZORPAY_WEBHOOK_SECRET` and subscribe to:
   `payment.captured`, `order.paid`, `payment.failed`,
   `refund.processed`, `refund.failed`.
3. Set `VITE_PAYMENT_GATEWAY_MODE=razorpay` so the frontend opens real
   Razorpay Checkout. In demo mode no transaction is ever created — the demo
   modal stays clearly labelled as no-charge.
4. Verify the webhook end-to-end with a ₹1 live order before announcing
   payments.

Refund behaviour: refunds are initiated only by MIS finance roles through
`payment.admin.refundPayment`. A receipt with an existing non-failed refund is
rejected **before any gateway call**, so a double-click can never create two
gateway refunds. Refunds made directly in the Razorpay dashboard are
reconciled by the `refund.processed` webhook: the transaction flips to
`refunded` with an audit entry even though no local refund row exists. The
amount is always derived from the stored transaction (partial refunds need an
explicit flag), and a failed refund never corrupts the payment record.

## 5. Email (SMTP)

Set `SMTP_HOST/PORT/USER/APP_PASSWORD`. All flows (membership activation,
password reset, receipts, refund notices, volunteer decisions) record delivery
status in the database and never block the primary transaction on failure.
The skipped test `server/smtpCredentials.test.ts` runs automatically once
credentials are present and validates the sender.

## 6. Scheduled membership lifecycle callbacks

Unchanged: the expiry and reminder handlers are cron-authenticated via the
Manus platform (`user.isCron`). Register the published schedule task UIDs in
the `membership_expiry_automation` / `membership_reminder_automation` tables
after the site is published, as documented in README.md — activation remains
deliberate and post-publication.

## 7. Demo → live cutover checklist

- [ ] `.env` production values present (no placeholders)
- [ ] `PII_ENCRYPTION_KEY` generated and stored in the secret vault
- [ ] `RAZORPAY_*` live keys + webhook subscribed to all five events
- [ ] `VITE_PAYMENT_GATEWAY_MODE=razorpay` set at build time
- [ ] Migrations applied after a verified backup
- [ ] `GET /api/ready` returns 200 with all checks green
- [ ] Smoke test: member login, admin sign-in, one ₹1 live payment + refund,
      volunteer submit + admin decision, receipt email received

## 8. Storage & SEO

- Private uploads (ID proofs, profile photos) go through the Forge presign
  flow; public access never lists them and admin access uses signed,
  time-limited URLs.
- Sitemap now matches the real routes exactly: the dead `/terms` entry was
  removed and `/refund`, `/volunteer`, `/who-we-are` were added. Only genuine
  public routes are listed; admin, member and dashboard routes are excluded.

## 9. Known deliberate limitations

- **Membership remains immediately activated on submit** (owner decision,
  2026-09-01). Auto-approval is recorded in the Foundation alerts workspace for
  human review, but no reviewer gate exists before the member account is
  usable. Switching to reviewed approval is a separate, deliberate change.
- **Volunteer approval does not auto-create member accounts.** Approved
  volunteers are contacted by email; granting a `volunteer`-role portal
  account is a manual admin action on top of an existing member record.
- **Refunds are full-amount by default**; partial refunds require the explicit
  `allowPartial` flag and finance authorisation.
- **Google Drive gallery sync** stays manual/draft-only until the owner
  connects a service-account credential.
- **Testimonials** remain intentionally empty until approved real quotes are
  supplied.

## 10. Dependency security

Run `pnpm audit` before each release. Policy: fix production-relevant
vulnerabilities (express, drizzle, mysql2, nodemailer, jspdf, razorpay paths)
without breaking major versions; dev-only advisories in build tooling are
tracked but don't block a release. The current lockfile audit result is
recorded in the release notes of this delivery.

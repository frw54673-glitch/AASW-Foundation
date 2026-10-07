# AASW Foundation — Go-Live Deployment Guide

Step-by-step guide to take this system live. Follow the order — database
first, then hosting, then domain, then the post-deploy checklist.

---

## 0. What you need before starting

| # | Item | Where to get it | Cost |
|---|---|---|---|
| 1 | Domain name (e.g. `aaswfoundation.org`) | GoDaddy / Namecheap / Hostinger | ~₹800–1,500/yr |
| 2 | Hosting account | Railway (recommended) / Render / any Node host | Free tier → ~$5/mo |
| 3 | Production MySQL | TiDB Cloud (recommended, free) / PlanetScale / Aiven | Free tier |
| 4 | Gmail App Password (emails) | Google Account → Security → 2-Step Verification → App Passwords | Free |
| 5 | Razorpay LIVE keys (optional — payments) | dashboard.razorpay.com after KYC | Per-transaction fee |
| 6 | Storage credentials (optional — document uploads in production) | Manus Forge / any S3-compatible storage | Varies |

---

## 1. Production database (TiDB Cloud)

1. Sign up at tidbcloud.com → create a **Serverless cluster** (free tier).
2. Note the connection string — it looks like:
   `mysql://<user>:<password>@gateway.<region>.aws.tidbcloud.com:4000/aasw`
3. Run the migrations against it from your machine:

```bash
DATABASE_URL="<tidb connection string>" pnpm exec drizzle-kit migrate
```

4. If `drizzle-kit migrate` skips pending migrations (a known quirk), use the
   repair script instead:

```bash
DATABASE_URL="<tidb connection string>" node scripts/_applyPendingMigrations.mjs
```

5. Seed the Foundation owner login (the ONLY admin account):

```bash
DATABASE_URL="<tidb connection string>" OWNER_EMAIL="aaswfoundation06@gmail.com" OWNER_PASSWORD="<strong password>" node scripts/seedOwnerAdmin.mjs
```

> The local database already has this pattern — production must have it too
> before the admin panel will accept a login.

---

## 2. Hosting (Railway)

1. Push the repo to GitHub (already done — `frw54673-glitch/AASW-Foundation`).
2. railway.app → New Project → Deploy from GitHub repo.
3. Build command: `pnpm install && pnpm build` · Start command: `pnpm start` (runs `node dist/index.js`).
4. Add a **Persistent Volume** mounted at `/data` if you stay on local-file
   storage (see section 4) — otherwise skip.
5. Set the environment variables (section 5).
6. Deploy → Railway gives you a `*.up.railway.app` URL — test it before the
   domain step.

---

## 3. Environment variables (production `.env`)

```env
NODE_ENV=production
PORT=3000
APP_URL=https://www.your-domain.org          # used in emails, sitemap, certificates

DATABASE_URL=<TiDB connection string>

JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
PII_ENCRYPTION_KEY=<generate the same way — encrypts PAN/government IDs>

# Transactional email (already proven working)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=aaswfoundation06@gmail.com
SMTP_APP_PASSWORD=<the 16-char Gmail app password>

# Storage for member documents (REQUIRED in production)
BUILT_IN_FORGE_API_URL=<forge/s3 endpoint>
BUILT_IN_FORGE_API_KEY=<key>

# Payments (optional — omit to stay in demo mode)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
VITE_PAYMENT_GATEWAY_MODE=razorpay

# OAuth is NOT needed — the Foundation owner email+password login is built in.
OAUTH_SERVER_URL=
OWNER_OPEN_ID=

# NEVER set this in production — local-only preview login.
# ALLOW_DEV_PREVIEW_LOGIN=
```

> NEVER commit the production `.env`. The owner login is the single admin
> account (`aaswfoundation06@gmail.com`).

---

## 4. Member document storage

`storagePut` writes to local disk in development. In production with
`BUILT_IN_FORGE_API_URL`/`BUILT_IN_FORGE_API_KEY` set, uploads go to
S3-style storage automatically and are served via time-limited signed URLs
(member documents page). Without those variables the app **throws in
production** — so either set them, or mount a persistent volume and accept
local disk storage.

---

## 5. Domain connection

1. Railway → Settings → Networking → Generate Domain → add your custom
   domain (e.g. `www.aaswfoundation.org`).
2. At your registrar, add the DNS records Railway shows (CNAME / A).
3. Wait for DNS propagation (5–30 min), then HTTPS is automatic on Railway.
4. Update `APP_URL` to the final domain and redeploy (emails and sitemap use it).

---

## 6. Post-deploy checklist

- [ ] `https://your-domain/api/ready` returns database:true
- [ ] `/foundation-admin/login` → owner email + password works
- [ ] `/foundation-admin` shows clean zero counters
- [ ] Submit a test membership application with a REAL email → welcome email
      arrives with logo, Membership ID + password → login works with it
- [ ] Contact form submission → notification email arrives
- [ ] (If Razorpay live) test donation end-to-end with a real small payment
- [ ] Remove this file or keep it — it contains no secrets

---

## 7. Known operational notes

- The embedded MySQL (`pnpm dev:up`) is LOCAL ONLY — production uses TiDB.
- `ALLOW_DEV_PREVIEW_LOGIN` must never be set in production (owner login
  replaces it).
- Test/demo data was wiped on 2026-10-06 — production starts empty; the
  pre-wipe backup lives at `Downloads/aasw-backup-before-clean-2026-10-06.sql`
  (local machine only).
- Running `pnpm test` can kill the local embedded MySQL — restart it with
  `pnpm dev:up` afterwards (data survives).

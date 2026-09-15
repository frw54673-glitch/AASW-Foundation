# AASW Foundation Website

A modern, responsive AASW Foundation web application with public information pages, Membership and Donation workflows, a secure Member Portal, Foundation Admin workspace, Project MIS and lifecycle email automation.

## Technology

The project uses React, TypeScript, Vite, Tailwind CSS, Express, tRPC, Drizzle ORM and a MySQL/TiDB-compatible database. The package manager is `pnpm`.

## Main areas

| Area | Included capability |
|---|---|
| Public website | Programmes, Team, Transparency, Media Centre, Contact Us, Membership, Donation and field-photo gallery |
| Member Portal | Secure member login, certificate PDF, projects, profile photo, service requests, support chat, membership history and renewal journey |
| Foundation Admin | Membership, donation, inquiry, programme-request, support-inbox and media-management workspaces |
| MIS | Project, beneficiary, field-event, delivery, operations, governance and role-controlled workspaces |
| Lifecycle | Immediate member activation, expiry/grace-period handling, seven-day reminder and post-grace follow-up email pipeline |

## Local development

The app needs a local MySQL on port 3306. On Windows, `pnpm dev:up` boots the
persistent embedded MySQL (data kept in `.local-mysql/data`, so members and
applications survive restarts) and then starts the dev server — always use it
instead of plain `pnpm dev`, or every login/query will fail with
`ECONNREFUSED 127.0.0.1:3306`:

```bash
pnpm install
pnpm dev:up
```

If the mysqld binary in the system temp folder was cleaned up, `dev:up`
re-downloads it automatically on first run (can take a few minutes).

Run validation before handoff or deployment:

```bash
pnpm test
pnpm check
pnpm build
```

## Configuration

Do not commit environment files or credentials. The application expects platform-managed configuration such as database connectivity, session/JWT secrets, SMTP delivery details and OAuth settings. Google Analytics, live Razorpay and WhatsApp Business automation remain optional activation paths that require owner-supplied credentials and approvals.

## Operational notes

The daily membership-expiry and reminder callbacks are implemented but must be activated only after the site is published. Automated WhatsApp reminders require explicit member opt-in, an approved template and WhatsApp Business API credentials. The public testimonial carousel intentionally remains empty until real approved testimonials are supplied.

## Documentation

Project-specific plans and audit notes are available under [`content/`](./content/), including the next-steps roadmap, performance/SEO audit and WhatsApp activation prerequisites.

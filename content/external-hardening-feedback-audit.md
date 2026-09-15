# External Platform-Hardening Feedback Audit

## Source and scope

This audit maps the owner-provided feedback in `pasted_content.txt` to the existing AASW codebase. The feedback is a broad product and security roadmap, not evidence by itself that every requested capability is missing or broken. Findings below distinguish implemented safeguards, genuine near-term gaps, owner-controlled requirements and substantial future modules.

## Current architecture already present

The platform already has a React/Vite public site, Express/tRPC server, Drizzle data model, separate member session flow, Manus OAuth for Foundation Admin/MIS, protected role procedures, membership lifecycle enforcement, password setup/reset tokens, member login lockout, server-side validation, managed storage, private-ID-proof metadata, payment signature verification, idempotent webhook-event storage, member/service/support workflows, MIS project/beneficiary records, health/readiness endpoints and a substantial Vitest suite.

| Feedback area | Current assessment |
|---|---|
| Secure cookies, OAuth state, password reset tokens and lockout | **Implemented in part.** Cookies are HttpOnly and secure when the request is HTTPS; OAuth uses one-time state; reset/setup tokens are hashed and invalidated; repeated member failures trigger a temporary lockout. |
| Admin/MIS role checks | **Implemented in part.** Backend `adminProcedure`, member roles and MIS role procedures protect current routes; a single granular permission catalogue is not yet implemented. |
| Payment webhook | **Implemented in part.** Raw-body signature verification, constant-time comparison and persisted idempotent webhook events are present. Refund, dispute and reconciliation workflows are not. |
| Membership lifecycle and member portal | **Implemented in part.** Active/expiry/grace/renewal controls, history, certificate, service requests and support conversations exist. Public certificate verification, QR and persisted session control do not. |
| MIS, beneficiary, project, audit, notifications | **Implemented in part.** Protected MIS models and role controls exist, with MIS audit records and notification flows. Broader cross-platform audit logs, configurable impact/CSR/donor/volunteer portals and a full CMS remain larger product work. |
| Scheduled automations | **Prepared but publication-dependent.** Idempotent membership callbacks and reminder records exist; production schedules require publication and owner-controlled task configuration. |
| Analytics, WhatsApp, Drive and live payments | **Credential- or owner-dependent.** These must not be activated without approved IDs, credentials, opt-in and production publication. |

## Verified high-priority findings and remediation

| Finding | Local remediation |
|---|---|
| The storage proxy could request a signed URL for arbitrary key paths. | A public-key boundary now allows root source assets and database-confirmed published gallery media only. Membership proof, member-profile and MIS document key prefixes are denied. Member profile photos now use signed URLs returned only through the authenticated member dashboard/upload procedure. |
| The Express bootstrap used broad 50 MB JSON/form limits without explicit security headers or correlation IDs. | The global boundary now uses a 12 MB limit, disables `X-Powered-By`, enables proxy-aware HTTPS detection, assigns a request ID, sets baseline security headers and adds production CSP/HSTS policy. Upload-specific limits remain stricter. |
| Sensitive public mutations had account lockout and input validation but no request-level abuse boundary. | Added an in-memory limiter for member login/reset/setup and public membership, contact and donation submissions. Existing per-member lockout remains in place. A multi-instance production deployment should later use a shared store such as Redis. |
| Scheduled callback failures returned raw exception/request context. | Callers now receive a generic automation failure message; detailed errors remain in protected server/automation logs. |

The current session design remains stateless JWT-based. Persisted session lists, per-device revocation and mandatory MFA would require deliberate schema/authentication design and cannot be safely represented as a small visual or route change.

## Owner-controlled or major-scope requests

The following feedback items are valid future requirements but require an approved product scope, data model, consent process, credentials, infrastructure, or production publication: granular RBAC/MFA, full session inventory, public certificate verification and QR codes, refund/reconciliation, CSR and donor portals, volunteer management, field offline sync, complete CMS/versioning, global search, automation-control dashboards, analytics/GA4, production error monitoring, backup/restore operations, CI/CD policy, live Razorpay, WhatsApp Business, Google Drive ingestion and live scheduled jobs.

## Immediate remediation boundary

Only verified, architecture-compatible security gaps were remediated. No real member record, document, payment, schedule or external account was modified during this audit.

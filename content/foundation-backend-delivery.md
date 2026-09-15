# Foundation Backend Delivery

## Delivered workflows

| Workflow | Public experience | Foundation backend and management control |
| --- | --- | --- |
| Membership | The Membership route now remains distinct from Donate and retains the application flow. | Applications are already persisted with encrypted PAN and private proof storage; administrators can review metadata and update application statuses. |
| Donation | Required donor details are validated before demo checkout. | Donation intents are persisted with encrypted PAN, a secure reference, a Foundation alert that excludes sensitive fields, and an admin status lifecycle. |
| Contact inquiries | Visitors can submit an inquiry with consent and spam honeypot protection. | Inquiries are persisted, alerted to the Foundation address and available for protected follow-up status management. |
| Payments | Demo checkout remains explicitly no-charge; live gateway verification remains server-owned. | Foundation administrators can view immutable gateway and receipt-delivery states. Gateway statuses are not editable in the workspace. |
| Field media | The public gallery displays only published media alongside audited source records. | Administrators can upload verified JPG, PNG or WebP photos, add title/description/alt text/quarter metadata, save a draft, publish or archive the record. |

## Access and privacy boundary

The `/foundation-admin` workspace uses authenticated access on the client and **server-side admin authorization** for every management procedure. Membership PAN values, donation PAN values, dates of birth and addresses are excluded from dashboard summaries and all Foundation email alerts. Membership proof metadata is visible only to administrators, and its underlying object key is never exposed by a public procedure.

## Validation record

The additive `donation_intents` and `gallery_media` schema migration was generated, reviewed and applied. The database confirms 22 donation-intent columns and 18 gallery-media columns. A later additive migration introduces `displayOrder` for predictable gallery curation: lower values display first, followed by most-recent creation time. Automated coverage now includes public donation validation, encryption and non-sensitive notifications; admin-only management authorization; the corrected Membership route identity; and admin gallery upload ordering. Desktop and 375 px mobile QA confirmed the corrected Membership page, donor form layout, field gallery and protected admin sign-in state. The workspace additionally provides explicit loading, query-error, empty-record and mutation-success/error feedback.

## Deferred Drive activation

The manual gallery backend is compatible with the planned Drive source. Actual Drive ingestion remains inactive until the Foundation shares a photo-folder link and read-only service-account access. This is intentionally deferred so the website never receives access to a personal Drive without explicit permission. Browser verification confirms that the protected admin route currently presents a sign-in gate rather than rendering records to an unauthenticated visitor.

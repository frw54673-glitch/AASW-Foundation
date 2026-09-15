# Membership Application Form QA

The database-backed Membership application form was reviewed on 12 August 2026.

| Surface | Result |
| --- | --- |
| Desktop Membership page | Passed. Application context, two-column form fields, consent control, submit action, and no-payment disclosure are clear within the editorial membership flow. |
| Mobile Membership page | Passed. Inputs stack into a single column; membership selector, optional message, consent, submit action, and privacy link remain readable and reachable. |
| Submission workflow | Covered by automated server tests. Valid input receives a unique application reference; invalid email/consent and filled honeypot values are rejected before persistence. |

The form collects only contact and membership-interest details needed for Foundation follow-up. It does not collect payment or approve membership automatically.

## Interactive-state evidence

Automated browser QA exercised the form at desktop and mobile widths. An empty submission displays individual field messages for the required name, email, phone, city, state, and consent fields. A valid submission produces a unique `AASW-MEM-…` application reference and a clear confirmation panel on both layouts. Temporary QA submissions were deleted immediately after verification, so they are not retained as applicant records.

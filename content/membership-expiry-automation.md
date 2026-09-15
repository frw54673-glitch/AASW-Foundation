# Membership Expiry and Renewal Automation

Annual membership remains active through the day before the next anniversary of its start date. On the following day, the Member Portal validates expiry during every protected request and blocks portal access. The daily scheduled callback also reconciles any due annual terms, marks the member account inactive, and records the term as expired. Lifetime membership does not have an expiry date.

When an expired member submits a new membership application with the same email address and exact PAN, the system securely matches the existing account, retains its Member ID, password, profile, projects, service requests and support history, and creates a new membership cycle. A new setup-password email is not sent on renewal because the verified member keeps the existing account credentials.

## Production activation

The callback route is ready at `POST /api/scheduled/membership-expiry`. It only accepts platform-authenticated scheduled requests and verifies the persisted scheduler task UID before it changes member records. The daily schedule must be created **only after the site is published**, because scheduled callbacks target the deployed application rather than this preview server.

After publication, create one daily UTC scheduled job for the callback, persist its task UID in the `membership_expiry_automation` configuration row, and confirm its first execution in the schedule history. The handler is idempotent: re-running it never creates duplicate membership cycles or changes a lifetime membership.

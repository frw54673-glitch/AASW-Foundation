# Member Dashboard Visual Comparison

The dashboard refinement is **frontend-only**. Member identity, membership expiry, project record, certificate eligibility, routes, queries and backend behavior remain unchanged.

![Desktop before and after comparison](../member-dashboard-before-after.png)

| Area | Before | After |
|---|---|---|
| **KPI cards** | Existing four-card row with uniform treatment. | Equal-width cards, compact labels, individual green/blue/light-green/amber accents, and a pill-style active state. |
| **Primary two-column section** | Project and password sections used different visual spacing and proportions. | Equal `1fr / 1fr` grid with a 24px gap, top-aligned panels, strengthened form treatment, status-colored project card and one-line project metadata. |
| **Certificate & details** | Certificate sat within the left content stack. | Full-width light-green certificate action panel followed by a clear two-by-two membership detail grid. |
| **Mobile breakpoint** | Previous layout inherited desktop-first spacing. | At 768px and below: 2×2 KPI cards, stacked Project/Password panels, full-width vertical certificate actions, one-column details, and icon-only certificate header action. |

> The authenticated browser tooling captures the desktop account session. The dashboard’s mobile rules are implemented in the scoped `member-dashboard.css` breakpoint and covered by responsive source-level regression checks; the separate preview capture does not carry the authenticated member session.

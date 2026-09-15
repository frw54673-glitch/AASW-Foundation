# Team Grouping Visual QA

**Date:** 14 August 2026

The public `/team` route was reviewed at desktop (1280×720) and mobile (390×844) viewports after the roster reorganisation.

| Check | Result |
| --- | --- |
| All People hierarchy | Passed — Leadership appears first, followed by Central Advisory, Digital Trainers and State Council Members. |
| Leadership grouping | Passed — Patron, Founder and Co-Founder appear together under one clear heading. |
| Central Advisory grouping | Passed — all fourteen verified Central Advisory portrait cards appear under the Central Advisory heading. |
| State Council grouping | Passed — all seventeen source-backed name-only cards appear under State Council Members with the existing portrait-unavailable disclosure. |
| Desktop layout | Passed — section headers, divider rhythm, card grids and footer remain readable. |
| Mobile layout | Passed — section headers stack cleanly and the card grid changes to one column without horizontal overflow. |

The live public route exposes the five expected controls—All People, Leadership, Advisory, Trainers and State Council—and the All People view reports 37 people. Browser extraction confirmed the section order and all roster counts in the rendered page.

The **Advisory** filter was selected during live browser QA. It reduced the page to 14 people and retained the **Central Advisory** heading with all fourteen verified member cards, confirming that the category view preserves the requested grouping rather than reverting to an unlabelled grid.

The **State Council** filter was also selected during live browser QA. It reduced the view to the 17 official State Council records, retained the **State Council Members** heading and preserved the clear source-portrait-unavailable label on every name-only card.

No member names, roles or portraits were invented or altered during this layout-only change.

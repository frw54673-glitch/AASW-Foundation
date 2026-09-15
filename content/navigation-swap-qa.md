# Navigation Priority Swap QA

Navigation hierarchy was reviewed on 12 August 2026 after moving Membership and Donate into the primary header positions.

| Surface | Result |
| --- | --- |
| Desktop homepage header | Passed. The primary order is now About, Membership, Donate; the existing support CTA remains visible. |
| Mobile homepage header | Passed. The responsive menu trigger remains clear, and both desktop/mobile navigation read from the same primary item configuration. |
| About mega-menu configuration | Passed by unit test. The two removed Membership/Donate items are replaced with Impact and Transparency, retaining every requested route. |

All navigation labels and routes are covered by the updated configuration test.

## Opened-menu interaction evidence

Automated browser interaction verified both expanded states. On desktop, hovering About opens the mega-menu and exposes **Impact** and **Transparency** in its final group. On mobile, opening the header menu keeps **Membership** and **Donate** as the primary items; expanding About exposes **Impact** and **Transparency** beneath the institutional links. Screenshots are retained in the external QA workspace.

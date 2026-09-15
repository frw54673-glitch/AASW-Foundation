# AASW Foundation — Design Direction

## Approach 1: Human-first Civic Editorial

### Theme Name
**Human-first Civic Editorial**

### Very Brief Intro
Warm editorial storytelling, grounded Indian community cues, and clear action pathways. The experience should feel credible enough for donors, welcoming enough for volunteers, and human enough for the women and communities AASW serves.

### Probability
0.07

## Approach 2: Quiet Institutional Modernism

### Theme Name
**Quiet Institutional Modernism**

### Very Brief Intro
A restrained, document-led system with cool neutrals, precise typography, and a trust-first presentation of programs, reports, and governance. Designed to make due diligence feel effortless.

### Probability
0.03

## Approach 3: Harvest & Hope

### Theme Name
**Harvest & Hope**

### Very Brief Intro
Earthy colors, optimistic photography, and tactile shapes turn the website into a hopeful campaign space. The mood is energetic and celebratory, with a stronger emphasis on movement and community participation.

### Probability
0.09

## Selected Approach: Human-first Civic Editorial

### Design Movement
Contemporary civic editorial design with Indian vernacular warmth: part impact report, part community noticeboard, part campaign landing page.

### Core Principles
1. **People before abstraction:** Every major section should connect the organization to a person, place, or tangible outcome.
2. **Trust through clarity:** Donation, programs, governance, reports, and contact pathways should be visible, legible, and never hidden behind visual cleverness.
3. **Warm precision:** Editorial hierarchy and generous whitespace keep the site composed; organic accents and documentary imagery keep it alive.
4. **Action with dignity:** CTAs invite participation without guilt-heavy language or inflated claims.

### Color Philosophy
The foundation is a deep **Jamun Ink** for authority and legibility, balanced with **Rice Paper** and **Sand Mist** for warmth. **Neem Green** signals growth and long-term community work, while a restrained **Marigold Ochre** marks moments that deserve action: donate, join, read the latest update. The palette should feel rooted in India without becoming decorative or festival-like.

### Layout Paradigm
Use an editorial rail rather than a generic centered marketing grid: a slim vertical label column, wide copy blocks, offset image crops, and horizontal story strips. Key sections should alternate between full-bleed evidence and quiet reading space. On mobile, the rail collapses into eyebrow labels while the hierarchy remains intact.

### Signature Elements
1. A slim **vertical chapter rail** with rotated section labels on desktop.
2. A recurring **sun-disc marker**: a small ochre circle with a notch, used for impact metrics, section starts, and active states.
3. **Paper-edge image crops** with slightly irregular corners and a fine green rule, suggesting reports, field notes, and lived experience.

### Interaction Philosophy
Interactions should feel like turning a page or opening a field note: quick, tactile, and reversible. Navigation remains obvious; hover states reveal context, not decoration. Donation and volunteer actions should have immediate visual confirmation, while unsupported actions should never pretend to be live.

### Animation
Use short 180–260ms ease-out transitions for buttons, cards, and navigation. On first view, text blocks rise by 10px with a staggered 50ms rhythm; images reveal through a soft clip-path mask. Avoid looping motion except for a very subtle sun-disc drift in the hero. Respect `prefers-reduced-motion` by removing entrance transforms and decorative movement.

### Typography System
Use **DM Serif Display** for high-emotion headlines and **Plus Jakarta Sans** for body copy, navigation, metadata, and UI. Headlines use tight tracking and occasional italic emphasis; body copy stays at 1.65 line-height with a 65ch reading measure. Labels are uppercase, small, and widely tracked. Never use Inter.

### Brand Essence
**AASW Foundation helps communities turn care into capability, especially for women and underserved families, through practical programs and accountable action.**

Personality: **grounded, hopeful, accountable**.

### Brand Voice
Headlines are direct and human, not grandiose. CTAs are specific and calm. Microcopy explains what happens next and avoids pressure.

Example lines:

> **A safer beginning can change an entire family’s future.**

> **See where your support becomes a skill, a livelihood, and a little more choice.**

### Wordmark & Logo
Retain the recognizable AASW monogram as a bold symbol rather than rebuilding the full wordmark in a default typeface. The mark concept is a compact four-lobed sun/flower: four human forms meeting around a small open center, representing dignity, collaboration, and shared possibility. Use the graphic mark in the header and favicon; pair it with a custom-tracked uppercase wordmark in the lockup.

### Signature Brand Color
**Neem Green — `#2F6B52`**. It owns the balance between care and capability: organic enough for community work, confident enough for an institution, and distinct from the usual NGO blue.

## Implementation Guardrails

- Preserve factual content from the provided source; do not invent beneficiary counts, reviews, testimonials, or certifications.
- Use only real content and existing source assets where available; any generated visual should be treated as a supporting hero asset, not evidence of real field work.
- Keep donation, membership, programs, stories, reports, team, governance, contact, privacy, and refund routes discoverable.
- Add accessible focus states, semantic landmarks, descriptive alt text, and mobile-first navigation.
- Every edited CSS, component, and page file should begin with a short reminder of this selected design philosophy.

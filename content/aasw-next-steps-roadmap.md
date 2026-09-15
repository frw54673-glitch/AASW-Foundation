# AASW Foundation Website — Complete Next-Steps Roadmap

**Prepared for:** AASW Foundation  
**Current build checkpoint:** `3603ee92`  
**Validation status:** 48 passing test files, 155 passing tests, TypeScript clean, and production build successful.

## 1. Abhi website me kya-kya ready hai

AASW website ka public-facing experience, Member Portal, Foundation Admin workspace aur MIS workflows ek integrated system ke roop me ready hain. Public site me people-first editorial design, official AASW content, responsive navigation, Programme/Team/Transparency pages, Donation and Membership forms, Media Centre, Contact Us, verified Rura map, public field-photo gallery, SEO metadata, mobile responsiveness and a floating WhatsApp contact action included hain.

Member side par immediate activation, unique Membership ID, secure password setup/reset, member dashboard, certificate PDF, profile photo, projects, service requests, support chat, membership history, renewal journey, countdown, three-day grace period and animated secure login experience ready hai. Foundation Admin me memberships, enquiries, donations, service requests, support inbox, member assignment and media management workflows available hain. MIS me project, beneficiary, event, delivery, operations, governance, role controls and audit-style workspaces available hain.

| Area | Current status | Important note |
|---|---|---|
| Public website and mobile design | Ready | Responsive and source-backed content only |
| Membership application and Member Portal | Ready | Immediate account activation and renewal matching included |
| Donation/Membership checkout | Demo-ready | Live Razorpay keys still required for real payments |
| Foundation Admin and MIS | Ready | Real owner-session QA is still advisable before operational launch |
| Contact Us and inquiry handling | Ready | Map points to the owner-provided Rura location |
| WhatsApp floating contact button | Ready | Opens verified public AASW WhatsApp contact action |
| SEO and performance improvements | Ready | Published-domain Lighthouse review is still recommended |
| Testimonials carousel | Framework ready | It deliberately stays empty until real approved testimonials are supplied |

## 2. Sabse pehla next kaam — Publish and membership automation

The highest-priority step is to publish the latest checkpoint. Publication is the dependency for reliable daily server-side automation. Once the site is live, the two existing daily membership jobs can be created and their task UIDs recorded:

| Daily job | What it does | Safety behaviour |
|---|---|---|
| Membership expiry reconciliation | Checks annual memberships after the three-day grace window and closes overdue portal access | Idempotent; does not affect lifetime memberships |
| Membership reminder pipeline | Sends a one-time seven-day pre-expiry email and a one-time post-grace follow-up email | Audited delivery state, duplicate prevention, retry limit of three |

The post-grace email is already implemented. It only targets an **expired annual cycle** at least three days after its expiry date, and it skips a cycle once it is renewed. The follow-up tells the member how to restore access by submitting the renewal flow with the same email and PAN; it does not expose PAN, address, uploaded proof documents or other sensitive data.

> **What you need to do:** Click **Publish** once in the project panel. After that, send the word **“published”** in chat. The daily task creation, task-ID storage and first-run readiness check can then be completed on your behalf.

## 3. Content and trust upgrades after publication

The next practical priority is to keep the public website fresh with real Foundation evidence and no placeholder content. This is especially important for an NGO because trust comes from authentic field activity, transparent reports and clearly sourced people/programme information.

| Upgrade | What you provide | What will be implemented |
|---|---|---|
| Google Drive field-photo sync | Shared Drive folder link and service-account access | Safe import, duplicate handling, draft review and public gallery publishing workflow |
| Real testimonials | Exact quote, person/organisation name, role if approved, and publishing permission | Responsive smooth carousel with only approved testimonials |
| Latest reports | Approved PDFs, annual report links, audited statements or policy documents | Updated Reports/Transparency resources with clear download/view actions |
| Programme updates | Approved field notes, milestones, photographs and captions | Fresh stories, impact cards and Media Centre updates |

No client testimonial, rating, name or impact statistic should be invented. The website is already designed to wait for authentic approved information instead of displaying misleading reviews.

## 4. Payments and membership business operations

The current Donation and Membership checkout UI runs in clear **demo mode**, so no money is collected accidentally. When AASW is ready for live payments, Razorpay can be activated without redesigning the forms.

| Required item | Purpose | Current status |
|---|---|---|
| Razorpay Key ID and Key Secret | Secure live order creation and verification | Pending owner input |
| Razorpay webhook secret | Verifies payment events server-side | Pending owner input |
| Final donation receipt wording | Matches Foundation accounting and donor communications | Review recommended |
| Refund/cancellation policy | Public transparency and support consistency | Review recommended |

After live payment activation, the recommended QA sequence is a small real donation, webhook verification, receipt delivery verification and Foundation Admin transaction review. No real payment should be tested until the official keys and organisational approval are available.

## 5. Analytics, conversions and growth measurement

Google Analytics was intentionally kept on hold. The site is prepared for a privacy-conscious GA4 activation path that can track **successful Contact Us submissions** and **WhatsApp button clicks** without sending message content, PAN data, address data, IDs or other inquiry details to analytics.

| Needed from owner | Tracking that becomes available |
|---|---|
| GA4 Measurement ID | Website visits, source/medium, page journeys and device trends |
| Consent/privacy wording confirmation | Clear disclosure before analytics is enabled |
| Conversion naming preference | Contact-submit and WhatsApp-click goals in your analytics reports |

Recommended monthly dashboard metrics are visitors, mobile versus desktop usage, top programme pages, completed membership applications, donation-starts, verified payment completions, Contact Us conversions and WhatsApp clicks. Analytics should guide decisions, not collect private member content.

## 6. WhatsApp renewal reminder — what is possible

Automated WhatsApp renewal reminders are possible, but the existing floating website button is **not** a bulk-messaging system. Before automating reminders, AASW needs a WhatsApp Business API provider/account, secure API credentials, an approved template, and a member opt-in plus opt-out method. Meta requires an opt-in before a business messages a person on WhatsApp, and businesses must make clear which business will message the person.[1] Template messages are the supported route for contacting people outside the customer-service window, and the template must be approved before it can be sent.[2]

| Safe activation prerequisite | Why it is required |
|---|---|
| WhatsApp Business API account/provider | Authenticated delivery channel |
| Approved utility template | Compliance for scheduled renewal messages |
| Explicit member opt-in | Permission to receive WhatsApp notifications |
| Clear opt-out method | Members can stop further notifications |
| Published website and active daily jobs | Reliable lifecycle trigger |

The recommended implementation sends at most one seven-day renewal message and one post-grace message per eligible membership cycle, only to opted-in members. Email remains the active official reminder channel until those prerequisites are fulfilled.

## 7. Security, operations and governance improvements

The current system already separates Member Portal authentication from Foundation staff authentication, uses hashed member credentials, short-lived setup/reset actions, role controls and server-side data boundaries. The next operational improvements should be managed as a launch checklist.

| Priority | Improvement | Outcome |
|---|---|---|
| High | Owner-led admin/mobile QA with real records | Confirms daily operational workflow before launch |
| High | Publish and activate lifecycle schedules | Ensures expiry, reminder and follow-up automation runs daily |
| High | Backup/export review for membership, donations, enquiries and MIS | Clear recovery and reporting process |
| Medium | GA4 conversion tracking | Measures real public engagement safely |
| Medium | Real payment activation | Enables donations and paid membership checkout |
| Medium | WhatsApp Business reminder integration | Adds an opt-in communication channel |
| Medium | Drive gallery ingestion | Reduces manual field-photo publishing work |
| Ongoing | Quarterly content/report refresh | Keeps public trust information current |

## 8. Recommended execution order

The most practical order is shown below. It avoids activating a system before its dependencies, data and review process are ready.

1. **Publish the latest checkpoint.**
2. **Activate daily membership expiry and reminder jobs.** The post-grace follow-up is already included in the reminder pipeline.
3. **Perform owner-admin QA using real approved records.** Review applications, enquiries, programme requests, support conversations and gallery publishing.
4. **Provide Drive gallery details and real approved testimonials.** This keeps media and trust content authentic.
5. **Choose GA4 and live Razorpay activation.** Provide the Measurement ID and the approved payment keys when ready.
6. **Set up WhatsApp Business reminders.** First complete opt-in, approved template and Business API requirements.
7. **Run a published-domain SEO/performance review.** A real published URL provides the correct production performance evidence.
8. **Maintain monthly content and quarterly governance updates.** Add reports, field stories, programme progress and official photos.

## 9. Owner handoff checklist

| When you are ready | Send this in chat | What will happen next |
|---|---|---|
| Publish | `published` | Daily expiry/reminder schedules will be activated and verified |
| Drive gallery | Folder link + service-account access | Automatic gallery sync will be configured safely |
| Testimonials | Approved quote + name/org + permission | Carousel will be populated with real testimonials |
| Google Analytics | GA4 Measurement ID | Contact and WhatsApp conversion tracking will be enabled |
| Razorpay | Key ID, Key Secret, webhook secret | Demo checkout will move to real payment mode |
| WhatsApp reminders | Provider/API credentials + approved template + opt-in decision | Compliant reminder integration can begin |

## References

[1]: https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in "Meta for Developers — Get opt-in for WhatsApp"
[2]: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview "Meta for Developers — Template fundamentals"

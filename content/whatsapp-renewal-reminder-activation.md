# AASW WhatsApp Renewal Reminder Activation

## Current state

The website has a verified public WhatsApp contact action. It is not a bulk-notification channel and does not send any member data. The membership lifecycle email automation remains the active renewal communication route.

## Conditions before automated WhatsApp reminders

Automated renewal reminders must remain disabled until AASW has all of the following: a WhatsApp Business Account and business phone number, a secure provider/API credential, an approved message template, and recorded member opt-in with a clear opt-out method. Meta requires businesses to obtain opt-in before messaging people on WhatsApp, to identify the business, and to comply with applicable laws.[1]

Renewal notices sent outside a customer-service window must use an approved template message. Meta states that template messages are the messaging route for users outside that window and that a template must be approved before it can be sent.[2]

| Required owner input | Purpose | Current state |
|---|---|---|
| WhatsApp Business API provider and credentials | Authenticated message delivery | Not supplied |
| Approved renewal template name and language | Compliant reminder content | Not supplied |
| Member WhatsApp opt-in and opt-out record | Permission and delivery scope | Not collected |
| Published AASW site | Reachable daily lifecycle callback | Pending publication |

## Intended safe behaviour after activation

Only members with a recorded WhatsApp opt-in will receive a utility-style renewal reminder. The automation will send at most one seven-day notice and one post-grace follow-up per membership cycle, retain delivery state for audit and retries, never send PAN, address, ID documents or inquiry content, and honour an opt-out before subsequent delivery.

## References

[1]: https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in "Meta for Developers — Get opt-in for WhatsApp"
[2]: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview "Meta for Developers — Template fundamentals"

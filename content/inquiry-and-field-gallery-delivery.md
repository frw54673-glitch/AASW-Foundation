# Inquiry and Field Gallery Delivery

## Current public delivery

The Contact Us page now includes a public inquiry form that validates the visitor’s name, email, phone number, topic, message and consent. It includes a hidden honeypot field, persists accepted submissions with a reference number, and triggers a Foundation Gmail notification. A failed notification is recorded without discarding the message, so staff follow-up records remain available.

The new `/field-gallery` route presents five source-backed photographs already audited from the official AASW Foundation website. The Media Centre and its responsive navigation expose the gallery directly. The gallery does not include generated, stock or unverified visual content.

## QA result

Desktop and 375 px mobile QA confirmed that the inquiry fields and consent control remain readable, the form stacks correctly on small screens, the success-state layout has a clear reference path, and all field-gallery cards retain complete captions and photographs across breakpoints.

The homepage impact-story section now also provides a direct “See the field gallery” action, giving visitors a source-backed path from the featured field photograph to the complete gallery on both desktop and mobile layouts.

## Future Google Drive activation

Automatic Google Drive ingestion remains intentionally inactive until the Foundation provides a shared source-folder ID and read-only service-account access. Once those secure inputs are configured, the folder sync will extend the same public gallery record rather than replace the audited current images.

## References

[1]: https://www.aaswfoundation.com/ "AASW Foundation official website"
[2]: https://developers.google.com/workspace/drive/api/guides/manage-sharing "Google Drive API: Share files, folders, and drives"
[3]: https://developers.google.com/workspace/drive/api/guides/push "Google Drive API: Notifications for resource changes"

# Foundation Drive Field-Photo Sync Specification

## Purpose and present boundary

This specification governs the future ingestion of Foundation-approved field photographs from one shared Google Drive folder into the existing AASW public gallery. The feature is **prepared but inactive**: saving a folder link records only the planned source and preferred cadence. No Google Drive file can be read, copied, published, or removed until the Foundation provides authorised server-side access and the owner deliberately enables the integration.

| Area | Foundation rule | Safe system behaviour |
| --- | --- | --- |
| Folder eligibility | Use one Foundation-owned shared folder containing only images that AASW is entitled to use publicly or internally. | The admin must save a valid folder link/ID; the system retains a `needs_access` status until authorisation is available. |
| Intake | JPG, PNG and WebP images are the supported gallery types; each import needs an accurate editorial title, description, alt text and quarter. | Each newly imported item is created as a **draft**. It is never publicly visible on arrival. |
| Duplicate key | A Google Drive file ID is the only duplicate identity. File names are not unique and are never used as an identity key. | The importer database path looks up `sourceFileId` before any write: new file ID → create draft; existing Drive file ID → update the existing record; archived Drive file ID → skip; a matching manual/archive record → flag conflict and make no changes. |
| Publishing | Foundation staff decide when each draft is ready for the public gallery. | Only an explicit admin status change to `published` enters the public feed. Existing manual uploads are not altered by Drive sync. |
| Cadence | The Foundation can choose 12-hourly, daily, every three days or weekly checks after authorisation. | The saved interval is a preference only until a reviewed background job is enabled after deployment. |
| Review ownership | A Foundation administrator owns each import’s editorial verification, consent review, caption, alt text and display order. | The import path stores provenance as `google_drive`, records the Drive file ID and does not auto-publish. |

> **Access prerequisite:** The Foundation must provide the intended shared-folder link and grant the designated service identity read access. The credential stays server-side and is never stored in browser code or exposed in the public gallery.

## Activation checklist

After the Foundation supplies the folder and authorised access, the implementation will validate access with a non-destructive listing, create a scheduled importer at the selected cadence, download permitted source images to managed storage, apply the duplicate policy above, create only draft items, and write a reviewable sync outcome. Foundation staff will then use the existing admin workspace to set captions, order and explicit publish status.

# Custom Notification Delivery

The AASW notification layer uses custom, dismissible toast cards rather than default browser alerts. Each card exposes either an assertive error alert or a polite success, warning or information status, carries a descriptive title and optional context, and provides an explicitly labelled dismiss control.

| State | AASW treatment | Current use |
| --- | --- | --- |
| Success | Neem green on a soft green surface | Contact inquiry confirmation; project and delivery records. |
| Error | Red on a soft red surface | Failed inquiry and MIS actions. |
| Warning | Amber on a soft amber surface | Missing required inquiry details. |
| Information | Blue on a soft blue surface | A required Project MIS selection. |

Mobile verification confirms the Contact Us page retains its existing responsive editorial layout after the global notification renderer was introduced. The protected MIS route remains behind authentication and does not disclose management data without a user session.

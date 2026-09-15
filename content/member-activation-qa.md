# Immediate Member Activation QA

## Desktop visual review

The public `/member/login` route renders a dedicated AASW-branded Member Login page with a Membership ID-or-email field, password visibility control, sign-in state, help contact and a clear statement that the member account is separate from Foundation management systems.

The public `/member/setup-password` route without a token renders the intended safe invalid-link state. It does not disclose any account information and directs the applicant to request Foundation assistance. The valid state is conditionally rendered only after the one-time setup token is verified server-side through the member tRPC procedure.

No production member accounts or test applicants were inserted during this visual review.

## Mobile visual review

At a 390×844 viewport, the access shell switches from the desktop split layout to a clear stacked layout. The Foundation identity, login fields, password visibility control, sign-in action and administrator-help link remain visible without horizontal overflow. The invalid setup-token state also remains readable and clearly directs the user to administrator assistance.

## Member portal extension review

The public password recovery route renders a generic email-request form and does not disclose whether an account exists. The assigned-project route is protected by the separate member-session identity. The Foundation admin assignment route is protected by the existing admin identity and provides a dedicated navigation entry. The visual capture used the expected loading state while its protected account queries settled; no member, project, or assignment fixture data was created for QA.

After the member identity query settled in a browser, the signed-out `/member/projects` route displayed the intended **Member login required** state and a direct Member Login action. It did not trigger the separate Manus OAuth flow.

## Authorised legacy-member validation

One user-authorised legacy member was imported with a bcrypt password hash and private identity-proof storage key; no identity-document number, image, full address, PAN value or password is displayed in this record. Browser QA confirmed the Membership ID login creates the separate member session and renders the member dashboard with the member’s name, Membership ID and active account state. The member-project workspace remains correctly empty until the Foundation creates a real MIS project and makes an explicit assignment; no placeholder project was created for this check.

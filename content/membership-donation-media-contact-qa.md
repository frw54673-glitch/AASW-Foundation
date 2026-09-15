# Expanded Membership, Donation and Navigation QA

The latest Membership, Donation, Media Centre and Contact Us experiences were reviewed at desktop (1440px) and mobile (375px) widths.

| Surface | Result |
| --- | --- |
| Membership | Required district, PAN, proof-type and ID-proof upload controls are visible and stack correctly on mobile. The application form explains restricted document handling. |
| Donation | The separate required-details form presents all requested contact, DOB, PAN, India, State, city, address and Pincode controls, alongside ₹2,000/₹4,000/₹8,000/₹16,000 and custom-amount choices. |
| Media Centre | New page renders public updates, stories, reports and a direct Foundation media-enquiry path. |
| Contact Us | New page renders the verified Foundation email, phone number and Rura/Kanpur Dehat address with distinct Membership and Donation next steps. |
| Navigation | Desktop and mobile interaction script opened What We Do, Transparency, Media Centre and Contact Us menus, verified their expected routes, and confirmed Media Centre/Contact Us appear before Membership. |

No actual identity document or donor record was entered during visual QA.

Automated browser checks separately confirmed that incomplete Membership submissions display the required State, District, PAN, ID-proof type, ID-proof upload and consent errors, and that incomplete Donation submissions display errors for every required donor detail. Neither incomplete flow opened the demo checkout.

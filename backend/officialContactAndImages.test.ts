import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AASW_CONTACT } from "../shared/organisationContact";

const projectRoot = resolve(import.meta.dirname, "..");
const contactPageSource = readFileSync(resolve(projectRoot, "frontend/src/pages/MediaContactPages.tsx"), "utf8");
const contactNavigationSource = readFileSync(resolve(projectRoot, "frontend/src/components/AboutMegaMenu.tsx"), "utf8");
const contactStylesSource = readFileSync(resolve(projectRoot, "frontend/src/index.css"), "utf8");

describe("official AASW contact and homepage field imagery", () => {
  it("keeps the verified public contact, location and map details in one shared source", () => {
    expect(AASW_CONTACT).toMatchObject({
      email: "aaswfoundation06@gmail.com",
      primaryPhoneDisplay: "+91 99841 56418",
      secondaryPhoneDisplay: "+91 70072 76735",
      officeHours: "Mon–Sat: 10:00 AM–6:00 PM",
      address: "Ward No. 2, Ambedkar Nagar, Rura, Kanpur Dehat, Uttar Pradesh 209303, India",
    });
    expect(AASW_CONTACT.mapsUrl).toBe("https://maps.app.goo.gl/jkWptd4CRqit7FbE9");
    expect(AASW_CONTACT.whatsappHref).toContain("wa.me/919984156418");
  });

  it("uses the uploaded official field photos rather than illustrative homepage placeholders", () => {
    const source = readFileSync(resolve(projectRoot, "frontend/src/pages/Home.tsx"), "utf8");
    for (const photo of ["aasw-field-session_43c9b878.jpeg", "aasw-women-learning_f22d8267.jpeg", "aasw-green-workshop_8f06b6fa.jpeg", "aasw-digital-skills_2dde7820.jpeg", "aasw-community-mentorship_ffb5bf0b.jpeg"]) {
      expect(source).toContain(photo);
    }
    expect(source).not.toContain("Illustrative editorial visual");
  });

  it("uses a Get in Touch hierarchy built only from shared AASW contact data, not third-party contact records", () => {
    expect(contactPageSource).toContain("Get in touch.");
    expect(contactPageSource).toContain("Contact AASW");
    expect(contactPageSource).not.toContain("Reach the<br");
    expect(contactPageSource).toContain("Corporate partnerships");
    expect(contactPageSource).toContain("Donation & membership");
    expect(contactPageSource).toContain("General enquiries");
    expect(contactPageSource).toContain("Helpdesk");
    expect(contactPageSource).toContain("Visit us here");
    expect(contactPageSource).toContain("AASW_CONTACT.email");
    expect(contactPageSource).not.toContain("smilefoundationindia.org");
  });

  it("labels the Contact Us dropdown Get in Touch and preserves shared verified Email and Call actions", () => {
    expect(contactNavigationSource).toContain('label: "Get in Touch"');
    expect(contactNavigationSource).not.toContain('label: "Reach the Foundation"');
    expect(contactNavigationSource).toContain('label: "Email AASW", href: AASW_CONTACT.emailHref');
    expect(contactNavigationSource).toContain('label: "Call AASW", href: AASW_CONTACT.primaryPhoneHref');
  });

  it("keeps official-location text and map action readable on its dark-green panel", () => {
    expect(contactStylesSource).toContain(".visit-us-map .section-kicker { color:#f7d789; }");
    expect(contactStylesSource).toContain(".visit-us-map strong { margin:.8rem 0; color:#fffdf7;");
    expect(contactStylesSource).toContain(".visit-us-map p { max-width:290px; margin:0 0 1.5rem; color:#e6eee8;");
    expect(contactStylesSource).toContain(".visit-us-map a { width:max-content; color:#fffdf7;");
  });
});

import { useState } from "react";
import { ArrowUpRight, Camera, FileText, Mail, MapPin, Megaphone, MessageCircle, Phone, Users } from "lucide-react";
import { InnerPageShell, InnerSection } from "@/components/InnerPageShell";
import { ContactInquiryForm } from "@/components/ContactInquiryForm";
import { AASW_CONTACT } from "@shared/organisationContact";
import { CURATED_FIELD_GALLERY } from "@shared/fieldGallery";
import { trpc } from "@/lib/trpc";

const mediaLinks = [
  { icon: Megaphone, label: "News & updates", title: "The latest from the field.", copy: "Read dated announcements and field notes from the Foundation.", href: "/updates", action: "Open updates" },
  { icon: Users, label: "Impact stories", title: "The people we work with.", copy: "Explore people-first stories about capability, livelihoods and community.", href: "/stories", action: "Explore impact" },
  { icon: Camera, label: "Field gallery", title: "Photos from our programmes.", copy: "View source-backed photographs from AASW’s published field record.", href: "/field-gallery", action: "Open gallery" },
  { icon: FileText, label: "Reports & records", title: "Reports and documents.", copy: "Find public documents, governance links and an information-request route.", href: "/reports", action: "View reports" },
];

export function MediaCentrePage() {
  return <InnerPageShell activePath="/media-centre" chapter="09A / MEDIA CENTRE" eyebrow="Media Centre" title={<>News, stories<br /><em>and reports.</em></>} intro="The Media Centre brings together the Foundation’s public updates, impact stories, field photographs and document-led resources in one place."><InnerSection><div className="media-centre-intro"><div><p className="eyebrow"><span className="eyebrow-dot" />Public information</p><h2>Follow the<br /><em>Foundation’s work.</em></h2></div><p>Use these paths to follow AASW’s programmes, public information and field updates. For a media or information request, contact the Foundation directly.</p></div><div className="media-centre-grid">{mediaLinks.map(({ icon: Icon, label, title, copy, href, action }) => <article key={label}><Icon size={28} /><span className="section-kicker">{label}</span><h3>{title}</h3><p>{copy}</p><a href={href} className="text-link">{action} <ArrowUpRight size={15} /></a></article>)}</div></InnerSection><InnerSection className="inner-section-ink"><div className="media-contact-band"><Mail size={26} /><div><span className="section-kicker">Media enquiries</span><h2>Write to the<br /><em>Foundation team.</em></h2><p>For a media enquiry, report request or public information question, write directly to AASW Foundation.</p></div><a className="button button-ochre" href={`${AASW_CONTACT.emailHref}?subject=Media%20enquiry%20for%20AASW%20Foundation`}>Email AASW <ArrowUpRight size={16} /></a></div></InnerSection></InnerPageShell>;
}

export function FieldGalleryPage() {
  const publishedMedia = trpc.media.list.useQuery({ limit: 50 });
  const managedItems = (publishedMedia.data ?? []).map((item) => ({ id: item.mediaRef, imageUrl: item.imageUrl, title: item.title, description: item.description, quarter: item.quarter, alt: item.altText }));
  const galleryItems = [...managedItems, ...CURATED_FIELD_GALLERY];
  return <InnerPageShell activePath="/media-centre" chapter="09C / FIELD GALLERY" eyebrow="Field gallery" title={<>Our work<br /><em>in photos.</em></>} intro="A visual record of AASW Foundation’s published field moments across learning, enterprise and community practice."><InnerSection><div className="field-gallery-intro"><div><p className="eyebrow"><span className="eyebrow-dot" />Published field record</p><h2>People, practice<br /><em>and participation.</em></h2></div><p>Each image in this gallery is drawn from AASW Foundation’s published visual record. The gallery is designed to keep field moments visible without adding unsupported claims or stock imagery.</p></div><div className="field-gallery-grid">{galleryItems.map((item, index) => <figure key={item.id} className={index === 0 ? "field-gallery-featured" : ""}><div className="field-gallery-image"><img src={item.imageUrl} alt={item.alt} /><span>{item.quarter}</span></div><figcaption><p className="section-kicker">{String(index + 1).padStart(2, "0")} / AASW Foundation</p><h3>{item.title}</h3><p>{item.description}</p></figcaption></figure>)}</div></InnerSection><InnerSection className="inner-section-ink"><div className="field-gallery-closing"><Camera size={26} /><div><span className="section-kicker">A living field record</span><h2>More field moments,<br /><em>added over time.</em></h2><p>As AASW publishes more verified field photographs, this gallery will keep the public record close to the work.</p></div><a href="/contact-us" className="button button-ochre">Share an inquiry <ArrowUpRight size={16} /></a></div></InnerSection></InnerPageShell>;
}

export function ContactUsPage() {
  const routes = [
    { icon: Users, label: "Corporate partnerships", title: "Partner with AASW.", copy: "For CSR, institutional collaboration or a programme partnership, start with the Foundation’s verified contact desk.", actions: [{ href: AASW_CONTACT.emailHref, label: AASW_CONTACT.email, icon: Mail }, { href: AASW_CONTACT.primaryPhoneHref, label: AASW_CONTACT.primaryPhoneDisplay, icon: Phone }] },
    { icon: MessageCircle, label: "Donation & membership", title: "Donation & membership support.", copy: "For donation support, membership questions or receipt follow-up, write to AASW or call during office hours.", actions: [{ href: AASW_CONTACT.emailHref, label: AASW_CONTACT.email, icon: Mail }, { href: AASW_CONTACT.secondaryPhoneHref, label: AASW_CONTACT.secondaryPhoneDisplay, icon: Phone }] },
    { icon: Mail, label: "General enquiries", title: "Ask us anything.", copy: "For programme, media, information or general Foundation questions, the AASW team will route your message to the right next step.", actions: [{ href: AASW_CONTACT.emailHref, label: AASW_CONTACT.email, icon: Mail }, { href: AASW_CONTACT.whatsappHref, label: "WhatsApp AASW", icon: MessageCircle, external: true }] },
  ];
  return <InnerPageShell activePath="/contact-us" chapter="09B / CONTACT" eyebrow="Contact AASW" title={<>Get in touch.<br /><em>We are listening.</em></>} intro="Email AASW or call the Foundation for a programme question, partnership idea, information request or support enquiry."><InnerSection><div className="get-in-touch-heading"><div><p className="eyebrow"><span className="eyebrow-dot" />Direct routes</p><h2>Choose how<br /><em>to reach us.</em></h2></div><p>Each contact route uses the same verified AASW Foundation desk, so a question can be received, recorded and directed with care.</p></div><div className="get-in-touch-grid">{routes.map((route) => { const Icon = route.icon; return <article key={route.label} className="get-in-touch-card"><Icon size={26} /><span className="section-kicker">{route.label}</span><h3>{route.title}</h3><p>{route.copy}</p><div className="get-in-touch-actions">{route.actions.map((action) => { const ActionIcon = action.icon; const isExternal = "external" in action && action.external === true; return <a key={action.label} href={action.href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noreferrer" : undefined}><ActionIcon size={14} />{action.label}</a>; })}</div></article>; })}</div></InnerSection><InnerSection className="inner-section-ink"><div className="get-in-touch-helpdesk"><div><span className="section-kicker">Helpdesk</span><h2>Send us<br /><em>a message.</em></h2><p>For grievances, suggestions and detailed queries, write to AASW here. Your message is securely recorded for Foundation follow-up.</p></div><ContactInquiryForm /></div></InnerSection><InnerSection><section className="visit-us-panel" aria-label="AASW Foundation headquarters details"><div className="visit-us-copy"><span className="section-kicker">Visit us here</span><h2>Head office<br /><em>in Rura.</em></h2><p>{AASW_CONTACT.address}</p><dl><div><dt>Phone</dt><dd><a href={AASW_CONTACT.primaryPhoneHref}>{AASW_CONTACT.primaryPhoneDisplay}</a><br /><a href={AASW_CONTACT.secondaryPhoneHref}>{AASW_CONTACT.secondaryPhoneDisplay}</a></dd></div><div><dt>Email</dt><dd><a href={AASW_CONTACT.emailHref}>{AASW_CONTACT.email}</a></dd></div><div><dt>Office hours</dt><dd>{AASW_CONTACT.officeHours}</dd></div></dl><a href={AASW_CONTACT.mapsUrl} target="_blank" rel="noreferrer" className="button button-primary">Get directions <ArrowUpRight size={16} /></a></div><div className="visit-us-map"><MapPin size={42} strokeWidth={1.4} /><span className="section-kicker">Official location</span><strong>{AASW_CONTACT.locationShort}</strong><p>Use Google Maps for the full route to AASW Foundation.</p><a href={AASW_CONTACT.mapsUrl} target="_blank" rel="noreferrer">Open live map <ArrowUpRight size={15} /></a></div></section></InnerSection><InnerSection className="inner-section-sand"><div className="contact-page-cta"><div><span className="section-kicker">A direct next step</span><h2>Ready to join<br /><em>or support?</em></h2><p>Membership and donation have their own dedicated flows. Use them when you are ready to apply or support the work.</p></div><div><a href="/membership" className="button button-primary">Apply for Membership <ArrowUpRight size={16} /></a><a href="/donate" className="text-link">Go to Donate <ArrowUpRight size={15} /></a></div></div></InnerSection></InnerPageShell>;
}

// Frequently asked questions — grouped, accordion-style, sourced from the site's own published flows.
const faqGroups = [
  {
    id: "donations",
    kicker: "Support & giving",
    title: "Donation questions",
    items: [
      { q: "How do I donate to AASW Foundation?", a: "Visit the Donate page, complete the donor details form and choose the amount you would like to give. Donation and Membership are separate flows with their own forms." },
      { q: "Will I receive a receipt for my donation?", a: "Yes. Every recorded donation generates a receipt. The thank-you page shows your receipt details immediately, and the recorded transaction is kept with the Foundation for follow-up." },
      { q: "Does AASW issue Section 80G tax-exemption receipts?", a: "The AASW live website states that tax-exempt contributions may be available under Section 80G. The Donate page carries the current tax-benefit context. Please confirm receipt and eligibility details with the Foundation before making a live donation." },
      { q: "How are my donation details protected?", a: "Donor details are recorded through the Foundation's secure backend. PAN and other sensitive identifiers are encrypted at rest, and payments run through a certified payment gateway." },
      { q: "Can a company or CSR programme donate?", a: "Yes. For CSR, institutional or partnership contributions, contact the Foundation directly through the Contact page so the team can route your proposal to the right desk." },
    ],
  },
  {
    id: "membership",
    kicker: "The member portal",
    title: "Membership questions",
    items: [
      { q: "How do I become an AASW member?", a: "Complete the membership application form on the Membership page. You will need your PAN, a government ID proof and basic contact details. Applications are reviewed and approved by the Foundation." },
      { q: "What is the difference between annual and lifetime membership?", a: "Annual membership runs for one year from your joining date and renews at the end of the term. Lifetime membership has no expiry date and does not require renewal." },
      { q: "How do I renew my membership?", a: "Log in to the member portal before or shortly after your term ends. The My membership section shows a renewal countdown and a Renew Membership link. Renew with the same email and the exact PAN used earlier so your existing Member ID, profile and history stay connected." },
      { q: "What happens if my membership expires?", a: "An annual term gets a three-day renewal grace period during which portal access remains open. After the grace period the member account is deactivated until renewal is completed — then the same Member ID is reactivated with the earlier details intact." },
      { q: "I forgot my member password. What do I do?", a: "Use the Forgot password link on the member login page. A recovery token is issued so you can set a new password securely. For help, contact the Foundation." },
    ],
  },
  {
    id: "volunteering",
    kicker: "Give your time",
    title: "Volunteering questions",
    items: [
      { q: "How can I volunteer with AASW?", a: "Complete the volunteer application form on the Volunteer page with your skills, availability and interests. The Foundation reviews applications and reaches out by email using the reference number issued on submission." },
      { q: "What kinds of roles are available?", a: "AASW works with mentors, speakers, event coordinators and field-support volunteers — both online and on the ground in Uttar Pradesh." },
      { q: "Can students or teams volunteer?", a: "Yes. Student groups, college teams and corporate volunteers are welcome. Mention your group context in the application message so the Foundation can plan a suitable engagement." },
    ],
  },
  {
    id: "trust",
    kicker: "Public information",
    title: "Transparency questions",
    items: [
      { q: "Where can I see AASW's reports?", a: "The Reports page is the front door to annual reports, governance documents and impact notes. Where a document is not yet published, you can request it directly from the Foundation team." },
      { q: "How is AASW governed?", a: "AASW's governance framework spans a Central Advisory Council, General Body, Board of Directors, Executive Committee and Programmes Division, with published policy pillars covering transparency, financial auditing, anti-corruption, conflict of interest, whistleblower protection and data privacy." },
      { q: "How do I request a document or information?", a: "Write to the Foundation from the Reports page or the Contact page. Information requests are recorded and answered by the Foundation team." },
    ],
  },
];

export function FaqPage() {
  const [openId, setOpenId] = useState<string | null>("donations-0");
  return <InnerPageShell activePath="/contact-us" chapter="09D / FAQ" eyebrow="Questions, answered" title={<>Common questions,<br /><em>clear answers.</em></>} intro="Common questions on donations, membership, volunteering and transparency — answered in one place, with direct routes to the Foundation team for anything else." heroImage="/manus-storage/aasw-community-gathering_31224a60.jpg" heroAlt="AASW community gathering visual">
    <InnerSection><div className="faq-heading" data-reveal><div><p className="eyebrow"><span className="eyebrow-dot" />Frequently asked questions</p><h2>Answers to<br /><em>common questions.</em></h2></div><p>These answers reflect the site's own published flows. If your question is not covered, the AASW team is one message away.</p></div>
      <div className="faq-groups">
        {faqGroups.map((group, groupIndex) => <section className="faq-group" key={group.id} aria-labelledby={`faq-${group.id}`} data-reveal data-reveal-delay={groupIndex > 0 && groupIndex < 4 ? String(groupIndex) : undefined}>
          <header><span className="section-kicker">{group.kicker}</span><h3 id={`faq-${group.id}`}>{group.title}</h3></header>
          <div className="faq-list">
            {group.items.map((item, index) => { const id = `${group.id}-${index}`; const open = openId === id; return (
              <article className={`faq-item ${open ? "faq-item-open" : ""}`} key={id}>
                <button type="button" className="faq-question" onClick={() => setOpenId(open ? null : id)} aria-expanded={open} aria-controls={`faq-panel-${id}`}><span>{item.q}</span><ArrowUpRight size={18} className="faq-chevron" aria-hidden="true" /></button>
                <div className="faq-answer" id={`faq-panel-${id}`} role="region" aria-label={item.q}><p>{item.a}</p></div>
              </article>
            ); })}
          </div>
        </section>)}
      </div>
    </InnerSection>
    <InnerSection className="inner-section-sand"><div className="faq-cta" data-reveal><div><span className="section-kicker">Still open?</span><h2>Ask AASW<br /><em>directly.</em></h2><p>Write to the Foundation team with your question, and it will be recorded and answered.</p></div><div><a className="button button-primary" href="/contact-us">Contact AASW <ArrowUpRight size={16} /></a><a className="text-link" href="/reports">See reports & transparency <ArrowUpRight size={15} /></a></div></div></InnerSection>
  </InnerPageShell>;
}

import { type FormEvent, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { notifyError, notifySuccess, notifyWarning } from "@/lib/notifications";

type Topic = "programmes" | "membership" | "donation" | "partnership" | "media" | "other" | "";
type FormState = { fullName: string; email: string; phone: string; topic: Topic; message: string; privacyConsent: boolean; website: string };
type FormErrors = Partial<Record<"fullName" | "email" | "phone" | "topic" | "message" | "privacyConsent", string>>;

const initialState: FormState = { fullName: "", email: "", phone: "", topic: "", message: "", privacyConsent: false, website: "" };

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (form.fullName.trim().length < 2) errors.fullName = "Please enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Please enter a valid email address.";
  if (form.phone.trim().length < 8 || !/^[0-9+()\-\s]+$/.test(form.phone.trim())) errors.phone = "Please enter a valid phone number.";
  if (!form.topic) errors.topic = "Please choose a topic.";
  if (form.message.trim().length < 15) errors.message = "Please share a little more detail so the Foundation can help.";
  if (!form.privacyConsent) errors.privacyConsent = "Please confirm that AASW may respond to this inquiry.";
  return errors;
}

function FieldError({ message }: { message?: string }) {
  return message ? <small className="inquiry-field-error" role="alert"><AlertCircle size={13} />{message}</small> : null;
}

export function ContactInquiryForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [reference, setReference] = useState<string | null>(null);
  const submission = trpc.inquiry.submit.useMutation({
    onSuccess: (result) => {
      setReference(result.inquiryRef);
      setForm(initialState);
      setErrors({});
      notifySuccess("Inquiry received", `Your reference is ${result.inquiryRef}. The Foundation team can now follow up.`);
    },
    onError: (error) => notifyError("Inquiry could not be sent", error.message),
  });

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field !== "website") setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReference(null);
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !form.topic) {
      notifyWarning("Please complete the required inquiry fields", "Review the highlighted information before sending your message.");
      return;
    }
    submission.mutate({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      topic: form.topic as Exclude<Topic, "">,
      message: form.message.trim(),
      privacyConsent: true,
      website: form.website || undefined,
    });
  };

  if (reference) {
    return <section className="inquiry-success" aria-live="polite"><span><CheckCircle2 size={28} /></span><div><p className="section-kicker">Message received</p><h2>Thank you for<br /><em>getting in touch.</em></h2><p>Your inquiry has been securely recorded and sent to the Foundation team for follow-up.</p><dl><div><dt>Inquiry reference</dt><dd>{reference}</dd></div><div><dt>Next step</dt><dd>Foundation follow-up</dd></div></dl><button type="button" className="text-link" onClick={() => setReference(null)}>Send another message <Send size={15} /></button></div></section>;
  }

  return <section className="contact-inquiry" aria-labelledby="contact-inquiry-heading"><div className="contact-inquiry-intro"><p className="eyebrow"><span className="eyebrow-dot" />Helpdesk</p><h2 id="contact-inquiry-heading">Tell us how<br /><em>we can help.</em></h2><p>Share a programme question, partnership idea, membership query or support request. AASW will use these details only to respond to your inquiry.</p><div className="inquiry-data-note"><LockKeyhole size={16} /><p>Your message is securely recorded for Foundation follow-up. Required fields are marked with <b>*</b>.</p></div></div><form className="contact-inquiry-form" onSubmit={submit} noValidate aria-busy={submission.isPending} data-submitting={submission.isPending ? "true" : "false"}><div className="inquiry-form-grid"><label><span>Full name <b>*</b></span><input name="fullName" autoComplete="name" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} required maxLength={255} aria-invalid={Boolean(errors.fullName)} /><FieldError message={errors.fullName} /></label><label><span>Email address <b>*</b></span><input name="email" type="email" autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} required maxLength={320} aria-invalid={Boolean(errors.email)} /><FieldError message={errors.email} /></label><label><span>Phone number <b>*</b></span><input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} required maxLength={32} aria-invalid={Boolean(errors.phone)} /><FieldError message={errors.phone} /></label><label><span>What can we help with? <b>*</b></span><select name="topic" value={form.topic} onChange={(event) => update("topic", event.target.value as Topic)} required aria-invalid={Boolean(errors.topic)}><option value="" disabled>Select a topic</option><option value="programmes">Programmes</option><option value="membership">Membership</option><option value="donation">Donation</option><option value="partnership">Partnership</option><option value="media">Media or information</option><option value="other">Other</option></select><FieldError message={errors.topic} /></label><label className="inquiry-message"><span>Your message <b>*</b></span><textarea name="message" value={form.message} onChange={(event) => update("message", event.target.value)} rows={6} maxLength={2000} required aria-invalid={Boolean(errors.message)} /><FieldError message={errors.message} /></label><label className="inquiry-honeypot" aria-hidden="true"><span>Website</span><input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} /></label></div><label className="inquiry-consent"><input type="checkbox" checked={form.privacyConsent} onChange={(event) => update("privacyConsent", event.target.checked)} required aria-invalid={Boolean(errors.privacyConsent)} /><span>I agree that AASW Foundation may use these details to respond to this inquiry, in line with the <a href="/privacy">Privacy Policy</a>. <b>*</b></span></label><FieldError message={errors.privacyConsent} />{submission.error && <p className="inquiry-submit-error" role="alert"><AlertCircle size={17} />{submission.error.message}</p>}<button type="submit" className="button button-ochre inquiry-submit" disabled={submission.isPending}>{submission.isPending ? <><span className="inquiry-submit-loader" aria-hidden="true"><Loader2 size={16} className="inquiry-spinner" /></span><span>Sending message</span><span className="inquiry-submit-dots" aria-hidden="true"><i /><i /><i /></span></> : <>Send inquiry <Send size={16} /></>}</button></form></section>;
}

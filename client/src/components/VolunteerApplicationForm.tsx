import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { INDIAN_STATES } from "@shared/indianStates";
import { notifyError } from "@/lib/notifications";

type FieldKey = "fullName" | "email" | "phone" | "city" | "state" | "skills" | "availability" | "interests" | "privacyConsent";
type FormErrors = Partial<Record<FieldKey, string>>;
type FormState = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  skills: string;
  availability: string;
  interests: string;
  message: string;
  privacyConsent: boolean;
  website: string;
};

const initialState: FormState = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  skills: "",
  availability: "",
  interests: "",
  message: "",
  privacyConsent: false,
  website: "",
};

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (form.fullName.trim().length < 2) errors.fullName = "Please enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Please enter a valid email address.";
  if (form.phone.trim().length < 8 || !/^[0-9+()\-\s]+$/.test(form.phone.trim())) errors.phone = "Please enter a valid phone number.";
  if (form.city.trim().length < 2) errors.city = "Please enter your city.";
  if (!form.state) errors.state = "Please select your State.";
  if (form.skills.trim().length < 3) errors.skills = "Please share the skills you can contribute.";
  if (form.availability.trim().length < 3) errors.availability = "Please share when you are available.";
  if (form.interests.trim().length < 3) errors.interests = "Please share where you would like to help.";
  if (!form.privacyConsent) errors.privacyConsent = "Please confirm the Foundation may follow up on your application.";
  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <small id={id} className="member-form-field-error" role="alert"><AlertCircle size={13} />{message}</small> : null;
}

export function VolunteerApplicationForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const submitVolunteer = trpc.volunteer.submit.useMutation();

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setServerError(null);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const result = await submitVolunteer.mutateAsync({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        state: form.state,
        skills: form.skills.trim(),
        availability: form.availability.trim(),
        interests: form.interests.trim(),
        message: form.message.trim() || undefined,
        privacyConsent: true,
        website: form.website,
      });
      setReference(result.applicationRef);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Your volunteer application could not be submitted. Please try again.";
      setServerError(message);
      notifyError("Volunteer application could not submit", message);
    } finally {
      setSubmitting(false);
    }
  };

  if (reference) {
    return (
      <section className="membership-application-success" aria-live="polite" tabIndex={-1}>
        <span className="membership-success-icon"><CheckCircle2 size={28} /></span>
        <div className="membership-success-content">
          <p className="section-kicker">Volunteer application received</p>
          <h2>Thank you for offering your time.</h2>
          <dl className="membership-success-list">
            <div><dt>Application reference</dt><dd><span>{reference}</span></dd></div>
          </dl>
          <p className="membership-success-note">The Foundation reviews volunteer applications and will reach out to you by email. Keep this reference for any follow-up.</p>
          <button type="button" className="text-link" onClick={() => { setReference(null); setForm(initialState); }}>Submit another application <Send size={15} /></button>
        </div>
      </section>
    );
  }

  return (
    <section className="membership-application" aria-labelledby="volunteer-application-heading">
      <div className="membership-application-intro">
        <p className="eyebrow"><span className="eyebrow-dot" />Volunteer application</p>
        <h2 id="volunteer-application-heading">Offer your time<br /><em>where it counts.</em></h2>
        <p className="membership-application-lede">Volunteers support field events, training sessions and community outreach. Tell the Foundation what you can contribute and when you are available; a review decision follows by email.</p>
      </div>
      <div className="membership-form-column">
        <form className="membership-application-form" onSubmit={submit} noValidate aria-busy={submitting} data-submitting={submitting ? "true" : "false"}>
          <div className="member-form-grid">
            <label><span>Full name <b>*</b></span><input name="fullName" autoComplete="name" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? "volunteer-full-name-error" : undefined} required maxLength={255} disabled={submitting} /><FieldError id="volunteer-full-name-error" message={errors.fullName} /></label>
            <label><span>Email address <b>*</b></span><input name="email" type="email" autoComplete="email" autoCapitalize="none" value={form.email} onChange={(event) => update("email", event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "volunteer-email-error" : undefined} required maxLength={320} disabled={submitting} /><FieldError id="volunteer-email-error" message={errors.email} /></label>
            <label><span>Phone number <b>*</b></span><input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "volunteer-phone-error" : undefined} required maxLength={32} disabled={submitting} /><FieldError id="volunteer-phone-error" message={errors.phone} /></label>
            <label><span>State <b>*</b></span><select name="state" value={form.state} onChange={(event) => update("state", event.target.value)} aria-invalid={Boolean(errors.state)} aria-describedby={errors.state ? "volunteer-state-error" : undefined} disabled={submitting}><option value="" disabled>Select State</option>{INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select><FieldError id="volunteer-state-error" message={errors.state} /></label>
            <label><span>City <b>*</b></span><input name="city" autoComplete="address-level2" value={form.city} onChange={(event) => update("city", event.target.value)} aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? "volunteer-city-error" : undefined} required maxLength={128} disabled={submitting} /><FieldError id="volunteer-city-error" message={errors.city} /></label>
            <label><span>Availability <b>*</b></span><input name="availability" value={form.availability} onChange={(event) => update("availability", event.target.value)} placeholder="e.g. Weekends, weekday evenings" aria-invalid={Boolean(errors.availability)} aria-describedby={errors.availability ? "volunteer-availability-error" : undefined} required maxLength={255} disabled={submitting} /><FieldError id="volunteer-availability-error" message={errors.availability} /></label>
            <label className="member-form-message"><span>Skills you can contribute <b>*</b></span><textarea name="skills" value={form.skills} onChange={(event) => update("skills", event.target.value)} maxLength={2000} rows={3} aria-invalid={Boolean(errors.skills)} aria-describedby={errors.skills ? "volunteer-skills-error" : undefined} required disabled={submitting} /><FieldError id="volunteer-skills-error" message={errors.skills} /></label>
            <label className="member-form-message"><span>Areas you would like to help with <b>*</b></span><textarea name="interests" value={form.interests} onChange={(event) => update("interests", event.target.value)} maxLength={2000} rows={3} aria-invalid={Boolean(errors.interests)} aria-describedby={errors.interests ? "volunteer-interests-error" : undefined} required disabled={submitting} /><FieldError id="volunteer-interests-error" message={errors.interests} /></label>
            <label className="member-form-message"><span>Anything else we should know <small>Optional</small></span><textarea name="message" value={form.message} onChange={(event) => update("message", event.target.value)} maxLength={1500} rows={3} disabled={submitting} /></label>
            <label className="member-form-honeypot" aria-hidden="true"><span>Website</span><input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} /></label>
          </div>
          <label className="member-form-consent"><input type="checkbox" checked={form.privacyConsent} onChange={(event) => update("privacyConsent", event.target.checked)} aria-invalid={Boolean(errors.privacyConsent)} aria-describedby={errors.privacyConsent ? "volunteer-consent-error" : undefined} disabled={submitting} /><span>I agree that AASW Foundation may use these details to follow up on my volunteer application, in line with the <a href="/privacy">Privacy Policy</a>. <b>*</b></span></label>
          <FieldError id="volunteer-consent-error" message={errors.privacyConsent} />
          {serverError && <p id="volunteer-submit-error" className="member-form-error" role="alert"><AlertCircle size={17} />{serverError}</p>}
          {submitting && <p className="membership-submit-progress" role="status"><Loader2 size={16} className="member-form-spinner" /><span>Submitting your volunteer application…</span></p>}
          <div className="member-form-actions"><button className="button button-primary member-form-submit" type="submit" disabled={submitting}>{submitting ? <><Loader2 size={17} className="member-form-spinner" /><span>Submitting application</span></> : <>Submit volunteer application <Send size={16} /></>}</button></div>
          <p className="member-form-note"><LockKeyhole size={13} /> No documents are collected at this stage. A review decision is shared by email.</p>
        </form>
      </div>
    </section>
  );
}

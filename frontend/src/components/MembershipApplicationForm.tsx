import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Check, CheckCircle2, Clipboard, Download, FileUp, ImageDown, Info, Loader2, LockKeyhole, PencilLine, RefreshCw, RotateCcw, Save, Send, Share2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { INDIAN_STATES } from "@shared/indianStates";
import { notifyError, notifySuccess, notifyWarning } from "@/lib/notifications";
import { createSafeRenewalProgress, formatPanInput, isAnnualRenewalSearch, membershipSubmissionErrorMessage, parseSafeRenewalProgress, RENEWAL_PROGRESS_STORAGE_KEY } from "@/lib/membershipRenewal";
import { downloadMembershipRenewalReceiptPdf } from "@/lib/membershipRenewalReceiptPdf";
import { createMembershipRenewalShareBadgeFile } from "@/lib/membershipRenewalShareBadge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type MembershipType = "annual" | "lifetime";
type ProofType = "aadhaar" | "voter_id" | "passport" | "driving_licence" | "other";
type FieldKey = "fullName" | "email" | "phone" | "state" | "district" | "city" | "panNumber" | "idProofType" | "idProofFile" | "privacyConsent";
type FormErrors = Partial<Record<FieldKey, string>>;
type FormState = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  district: string;
  membershipType: MembershipType;
  panNumber: string;
  idProofType: ProofType | "";
  idProofFile: File | null;
  message: string;
  privacyConsent: boolean;
  website: string;
};

const MAX_ID_PROOF_BYTES = 5 * 1024 * 1024;
const PAN_FORMAT = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const initialState: FormState = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  district: "",
  membershipType: "annual",
  panNumber: "",
  idProofType: "",
  idProofFile: null,
  message: "",
  privacyConsent: false,
  website: "",
};

const RENEWAL_FAQS = [
  {
    question: "Why does the form say my email address and PAN do not match?",
    answer: "For privacy, a renewal only continues an existing account when both details exactly match the original membership record. Check for a spelling error, use the email address connected to your Member Portal, and enter your PAN in the ABCDE1234F format. A mismatched submission does not renew or change any account.",
  },
  {
    question: "I cannot remember which email address I used. What should I do?",
    answer: "Try the email address that receives your AASW member communications. If you are still unsure, contact the Foundation before submitting the form. This prevents a renewal from being linked to the wrong account.",
  },
  {
    question: "The page says my annual membership is already active.",
    answer: "You do not need to renew yet. Your current Member ID, profile and services remain available in the Member Portal until your annual membership is closer to its expiry date.",
  },
  {
    question: "My ID-proof file is not uploading. How can I fix it?",
    answer: "Use a JPG, PNG or PDF file that is no larger than 5 MB. If the problem continues, choose the file again and make sure your internet connection is stable before resubmitting.",
  },
];

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (form.fullName.trim().length < 2) errors.fullName = "Please enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Please enter a valid email address.";
  if (form.phone.trim().length < 8 || !/^[0-9+()\-\s]+$/.test(form.phone.trim())) errors.phone = "Please enter a valid phone number.";
  if (!form.state) errors.state = "Please select your State.";
  if (form.district.trim().length < 2) errors.district = "Please enter your district.";
  if (form.city.trim().length < 2) errors.city = "Please enter your city.";
  if (!PAN_FORMAT.test(form.panNumber.trim().toUpperCase())) errors.panNumber = "Please enter a valid PAN number.";
  if (!form.idProofType) errors.idProofType = "Please choose the type of ID proof.";
  if (!form.idProofFile) errors.idProofFile = "Please upload an ID-proof image or PDF.";
  else if (!['image/jpeg', 'image/png', 'application/pdf'].includes(form.idProofFile.type) || form.idProofFile.size > MAX_ID_PROOF_BYTES) errors.idProofFile = "Use a JPG, PNG or PDF file up to 5 MB.";
  if (!form.privacyConsent) errors.privacyConsent = "Please confirm that AASW may follow up on this application.";
  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <small id={id} className="member-form-field-error" role="alert"><AlertCircle size={13} />{message}</small> : null;
}

function RenewalInlineFeedback({ id, kind, value, message }: { id: string; kind: "email" | "pan"; value: string; message?: string }) {
  if (!value.trim()) return null;
  if (message) return <small id={id} className="member-form-field-error" aria-live="polite"><AlertCircle size={13} />{message}</small>;
  if (kind === "pan" && !PAN_FORMAT.test(value)) return null;
  return <small id={id} className="member-form-field-valid" aria-live="polite"><CheckCircle2 size={13} />{kind === "email" ? "Email format looks ready. It will be checked securely against your member account when you submit." : "PAN format looks ready. Use the same PAN linked to your existing Member Portal."}</small>;
}

function renewalPanInlineError(value: string) {
  return value.length >= 10 && !PAN_FORMAT.test(value) ? "This 10-character PAN format is not valid. Use ABCDE1234F." : undefined;
}

function fileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected file could not be read."));
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
    reader.readAsDataURL(file);
  });
}

function RenewalTroubleshootingFaq() {
  return (
    <section className="membership-renewal-faq" aria-labelledby="renewal-faq-heading">
      <div className="membership-renewal-faq-heading">
        <p className="section-kicker">Need help?</p>
        <h3 id="renewal-faq-heading">Renewal questions,<br /><em>made clear.</em></h3>
        <p>Review these quick checks before submitting again. Your Member Portal account remains protected while you troubleshoot.</p>
      </div>
      <Accordion type="single" collapsible className="membership-renewal-faq-list">
        {RENEWAL_FAQS.map((faq, index) => (
          <AccordionItem key={faq.question} value={`renewal-faq-${index}`} className="membership-renewal-faq-item">
            <AccordionTrigger className="membership-renewal-faq-trigger">{faq.question}</AccordionTrigger>
            <AccordionContent className="membership-renewal-faq-answer">{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <a className="text-link text-link-green" href="/contact">Still need help? Contact AASW <Send size={14} /></a>
    </section>
  );
}

function RenewalConfetti() {
  return <div className="membership-renewal-confetti" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>;
}

export function MembershipApplicationForm() {
  const isRenewal = typeof window !== "undefined" && isAnnualRenewalSearch(window.location.search);
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [reference, setReference] = useState<string | null>(null);
  const [membershipNo, setMembershipNo] = useState<string | null>(null);
  const [selectedMembershipType, setSelectedMembershipType] = useState<MembershipType>("annual");
  const [completedAsRenewal, setCompletedAsRenewal] = useState(false);
  const [isPreparingSubmission, setIsPreparingSubmission] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [renewalProgressReady, setRenewalProgressReady] = useState(!isRenewal);
  const [renewalProgressRestored, setRenewalProgressRestored] = useState(false);
  const [renewalRecordedAt, setRenewalRecordedAt] = useState<string | null>(null);
  const [membershipIdCopied, setMembershipIdCopied] = useState(false);
  const [renewalShared, setRenewalShared] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [badgeDownloaded, setBadgeDownloaded] = useState(false);
  const [confirmationProgress, setConfirmationProgress] = useState<"idle" | "processing" | "confirmed">("idle");
  const idProofInputRef = useRef<HTMLInputElement>(null);
  const formStartRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isRenewal) return;
    const savedProgress = parseSafeRenewalProgress(window.sessionStorage.getItem(RENEWAL_PROGRESS_STORAGE_KEY));
    if (savedProgress) {
      setForm((current) => ({ ...current, ...savedProgress, membershipType: "annual" }));
      setRenewalProgressRestored(true);
    }
    setRenewalProgressReady(true);
  }, [isRenewal]);

  useEffect(() => {
    if (!isRenewal || !renewalProgressReady) return;
    const safeProgress = createSafeRenewalProgress({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      city: form.city,
      state: form.state,
      district: form.district,
      idProofType: form.idProofType,
      message: form.message,
      privacyConsent: form.privacyConsent,
    });
    if (safeProgress) window.sessionStorage.setItem(RENEWAL_PROGRESS_STORAGE_KEY, JSON.stringify(safeProgress));
    else window.sessionStorage.removeItem(RENEWAL_PROGRESS_STORAGE_KEY);
  }, [form, isRenewal, renewalProgressReady]);

  const submission = trpc.membership.submit.useMutation({
    onSuccess: (result, variables) => {
      const renewalRecorded = Boolean(result.renewal);
      setReference(result.applicationRef);
      setMembershipNo(result.membershipNo);
      setSelectedMembershipType(variables.membershipType);
      setCompletedAsRenewal(renewalRecorded);
      setRenewalRecordedAt(renewalRecorded ? new Date().toISOString() : null);
      setForm(initialState);
      window.sessionStorage.removeItem(RENEWAL_PROGRESS_STORAGE_KEY);
      setErrors({});
      setSubmissionError(null);
      setConfirmationProgress("idle");
      notifySuccess(
        renewalRecorded ? "Membership renewal recorded" : "Membership account activated",
        renewalRecorded ? `Your Member ID ${result.membershipNo} remains connected to your existing account.` : `Your Member ID is ${result.membershipNo}.`,
      );
    },
    onError: (error) => {
      const readableMessage = membershipSubmissionErrorMessage(error.message, isRenewal);
      setSubmissionError(readableMessage);
      setConfirmationProgress("idle");
      notifyError(isRenewal ? "Renewal could not be recorded" : "Membership application could not be submitted", readableMessage);
    },
  });

  const isSubmitting = submission.isPending || isPreparingSubmission;
  const modalProcessing = isSubmitting || confirmationProgress !== "idle";
  const copyMembershipId = async () => {
    if (!membershipNo) return;
    try {
      await navigator.clipboard.writeText(membershipNo);
      setMembershipIdCopied(true);
      notifySuccess("Membership ID copied", "Keep your Membership ID private and use it only for your AASW account.");
    } catch {
      notifyError("Could not copy Membership ID", "Please select and copy the Membership ID manually.");
    }
  };
  const shareRenewalStatus = async () => {
    const text = "I have renewed my AASW Foundation membership and look forward to continuing the journey.";
    const url = `${window.location.origin}/membership?renewal=annual`;
    const supportsWebShare = "share" in navigator;
    try {
      const badge = await createMembershipRenewalShareBadgeFile();
      const supportsFileShare = "canShare" in navigator && navigator.canShare({ files: [badge] });
      if (supportsWebShare && supportsFileShare) await navigator.share({ title: "AASW Foundation", text, url, files: [badge] });
      else if (supportsWebShare) await navigator.share({ title: "AASW Foundation", text, url });
      else await navigator.clipboard.writeText(`${text} ${url}`);
      setRenewalShared(true);
      notifySuccess(supportsWebShare ? "Renewal status shared" : "Share message copied", supportsFileShare ? "Your general AASW renewal badge was included where your device supports it." : supportsWebShare ? "Thank you for sharing your AASW journey." : "Paste the message wherever you would like to share it.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      notifyError("Could not share renewal status", "Please try again or share your renewal news directly from your Member Portal.");
    }
  };
  const downloadRenewalShareBadge = async () => {
    try {
      const badge = await createMembershipRenewalShareBadgeFile();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(badge);
      link.download = badge.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      setBadgeDownloaded(true);
      notifySuccess("Share badge downloaded", "You can upload this general AASW badge to LinkedIn or another social platform.");
    } catch {
      notifyError("Could not download share badge", "Please try again in this browser.");
    }
  };
  const clearRenewalForm = () => {
    setForm(initialState);
    setErrors({});
    setSubmissionError(null);
    setRenewalProgressRestored(false);
    setMembershipIdCopied(false);
    setRenewalShared(false);
    setBadgeDownloaded(false);
    window.sessionStorage.removeItem(RENEWAL_PROGRESS_STORAGE_KEY);
    if (idProofInputRef.current) idProofInputRef.current.value = "";
  };
  const returnToFormDetails = () => {
    setReviewOpen(false);
    setConfirmationProgress("idle");
    window.setTimeout(() => formStartRef.current?.focus(), 180);
  };
  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    const nextForm = { ...form, [field]: value } as FormState;
    setForm(nextForm);
    if (field === "email" || field === "panNumber") {
      const identityField: "email" | "panNumber" = field;
      const isEmpty = !String(value).trim();
      const liveMessage = identityField === "panNumber" && isRenewal ? renewalPanInlineError(String(value)) : validateForm(nextForm)[identityField];
      setErrors((current) => ({ ...current, [identityField]: isRenewal && !isEmpty ? liveMessage : undefined }));
      return;
    }
    if (field !== "website") setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const validateField = (field: FieldKey) => setErrors((current) => ({ ...current, [field]: field === "panNumber" && isRenewal ? renewalPanInlineError(form.panNumber) : validateForm(form)[field] }));
  const renewalEmailState = isRenewal && form.email.trim() ? (errors.email ? "is-invalid" : "is-valid") : "";
  const isValidRenewalPan = isRenewal && PAN_FORMAT.test(form.panNumber);
  const renewalPanState = isRenewal && form.panNumber.trim() ? (errors.panNumber ? "is-invalid" : isValidRenewalPan ? "is-valid" : "") : "";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReference(null);
    setMembershipNo(null);
    setSubmissionError(null);
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !form.idProofFile || !form.idProofType) {
      notifyWarning(isRenewal ? "Please complete the renewal details" : "Please complete the membership details", "Review the highlighted fields before continuing.");
      return;
    }

    setConfirmationProgress("idle");
    setReviewOpen(true);
  };

  const submitConfirmed = async () => {
    setReference(null);
    setMembershipNo(null);
    setSubmissionError(null);
    if (!form.idProofFile || !form.idProofType) {
      setErrors((current) => ({ ...current, idProofFile: !form.idProofFile ? "Please choose your ID-proof file again." : undefined, idProofType: !form.idProofType ? "Select an ID proof type." : undefined }));
      notifyWarning("Please complete the membership details", "Your ID-proof type and file are required before secure processing.");
      setConfirmationProgress("idle");
      return;
    }
    const idProofFile = form.idProofFile;
    const idProofType = form.idProofType;
    let dataBase64: string;
    try {
      setIsPreparingSubmission(true);
      dataBase64 = await fileAsBase64(idProofFile);
    } catch {
      setErrors((current) => ({ ...current, idProofFile: "The selected file could not be read. Please choose it again." }));
      notifyError("ID proof could not be prepared", "Please choose your ID-proof file again before submitting.");
      setConfirmationProgress("idle");
      return;
    } finally {
      setIsPreparingSubmission(false);
    }

    setConfirmationProgress("confirmed");
    await new Promise<void>((resolve) => window.setTimeout(resolve, 260));
    submission.mutate({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      city: form.city,
      state: form.state,
      district: form.district,
      membershipType: isRenewal ? "annual" : form.membershipType,
      renewalIntent: isRenewal,
      panNumber: form.panNumber.toUpperCase(),
      idProof: {
        type: idProofType,
        originalName: idProofFile.name,
        mimeType: idProofFile.type as "image/jpeg" | "image/png" | "application/pdf",
        dataBase64,
      },
      message: form.message.trim() || undefined,
      privacyConsent: true,
      website: form.website || undefined,
    });
  };

  const confirmReviewSubmission = async () => {
    setConfirmationProgress("processing");
    await new Promise<void>((resolve) => window.setTimeout(resolve, 140));
    await submitConfirmed();
  };

  if (reference && membershipNo) {
    return (
      <section className={`membership-application-success${completedAsRenewal ? " membership-renewal-success" : ""}`} aria-live="polite" tabIndex={-1}>
        {completedAsRenewal && <RenewalConfetti />}
        <span className="membership-success-icon"><CheckCircle2 size={28} /></span>
        <div className="membership-success-content">
          <p className="section-kicker">{completedAsRenewal ? "Membership renewal complete" : "Membership account activated"}</p>
          <h3>{completedAsRenewal ? "Your membership continues." : "Welcome to AASW Foundation."}</h3>
          <p>{completedAsRenewal ? "Your annual membership renewal has been securely recorded. Your existing Member ID, password, profile, projects and membership history continue in the same Member Portal account." : "Your application and required identity information were securely recorded, and your member account is now active. Check the email address you provided for a secure one-time link to set your password."}</p>
          <dl>
            <div><dt>Membership ID</dt><dd className="membership-id-value"><span>{membershipNo}</span>{completedAsRenewal && <button type="button" className="membership-id-copy" onClick={() => void copyMembershipId()} aria-label="Copy Membership ID">{membershipIdCopied ? <Check size={14} /> : <Clipboard size={14} />}{membershipIdCopied ? "Copied" : "Copy"}</button>}</dd></div>
            <div><dt>Application reference</dt><dd>{reference}</dd></div>
            <div><dt>Selected path</dt><dd>{selectedMembershipType === "annual" ? "Annual membership" : "Lifetime membership"}</dd></div>
          </dl>
          {!completedAsRenewal && <p className="membership-success-note">The password-setup link expires after 72 hours. Do not share it with anyone.</p>}
          <a className="text-link" href="/member/login">{completedAsRenewal ? "Open your Member Portal" : "Open Member Login"} <Send size={15} /></a>
          {completedAsRenewal && <div className="membership-renewal-success-actions">{renewalRecordedAt && <button type="button" className="button button-primary membership-renewal-receipt" onClick={() => downloadMembershipRenewalReceiptPdf({ membershipNo, applicationRef: reference, recordedAt: renewalRecordedAt })}><Download size={16} />Download renewal PDF receipt</button>}<button type="button" className="membership-renewal-share" onClick={() => void downloadRenewalShareBadge()}><ImageDown size={16} />{badgeDownloaded ? "Share badge downloaded" : "Download share badge"}</button><button type="button" className="membership-renewal-share" onClick={() => void shareRenewalStatus()}><Share2 size={16} />{renewalShared ? "Shared renewal status" : "Share renewal status"}</button></div>}
          <button type="button" className="text-link" onClick={() => { setReference(null); setMembershipNo(null); setCompletedAsRenewal(false); setRenewalRecordedAt(null); }}>Submit another application <Send size={15} /></button>
        </div>
      </section>
    );
  }

  return (
    <section className={`membership-application${isRenewal ? " membership-application-renewal" : ""}`} aria-labelledby="membership-application-heading">
      <div className="membership-application-intro">
        <p className="eyebrow"><span className="eyebrow-dot" />{isRenewal ? "Membership renewal" : "Membership application"}</p>
        <h2 id="membership-application-heading">{isRenewal ? <>Renew with your<br /><em>same member account.</em></> : <>Start with a<br /><em>clear introduction.</em></>}</h2>
        <p>{isRenewal ? "Enter the same email address and exact PAN used for your existing membership. The secure renewal process keeps the same Member ID, password, profile and member history." : "Share the details needed for AASW Foundation membership. A successful submission activates your member account and sends a secure password-setup link to the email address you provide."}</p>
        {isRenewal && (
          <aside className="membership-renewal-context" aria-label="Renewal guidance">
            <span><RefreshCw size={17} /></span>
            <div><strong>You are renewing your AASW membership.</strong><p>Use the exact email address and PAN connected to your Member Portal. This renewal remains an annual membership and keeps your account history together.</p></div>
          </aside>
        )}
        <p className="membership-application-required"><span aria-hidden="true">*</span> Required fields</p>
        <div className="member-data-note"><LockKeyhole size={16} /><p>PAN is encrypted before it is stored. Your ID proof is held as a private application document and is not included in email alerts.</p></div>
        {isRenewal && <p className={`renewal-progress-note${renewalProgressRestored ? " renewal-progress-restored" : ""}`} role="status"><Save size={15} />{renewalProgressRestored ? "Your saved renewal progress was restored in this browser tab." : "Your typed renewal progress is saved in this browser tab. PAN and ID-proof files are never saved."}</p>}
      </div>

      <div className="membership-form-column">
        <form className="membership-application-form" onSubmit={submit} noValidate aria-busy={isSubmitting} data-submitting={isSubmitting ? "true" : "false"}>
          <div className="member-form-grid">
            <label><span>Full name <b>*</b></span><input ref={formStartRef} name="fullName" autoComplete="name" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} onBlur={() => validateField("fullName")} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? "membership-full-name-error" : undefined} required maxLength={255} disabled={isSubmitting} /><FieldError id="membership-full-name-error" message={errors.fullName} /></label>
            <label className={`member-renewal-inline-field ${renewalEmailState}`}><span>Email address <b>*</b></span><input name="email" type="email" autoComplete="email" autoCapitalize="none" value={form.email} onChange={(event) => update("email", event.target.value)} onBlur={() => validateField("email")} aria-invalid={Boolean(errors.email)} aria-describedby={isRenewal && form.email.trim() ? "membership-email-live-feedback" : errors.email ? "membership-email-error" : undefined} required maxLength={320} disabled={isSubmitting} />{isRenewal ? <RenewalInlineFeedback id="membership-email-live-feedback" kind="email" value={form.email} message={errors.email} /> : <FieldError id="membership-email-error" message={errors.email} />}</label>
            <label><span>Phone number <b>*</b></span><input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} onBlur={() => validateField("phone")} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "membership-phone-error" : undefined} required maxLength={32} disabled={isSubmitting} /><FieldError id="membership-phone-error" message={errors.phone} /></label>
            <label><span>State <b>*</b></span><select name="state" value={form.state} onChange={(event) => update("state", event.target.value)} onBlur={() => validateField("state")} aria-invalid={Boolean(errors.state)} aria-describedby={errors.state ? "membership-state-error" : undefined} disabled={isSubmitting}><option value="" disabled>Select State</option>{INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select><FieldError id="membership-state-error" message={errors.state} /></label>
            <label><span>District <b>*</b></span><input name="district" value={form.district} onChange={(event) => update("district", event.target.value)} onBlur={() => validateField("district")} aria-invalid={Boolean(errors.district)} aria-describedby={errors.district ? "membership-district-error" : undefined} required maxLength={128} disabled={isSubmitting} /><FieldError id="membership-district-error" message={errors.district} /></label>
            <label><span>City <b>*</b></span><input name="city" autoComplete="address-level2" value={form.city} onChange={(event) => update("city", event.target.value)} onBlur={() => validateField("city")} aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? "membership-city-error" : undefined} required maxLength={128} disabled={isSubmitting} /><FieldError id="membership-city-error" message={errors.city} /></label>
            <label className={`member-renewal-inline-field ${renewalPanState}`}><span className="member-pan-label">PAN Card Number <b>*</b>{isRenewal && <Tooltip><TooltipTrigger asChild><button type="button" className="member-pan-help" aria-label="PAN format help"><Info size={14} /></button></TooltipTrigger><TooltipContent side="top" sideOffset={8} className="member-pan-tooltip">Use 5 uppercase letters, 4 numbers and 1 uppercase letter: ABCDE1234F.</TooltipContent></Tooltip>}</span><span className="member-renewal-input-wrap"><input name="panNumber" value={form.panNumber} onChange={(event) => update("panNumber", formatPanInput(event.target.value))} onBlur={() => validateField("panNumber")} aria-invalid={Boolean(errors.panNumber)} aria-describedby={isRenewal && form.panNumber.trim() ? "membership-pan-live-feedback" : errors.panNumber ? "membership-pan-error" : undefined} required maxLength={10} placeholder="ABCDE1234F" autoCapitalize="characters" spellCheck={false} inputMode="text" disabled={isSubmitting} />{isValidRenewalPan && <CheckCircle2 className="member-renewal-input-check" size={18} aria-hidden="true" />}</span>{isRenewal ? <RenewalInlineFeedback id="membership-pan-live-feedback" kind="pan" value={form.panNumber} message={errors.panNumber} /> : <FieldError id="membership-pan-error" message={errors.panNumber} />}</label>
            <label><span>Membership path <b>*</b></span><select name="membershipType" value={isRenewal ? "annual" : form.membershipType} onChange={(event) => update("membershipType", event.target.value as MembershipType)} disabled={isRenewal || isSubmitting} aria-describedby={isRenewal ? "membership-renewal-plan-note" : undefined}><option value="annual">Annual membership · ₹1,100</option>{!isRenewal && <option value="lifetime">Lifetime membership · ₹10,000</option>}</select>{isRenewal && <small id="membership-renewal-plan-note" className="membership-renewal-plan-note">Renewal plan is kept annual for your existing account.</small>}</label>
            <label><span>ID Proof Type <b>*</b></span><select name="idProofType" value={form.idProofType} onChange={(event) => update("idProofType", event.target.value as ProofType)} onBlur={() => validateField("idProofType")} aria-invalid={Boolean(errors.idProofType)} aria-describedby={errors.idProofType ? "membership-proof-type-error" : undefined} disabled={isSubmitting}><option value="" disabled>Select ID Proof Type</option><option value="aadhaar">Aadhaar</option><option value="voter_id">Voter ID</option><option value="passport">Passport</option><option value="driving_licence">Driving Licence</option><option value="other">Other government ID</option></select><FieldError id="membership-proof-type-error" message={errors.idProofType} /></label>
            <label className="member-file-input"><span>Upload ID Proof <b>*</b></span><input ref={idProofInputRef} name="idProof" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => update("idProofFile", event.target.files?.[0] ?? null)} onBlur={() => validateField("idProofFile")} aria-invalid={Boolean(errors.idProofFile)} aria-describedby="membership-proof-help membership-proof-error" required disabled={isSubmitting} /><small id="membership-proof-help"><FileUp size={13} /> JPG, PNG or PDF · up to 5 MB</small><FieldError id="membership-proof-error" message={errors.idProofFile} /></label>
            <label className="member-form-message"><span>Why would you like to join? <small>Optional</small></span><textarea name="message" value={form.message} onChange={(event) => update("message", event.target.value)} maxLength={1500} rows={4} disabled={isSubmitting} /></label>
            <label className="member-form-honeypot" aria-hidden="true"><span>Website</span><input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} /></label>
          </div>
          <label className="member-form-consent"><input type="checkbox" checked={form.privacyConsent} onChange={(event) => update("privacyConsent", event.target.checked)} onBlur={() => validateField("privacyConsent")} aria-invalid={Boolean(errors.privacyConsent)} aria-describedby={errors.privacyConsent ? "membership-consent-error" : undefined} disabled={isSubmitting} /><span>I agree that AASW Foundation may use these details and private ID-proof document to process and respond to this membership application, in line with the <a href="/privacy">Privacy Policy</a>. <b>*</b></span></label>
          <FieldError id="membership-consent-error" message={errors.privacyConsent} />
          {submissionError && <p id="membership-submit-error" className="member-form-error" role="alert"><AlertCircle size={17} />{submissionError}</p>}
          {isSubmitting && <p className="membership-submit-progress" role="status"><Loader2 size={16} className="member-form-spinner" /><span>{isPreparingSubmission ? "Preparing your private ID-proof file…" : isRenewal ? "Securely checking your membership and recording the renewal…" : "Securely activating your membership account…"}</span></p>}
          <div className="member-form-actions"><button className="button button-primary member-form-submit" type="submit" disabled={isSubmitting} aria-label={isSubmitting ? (isPreparingSubmission ? "Preparing ID proof for secure renewal submission" : "Recording membership renewal") : undefined}>{isSubmitting ? <><span className="member-submit-loader" aria-hidden="true"><Loader2 size={17} className="member-form-spinner" /></span><span>{isPreparingSubmission ? "Preparing ID proof" : isRenewal ? "Recording renewal" : "Activating membership"}</span><span className="member-submit-dots" aria-hidden="true"><i /><i /><i /></span></> : <>{isRenewal ? "Renew membership" : "Activate membership account"} <Send size={16} /></>}</button>{isRenewal && <button type="button" className="member-form-clear" onClick={clearRenewalForm} disabled={isSubmitting}><RotateCcw size={15} />Clear form</button>}</div>
          <p className="member-form-note">{isRenewal ? "Your existing Member ID and history are only continued when the submitted email address and PAN match your account. This form does not collect payment." : "Submitting this form activates your member account and sends a one-time password-setup link. It does not collect payment."}</p>
        </form>
        <Dialog open={reviewOpen} onOpenChange={(open) => { if (!modalProcessing) { setReviewOpen(open); if (!open) setConfirmationProgress("idle"); } }}><DialogContent className="renewal-review-dialog" onPointerDownOutside={(event) => { if (modalProcessing) event.preventDefault(); }} onEscapeKeyDown={(event) => { if (modalProcessing) event.preventDefault(); }}><DialogHeader><p className="section-kicker">Final review</p><DialogTitle>{isRenewal ? "Check before recording your renewal." : "Check before activating your membership."}</DialogTitle><DialogDescription>Review the details below before secure processing. For privacy, PAN and the uploaded ID-proof file are not shown here.</DialogDescription></DialogHeader><dl className="renewal-review-list renewal-review-list-grid"><div><dt>Full name</dt><dd>{form.fullName}</dd></div><div><dt>Email</dt><dd>{form.email}</dd></div><div><dt>Phone</dt><dd>{form.phone}</dd></div><div><dt>Location</dt><dd>{[form.district, form.city, form.state].filter(Boolean).join(", ")}</dd></div><div><dt>Membership path</dt><dd>{isRenewal ? "Annual renewal" : form.membershipType === "annual" ? "Annual membership" : "Lifetime membership"}</dd></div><div><dt>ID-proof type</dt><dd>{form.idProofType.replaceAll("_", " ")}</dd></div></dl><p className="renewal-review-privacy"><LockKeyhole size={15} />Your exact PAN and private ID proof stay out of this review panel.</p><DialogFooter><button type="button" className="renewal-review-edit" onClick={returnToFormDetails} disabled={modalProcessing}><PencilLine size={15} />Edit details</button><button type="button" className="button button-primary renewal-review-confirm" onClick={() => void confirmReviewSubmission()} disabled={modalProcessing} aria-busy={modalProcessing}>{confirmationProgress === "processing" ? <><Loader2 size={16} className="member-form-spinner" />Checking details</> : confirmationProgress === "confirmed" ? <><Check size={16} />Details confirmed</> : <><LockKeyhole size={16} />{isRenewal ? "Confirm & renew" : "Confirm & activate"}</>}</button></DialogFooter></DialogContent></Dialog>
        {isRenewal && <RenewalTroubleshootingFaq />}
      </div>
    </section>
  );
}

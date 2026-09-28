// Footer newsletter capture: consent-explicit, honeypot-guarded, idempotent.
import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { notifyError, notifySuccess } from "@/lib/notifications";

export function FooterNewsletterForm() {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [done, setDone] = useState(false);
  const subscribe = trpc.newsletter.subscribe.useMutation({
    onSuccess: (result) => {
      setDone(true);
      notifySuccess(result.alreadySubscribed ? "You are on the list" : "Subscribed to AASW updates", result.alreadySubscribed ? "This email is already subscribed to Foundation updates." : "You will receive AASW field notes and programme updates.");
    },
    onError: (error) => {
      notifyError("Could not subscribe", error.message || "Please try again in a moment.");
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (honeypot || !email.trim()) return;
    subscribe.mutate({ email: email.trim(), source: "footer", website: honeypot });
  };

  return (
    <form className="footer-newsletter" onSubmit={submit} aria-label="Subscribe to AASW Foundation updates">
      <span className="footer-label">Field notes, by email</span>
      <p>Get programme updates, impact notes and Foundation announcements.</p>
      {done ? (
        <p className="footer-newsletter-done" role="status"><Check size={15} /> Subscribed. Thank you for staying close to the work.</p>
      ) : (
        <>
          <div className="footer-newsletter-row">
            <label htmlFor="footer-newsletter-email" className="sr-only">Email address</label>
            <input id="footer-newsletter-email" type="email" required autoComplete="email" placeholder="Your email address" value={email} onChange={(event) => setEmail(event.target.value)} disabled={subscribe.isPending} />
            <button type="submit" disabled={subscribe.isPending || !email.trim()} aria-label="Subscribe to updates">{subscribe.isPending ? "Joining…" : <>Join <ArrowUpRight size={14} /></>}</button>
          </div>
          <input type="text" className="footer-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
          <small>By subscribing you agree to receive AASW Foundation updates. You can ask us to stop any time.</small>
        </>
      )}
    </form>
  );
}

import { ArrowUpRight, CheckCircle2, MailCheck, ShieldCheck } from "lucide-react";
import { InnerPageShell, InnerSection } from "../components/InnerPageShell";
import { trpc } from "@/lib/trpc";

function formatAmount(rawAmount: string | null) {
  const amount = Number(rawAmount);
  return Number.isFinite(amount) && amount > 0 ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount) : "Amount recorded at checkout";
}

export function ThankYouPage() {
  const search = new URLSearchParams(window.location.search);
  const isDemo = search.get("demo") === "true";
  const requestedReceipt = search.get("receipt") || "";
  const payment = trpc.payment.receiptStatus.useQuery({ receipt: requestedReceipt }, { enabled: !isDemo && requestedReceipt.length >= 6 });
  const isVerified = !isDemo && payment.data?.status === "verified";
  const isMembership = (isVerified ? payment.data?.kind : search.get("kind")) === "membership";
  const contribution = isMembership ? "membership contribution" : "donation";
  const receipt = isDemo ? (requestedReceipt || "AASW-DEMO-REFERENCE") : isVerified ? payment.data?.receipt ?? "" : "Awaiting gateway confirmation";
  const amount = formatAmount(isVerified ? String(payment.data?.amount) : isDemo ? search.get("amount") : null);
  const pendingCopy = payment.isLoading ? "Checking the verified payment record…" : "We could not confirm a completed payment for this reference yet. If your bank shows a debit, contact AASW before trying again.";

  return <InnerPageShell activePath="/thank-you" eyebrow={isDemo ? "Checkout walkthrough" : isVerified ? "Verified contribution" : "Payment status"} chapter="Thank you" title={isDemo ? <>A clear <em>preview</em>, not a payment.</> : isVerified ? <>Your support is <em>received.</em></> : <>Checking your <em>payment.</em></>} intro={isDemo ? "This confirmation records a walkthrough only. No money moved, and no receipt email was sent." : isVerified ? "Thank you for supporting AASW Foundation. Your verified receipt reference is recorded below." : pendingCopy} tone="paper">
    <InnerSection className="thank-you-section"><div className={isDemo ? "thank-you-card thank-you-demo" : "thank-you-card"}>
      <div className="thank-you-status"><span><CheckCircle2 size={30} /></span><p className="section-kicker">{isDemo ? "Demo confirmation" : isVerified ? "Payment confirmation" : "Confirmation pending"}</p></div>
      <div className="thank-you-copy"><h2>{isDemo ? "Nothing has been charged." : isVerified ? "Thank you for your support." : "Your payment is not confirmed yet."}</h2><p>{isDemo ? "You have completed the visual donation flow. This preview does not create a Razorpay order, collect money or send email." : isVerified ? "Your verified " + contribution + " has been recorded. A payment receipt is being sent to the email address used at checkout." : pendingCopy}</p></div>
      <dl className="thank-you-receipt"><div><dt>Receipt reference</dt><dd>{receipt}</dd></div><div><dt>{isDemo ? "Preview amount" : "Amount received"}</dt><dd>{amount}</dd></div><div><dt>Status</dt><dd>{isDemo ? "Demo · no charge" : isVerified ? "Verified payment" : "Not confirmed"}</dd></div></dl>
      <div className="thank-you-notes"><div><ShieldCheck size={20} /><p><strong>{isDemo ? "No receipt email" : isVerified ? "Verified-only receipt" : "Bank debit check"}</strong>{isDemo ? " Demo confirmations never trigger an email." : isVerified ? " Email delivery is triggered only after a confirmed payment." : " A bank debit may take a short time to sync. Contact AASW if it remains unconfirmed."}</p></div><div><MailCheck size={20} /><p><strong>{isDemo ? "Ready to donate later" : "Need help?"}</strong>{isDemo ? " Return to the donation page whenever you are ready for the live checkout." : " Write to aaswfoundation06@gmail.com and include your verified receipt reference when available."}</p></div></div>
      <div className="thank-you-actions"><a className="button button-ochre" href="/donate">{isDemo ? "Return to donations" : isVerified ? "Support another programme" : "Return to donations"} <ArrowUpRight size={16} /></a><a className="text-link" href="/">Back to AASW <ArrowUpRight size={15} /></a></div>
    </div></InnerSection>
  </InnerPageShell>;
}

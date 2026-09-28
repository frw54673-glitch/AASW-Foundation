import { ArrowUpRight, CheckCircle2, MailCheck, ShieldCheck } from "lucide-react";
import { InnerPageShell, InnerSection } from "../components/InnerPageShell";

function formatAmount(rawAmount: string | null) {
  const amount = Number(rawAmount);
  return Number.isFinite(amount) && amount > 0 ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount) : "Amount recorded at checkout";
}

export function ThankYouPage() {
  const search = new URLSearchParams(window.location.search);
  const isDemo = search.get("demo") === "true";
  const isMembership = search.get("kind") === "membership";
  const contribution = isMembership ? "membership contribution" : "donation";
  const receipt = search.get("receipt") || (isDemo ? "AASW-DEMO-REFERENCE" : "AASW-PAYMENT-REFERENCE");
  const amount = formatAmount(search.get("amount"));

  return <InnerPageShell activePath="/thank-you" eyebrow={isDemo ? "Checkout walkthrough" : "Verified contribution"} chapter="Thank you" title={isDemo ? <>A clear <em>preview</em>, not a payment.</> : <>Your support is <em>received.</em></>} intro={isDemo ? "This confirmation records a walkthrough only. No money moved, and no receipt email was sent." : "Thank you for supporting AASW Foundation. Your payment confirmation and receipt reference are recorded below."} tone="paper">
    <InnerSection className="thank-you-section"><div className={`thank-you-card ${isDemo ? "thank-you-demo" : ""}`}>
      <div className="thank-you-status"><span><CheckCircle2 size={30} /></span><p className="section-kicker">{isDemo ? "Demo confirmation" : "Payment confirmation"}</p></div>
      <div className="thank-you-copy"><h2>{isDemo ? "Nothing has been charged." : "Thank you for your support."}</h2><p>{isDemo ? "You have completed the visual donation flow. This preview does not create a Razorpay order, collect money or send email." : `Your verified ${contribution} has been recorded. A payment receipt is being sent to the email address used at checkout.`}</p></div>
      <dl className="thank-you-receipt"><div><dt>Receipt reference</dt><dd>{receipt}</dd></div><div><dt>{isDemo ? "Preview amount" : "Amount received"}</dt><dd>{amount}</dd></div><div><dt>Status</dt><dd>{isDemo ? "Demo · no charge" : "Verified payment"}</dd></div></dl>
      <div className="thank-you-notes"><div><ShieldCheck size={20} /><p><strong>{isDemo ? "No receipt email" : "Verified-only receipt"}</strong>{isDemo ? " Demo confirmations never trigger an email." : " Email delivery is triggered only after a confirmed payment."}</p></div><div><MailCheck size={20} /><p><strong>{isDemo ? "Ready to donate later" : "Need help with your receipt?"}</strong>{isDemo ? " Return to the donation page whenever you are ready for the live checkout." : " Write to aaswfoundation06@gmail.com and include your reference."}</p></div></div>
      <div className="thank-you-actions"><a className="button button-ochre" href="/donate">{isDemo ? "Return to donations" : "Support another programme"} <ArrowUpRight size={16} /></a><a className="text-link" href="/">Back to AASW <ArrowUpRight size={15} /></a></div>
    </div></InnerSection>
  </InnerPageShell>;
}

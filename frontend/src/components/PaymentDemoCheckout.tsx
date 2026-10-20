import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, CreditCard, Landmark, LoaderCircle, ShieldCheck, Smartphone, X } from "lucide-react";
import { DONATION_PRESETS, formatINR, MEMBERSHIP_OPTIONS, resolveDemoAmount, resolvePaymentGatewayMode, type PaymentKind } from "@shared/payment-demo";
import { createCheckoutGateway } from "@shared/checkout-gateway";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

type PaymentDemoButtonProps = { kind: PaymentKind; initialAmount: number; className?: string; label: string; supporter?: { name: string; email: string; phone: string } };
type CheckoutState = "details" | "processing" | "failed";
type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayOptions = {
  key: string; amount: number; currency: string; name: string; description: string; order_id: string;
  prefill: { name: string; email: string; contact: string }; notes: { receipt: string; kind: PaymentKind };
  theme: { color: string }; handler: (result: RazorpaySuccess) => void; modal: { ondismiss: () => void };
};
type RazorpayInstance = { open: () => void; on: (event: "payment.failed", callback: (response: { error?: { description?: string } }) => void) => void };
declare global { interface Window { Razorpay?: new (options: RazorpayOptions) => RazorpayInstance } }

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (!script) { script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.async = true; document.body.appendChild(script); }
    script.addEventListener("load", () => window.Razorpay ? resolve() : reject(new Error("Razorpay Checkout did not load.")), { once: true });
    script.addEventListener("error", () => reject(new Error("Could not load Razorpay Checkout. Check your connection and try again.")), { once: true });
    if (window.Razorpay) resolve();
  });
}

export function PaymentDemoButton({ kind, initialAmount, className = "button button-ochre", label, supporter }: PaymentDemoButtonProps) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<CheckoutState>("details");
  const [selectedAmount, setSelectedAmount] = useState(initialAmount);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("UPI");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [error, setError] = useState("");
  const [failureMessage, setFailureMessage] = useState("");
  const amount = useMemo(() => isCustom ? Number(customAmount) : selectedAmount, [customAmount, isCustom, selectedAmount]);
  const formattedAmount = resolveDemoAmount(kind, amount) ? formatINR(amount) : "—";
  const itemLabel = kind === "membership" ? "Membership" : "Donation";
  const gatewayMode = resolvePaymentGatewayMode(import.meta.env.VITE_PAYMENT_GATEWAY_MODE);
  const isLive = gatewayMode === "razorpay";
  const checkoutGateway = useMemo(() => createCheckoutGateway(gatewayMode), [gatewayMode]);
  const createOrder = trpc.payment.createOrder.useMutation();
  const verifyCheckout = trpc.payment.verifyCheckout.useMutation();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && step !== "processing") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, step]);

  const openCheckout = () => {
    setOpen(true); setStep("details"); setSelectedAmount(initialAmount); setIsCustom(false); setCustomAmount("");
    setSimulateFailure(false); setFailureMessage(""); setError(""); setName(supporter?.name ?? "");
    setEmail(supporter?.email ?? ""); setPhone(supporter?.phone ?? "");
  };
  const closeCheckout = () => { if (step !== "processing") setOpen(false); };

  const continueCheckout = async () => {
    const validAmount = resolveDemoAmount(kind, amount);
    if (!name.trim() || !email.trim() || !email.includes("@")) { setError("Please enter your name and a valid email for the receipt."); return; }
    if (!validAmount) { setError(kind === "membership" ? "Please select an annual or lifetime membership contribution." : "The minimum donation is ₹10."); return; }
    setError(""); setStep("processing");
    if (!isLive) {
      await new Promise((resolve) => window.setTimeout(resolve, 850));
      const result = await checkoutGateway.complete({ kind, amount: validAmount, simulateFailure });
      if (result.status === "success") {
        setOpen(false);
        const receipt = `AASW-DEMO-${kind === "membership" ? "MEM" : "DON"}-${validAmount}`;
        navigate(`/thank-you?receipt=${encodeURIComponent(receipt)}&kind=${kind}&amount=${validAmount}&demo=true`);
        return;
      }
      setFailureMessage(result.message); setStep("failed"); return;
    }
    try {
      const order = await createOrder.mutateAsync({ kind, amount: validAmount, supporterName: name.trim(), supporterEmail: email.trim(), supporterPhone: phone.trim() || undefined });
      await loadRazorpay();
      if (!window.Razorpay) throw new Error("Razorpay Checkout is unavailable. Please retry.");
      const checkout = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, name: "AASW Foundation",
        description: kind === "membership" ? "AASW Foundation membership" : "AASW Foundation donation",
        order_id: order.orderId, prefill: { name: name.trim(), email: email.trim(), contact: phone.trim() },
        notes: { receipt: order.receipt, kind }, theme: { color: "#2f6b52" },
        handler: async (payment) => {
          try {
            const verified = await verifyCheckout.mutateAsync({ razorpayOrderId: payment.razorpay_order_id, razorpayPaymentId: payment.razorpay_payment_id, razorpaySignature: payment.razorpay_signature });
            setOpen(false);
            navigate(`/thank-you?receipt=${encodeURIComponent(verified.receipt)}&kind=${kind}&amount=${validAmount}`);
          } catch (verificationError) {
            setFailureMessage(verificationError instanceof Error ? `${verificationError.message} If money was debited, contact AASW with payment ID ${payment.razorpay_payment_id}.` : `Payment could not be verified. Contact AASW with payment ID ${payment.razorpay_payment_id}.`);
            setStep("failed");
          }
        },
        modal: { ondismiss: () => { setFailureMessage("Checkout was closed before payment confirmation. If an amount was debited, contact AASW before retrying."); setStep("failed"); } },
      });
      checkout.on("payment.failed", (response) => { setFailureMessage(response.error?.description || "Razorpay could not complete this payment. No successful payment was confirmed."); setStep("failed"); });
      checkout.open();
    } catch (checkoutError) {
      setFailureMessage(checkoutError instanceof Error ? checkoutError.message : "Could not start the secure payment. Please try again.");
      setStep("failed");
    }
  };

  return <>
    <button type="button" className={className} onClick={openCheckout}>{label} <ChevronRight size={16} /></button>
    {open && <div className="payment-demo-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCheckout(); }}>
      <section className="payment-demo-modal" role="dialog" aria-modal="true" aria-labelledby="payment-demo-title">
        <header className="payment-demo-header"><div><span className="payment-demo-chip"><span />{isLive ? "Secure Razorpay checkout" : "Demo checkout · no charge"}</span><h2 id="payment-demo-title">{itemLabel}, with clarity.</h2></div><button type="button" className="payment-demo-close" onClick={closeCheckout} aria-label="Close checkout"><X size={20} /></button></header>
        {step === "details" && <div className="payment-demo-body">
          <div className="payment-demo-disclosure"><ShieldCheck size={19} /><p>{isLive ? <><strong>Secure payment.</strong> Razorpay will process your payment. AASW records the contribution only after server-side signature verification.</> : <><strong>This is a demonstration only.</strong> No money is collected or transferred, and no Razorpay transaction is created.</>}</p></div>
          <div className="payment-demo-grid"><div className="payment-demo-form">
            <div className="payment-demo-group"><span className="payment-demo-label">{kind === "membership" ? "Choose membership" : "Choose donation amount"}</span><div className="payment-amount-options">
              {kind === "membership" ? MEMBERSHIP_OPTIONS.map((option) => <button key={option.amount} type="button" className={`payment-amount-option ${!isCustom && selectedAmount === option.amount ? "payment-amount-active" : ""}`} onClick={() => { setSelectedAmount(option.amount); setIsCustom(false); setError(""); }}><span>{formatINR(option.amount)}</span><small>{option.label}</small><i>{!isCustom && selectedAmount === option.amount && <Check size={14} />}</i></button>) : <>{DONATION_PRESETS.map((preset) => <button key={preset} type="button" className={`payment-amount-option ${!isCustom && selectedAmount === preset ? "payment-amount-active" : ""}`} onClick={() => { setSelectedAmount(preset); setIsCustom(false); setError(""); }}><span>{formatINR(preset)}</span><small>Donation</small><i>{!isCustom && selectedAmount === preset && <Check size={14} />}</i></button>)}<button type="button" className={`payment-amount-option ${isCustom ? "payment-amount-active" : ""}`} onClick={() => { setIsCustom(true); setError(""); }}><span>Custom</span><small>Choose an amount</small><i>{isCustom && <Check size={14} />}</i></button></>}
            </div>{isCustom && <label className="payment-input-wrap"><span>Custom donation in ₹</span><input inputMode="numeric" type="number" min="10" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} placeholder="e.g. 2500" /></label>}</div>
            <div className="payment-demo-fields"><label className="payment-input-wrap"><span>Your name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your name" autoComplete="name" /></label><label className="payment-input-wrap"><span>Email for receipt</span><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete="email" /></label><label className="payment-input-wrap"><span>Phone <small>(optional)</small></span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91" inputMode="tel" autoComplete="tel" /></label></div>
            {!isLive && <><div className="payment-demo-group"><span className="payment-demo-label">Preferred payment method <small>(visual demo only)</small></span><div className="payment-method-row">{[{ label: "UPI", icon: Smartphone }, { label: "Card", icon: CreditCard }, { label: "Bank", icon: Landmark }].map(({ label: methodLabel, icon: Icon }) => <button key={methodLabel} type="button" onClick={() => setMethod(methodLabel)} className={`payment-method ${method === methodLabel ? "payment-method-active" : ""}`}><Icon size={16} />{methodLabel}</button>)}</div></div><label className="payment-demo-simulation"><input type="checkbox" checked={simulateFailure} onChange={(event) => setSimulateFailure(event.target.checked)} /><span>Show an unsuccessful attempt in this demo.</span></label></>}
          </div><aside className="payment-demo-summary"><span className="section-kicker">{isLive ? "Payment summary" : "Demo summary"}</span><h3>{itemLabel}</h3><strong>{formattedAmount}</strong><p>{kind === "membership" ? "AASW membership contribution — annual or lifetime." : "AASW programme donation."}</p><div><span>Gateway status</span><b>{isLive ? "Razorpay live" : "Demo mode"}</b></div>{!isLive && <div><span>Payment method</span><b>{method}</b></div>}</aside></div>
          {error && <p className="payment-demo-error" role="alert">{error}</p>}<button type="button" className="button button-ochre payment-demo-submit" onClick={continueCheckout}>{isLive ? "Continue to secure payment" : "Continue to demo confirmation"} <ChevronRight size={16} /></button>
        </div>}
        {step === "processing" && <div className="payment-demo-processing"><LoaderCircle size={34} /><h3>{isLive ? "Connecting securely to Razorpay…" : "Demo payment step loading…"}</h3><p>{isLive ? "Your payment is not confirmed until AASW verifies the gateway response." : "No bank, UPI or card request is being sent."}</p></div>}
        {step === "failed" && <div className="payment-demo-complete payment-demo-failed"><span className="payment-demo-complete-icon"><X size={28} /></span><span className="section-kicker">{isLive ? "Payment not confirmed" : "Demo unsuccessful attempt"}</span><h3>{isLive ? "Please check before retrying." : "This is the retry path."}</h3><p>{failureMessage || "You can return to the details and try again."}</p><div className="payment-demo-receipt"><span>Amount</span><strong>{formattedAmount}</strong><small>{isLive ? "Check your bank before attempting another payment." : `${method} · demo only`}</small></div><button type="button" className="button button-primary" onClick={() => setStep("details")}>Back to details <ChevronRight size={16} /></button></div>}
      </section>
    </div>}
  </>;
}

// Design reminder: Human-first Civic Editorial — checkout should feel candid, calm and clearly non-transactional until live payment keys are supplied.
import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, ChevronRight, CreditCard, Landmark, LoaderCircle, ShieldCheck, Smartphone, X } from "lucide-react";
import { DONATION_PRESETS, formatINR, MEMBERSHIP_OPTIONS, resolveDemoAmount, resolvePaymentGatewayMode, type PaymentKind } from "@shared/payment-demo";
import { createCheckoutGateway } from "@shared/checkout-gateway";
import { useLocation } from "wouter";

type PaymentDemoButtonProps = {
  kind: PaymentKind;
  initialAmount: number;
  className?: string;
  label: string;
  supporter?: { name: string; email: string; phone: string };
};

type CheckoutState = "details" | "processing" | "complete" | "failed";

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
  const checkoutGateway = useMemo(() => createCheckoutGateway(gatewayMode), [gatewayMode]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && step !== "processing") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, step]);

  const openCheckout = () => {
    setOpen(true);
    setStep("details");
    setSelectedAmount(initialAmount);
    setIsCustom(false);
    setCustomAmount("");
    setSimulateFailure(false);
    setFailureMessage("");
    setError("");
    setName(supporter?.name ?? "");
    setEmail(supporter?.email ?? "");
    setPhone(supporter?.phone ?? "");
  };

  const closeCheckout = () => {
    if (step !== "processing") setOpen(false);
  };

  const continueDemo = async () => {
    const validAmount = resolveDemoAmount(kind, amount);
    if (!name.trim() || !email.trim() || !email.includes("@")) {
      setError("Please enter your name and a valid email for the demo receipt.");
      return;
    }
    if (!validAmount) {
      setError(kind === "membership" ? "Please select an annual or lifetime membership contribution." : "The minimum demo donation is ₹10.");
      return;
    }
    setError("");
    setStep("processing");
    await new Promise((resolve) => window.setTimeout(resolve, 850));
    const result = await checkoutGateway.complete({ kind, amount: validAmount, simulateFailure });
    if (result.status === "success") {
      setOpen(false);
      const receipt = `AASW-DEMO-${kind === "membership" ? "MEM" : "DON"}-${validAmount}`;
      navigate(`/thank-you?receipt=${encodeURIComponent(receipt)}&kind=${kind}&amount=${validAmount}&demo=true`);
      return;
    }
    setFailureMessage(result.message);
    setStep("failed");
  };

  return <>
    <button type="button" className={className} onClick={openCheckout}>{label} <ChevronRight size={16} /></button>
    {open && <div className="payment-demo-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCheckout(); }}>
      <section className="payment-demo-modal" role="dialog" aria-modal="true" aria-labelledby="payment-demo-title">
        <header className="payment-demo-header">
          <div><span className="payment-demo-chip"><span />Demo checkout · no charge</span><h2 id="payment-demo-title">{step === "complete" ? "Demo confirmed." : `${itemLabel}, with clarity.`}</h2></div>
          <button type="button" className="payment-demo-close" onClick={closeCheckout} aria-label="Close demo checkout"><X size={20} /></button>
        </header>

        {step === "details" && <div className="payment-demo-body">
          <div className="payment-demo-disclosure"><ShieldCheck size={19} /><p><strong>This is a demonstration only.</strong> No money is collected or transferred, and no Razorpay transaction is created.</p></div>
          <div className="payment-demo-grid">
            <div className="payment-demo-form">
              <div className="payment-demo-group"><span className="payment-demo-label">{kind === "membership" ? "Choose membership" : "Choose donation amount"}</span><div className="payment-amount-options">
                {kind === "membership" ? MEMBERSHIP_OPTIONS.map((option) => <button key={option.amount} type="button" className={`payment-amount-option ${!isCustom && selectedAmount === option.amount ? "payment-amount-active" : ""}`} onClick={() => { setSelectedAmount(option.amount); setIsCustom(false); setError(""); }}><span>{formatINR(option.amount)}</span><small>{option.label}</small><i>{!isCustom && selectedAmount === option.amount && <Check size={14} />}</i></button>) : <>
                  {DONATION_PRESETS.map((preset) => <button key={preset} type="button" className={`payment-amount-option ${!isCustom && selectedAmount === preset ? "payment-amount-active" : ""}`} onClick={() => { setSelectedAmount(preset); setIsCustom(false); setError(""); }}><span>{formatINR(preset)}</span><small>Donation</small><i>{!isCustom && selectedAmount === preset && <Check size={14} />}</i></button>)}
                  <button type="button" className={`payment-amount-option ${isCustom ? "payment-amount-active" : ""}`} onClick={() => { setIsCustom(true); setError(""); }}><span>Custom</span><small>Choose an amount</small><i>{isCustom && <Check size={14} />}</i></button>
                </>}
              </div>{isCustom && <label className="payment-input-wrap"><span>Custom donation in ₹</span><input inputMode="numeric" type="number" min="10" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} placeholder="e.g. 2500" /></label>}</div>
              <div className="payment-demo-fields"><label className="payment-input-wrap"><span>Your name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your name" autoComplete="name" /></label><label className="payment-input-wrap"><span>Email for demo receipt</span><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete="email" /></label><label className="payment-input-wrap"><span>Phone <small>(optional)</small></span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91" inputMode="tel" autoComplete="tel" /></label></div>
              <div className="payment-demo-group"><span className="payment-demo-label">Preferred payment method <small>(visual demo only)</small></span><div className="payment-method-row">{[{ label: "UPI", icon: Smartphone }, { label: "Card", icon: CreditCard }, { label: "Bank", icon: Landmark }].map(({ label: methodLabel, icon: Icon }) => <button key={methodLabel} type="button" onClick={() => setMethod(methodLabel)} className={`payment-method ${method === methodLabel ? "payment-method-active" : ""}`}><Icon size={16} />{methodLabel}</button>)}</div></div>
              <label className="payment-demo-simulation"><input type="checkbox" checked={simulateFailure} onChange={(event) => setSimulateFailure(event.target.checked)} /><span>Show an unsuccessful attempt in this demo.</span></label>
            </div>
            <aside className="payment-demo-summary"><span className="section-kicker">Demo summary</span><h3>{itemLabel}</h3><strong>{formattedAmount}</strong><p>{kind === "membership" ? "AASW membership demonstration — annual or lifetime contribution shown for flow preview." : "AASW donation demonstration — no amount will be debited."}</p><div><span>Gateway status</span><b>{checkoutGateway.mode === "demo" ? "Demo mode" : "Live setup pending"}</b></div><div><span>Payment method</span><b>{method}</b></div></aside>
          </div>
          {error && <p className="payment-demo-error" role="alert">{error}</p>}
          <button type="button" className="button button-ochre payment-demo-submit" onClick={continueDemo}>Continue to demo confirmation <ChevronRight size={16} /></button>
        </div>}

        {step === "processing" && <div className="payment-demo-processing"><LoaderCircle size={34} /><h3>Demo payment step loading…</h3><p>No bank, UPI or card request is being sent.</p></div>}

        {step === "failed" && <div className="payment-demo-complete payment-demo-failed"><span className="payment-demo-complete-icon"><X size={28} /></span><span className="section-kicker">Demo unsuccessful attempt</span><h3>This is the retry path.</h3><p>{failureMessage || "No money has been charged. You can return to the details and preview the flow again."}</p><div className="payment-demo-receipt"><span>Gateway response</span><strong>DEMO-ATTEMPT-NOT-COMPLETED</strong><small>{formattedAmount} · {method}</small></div><button type="button" className="button button-primary" onClick={() => setStep("details")}>Try demo again <ChevronRight size={16} /></button></div>}

        {step === "complete" && <div className="payment-demo-complete"><span className="payment-demo-complete-icon"><CheckCircle2 size={31} /></span><span className="section-kicker">Demo confirmation</span><h3>Your {itemLabel.toLowerCase()} journey is mapped.</h3><p>{name || "Supporter"}, this is a preview receipt only. No money has been charged, and AASW has not received a payment.</p><div className="payment-demo-receipt"><span>Preview reference</span><strong>AASW-DEMO-{kind === "membership" ? "MEM" : "DON"}-{amount || initialAmount}</strong><small>{formattedAmount} · {method}</small></div><button type="button" className="button button-primary" onClick={() => setOpen(false)}>Back to AASW <ChevronRight size={16} /></button></div>}
      </section>
    </div>}
  </>;
}

// Design reminder: Human-first Civic Editorial — trust signals stay warm and factual, never loud.
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, FileCheck2, Landmark, Lock, Receipt, ShieldCheck } from "lucide-react";

/** Counts from 0 to target once when scrolled into view. Respects prefers-reduced-motion. */
export function AnimatedCounter({ target, suffix = "", durationMs = 1600, className = "" }: { target: number; suffix?: string; durationMs?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) { setValue(target); return; }
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.35 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, durationMs]);

  return <span className={className} ref={ref}>{value.toLocaleString("en-IN")}{suffix}</span>;
}

const trustItems = [
  { icon: ShieldCheck, title: "Secure payments", copy: "Encrypted checkout via Razorpay." },
  { icon: Landmark, title: "Registered society", copy: "Aapka Apna Social Welfare Foundation, Uttar Pradesh." },
  { icon: Receipt, title: "Donation receipts", copy: "Every contribution gets a recorded receipt." },
  { icon: Lock, title: "Privacy by design", copy: "PAN and personal data stay encrypted." },
];

/** Reusable trust strip — used on Home and Donate. */
export function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="Giving safeguards at AASW Foundation">
      <div className="container trust-strip-grid">
        {trustItems.map((item, index) => {
          const Icon = item.icon;
          return <div className="trust-strip-item" key={item.title} data-reveal data-reveal-delay={index > 0 ? String(Math.min(index, 3)) : undefined}><Icon size={22} strokeWidth={1.5} /><div><strong>{item.title}</strong><p>{item.copy}</p></div></div>;
        })}
      </div>
    </section>
  );
}

/**
 * 80G tax-benefit block with a live saving estimator.
 * The 50% figure matches the live site's Section 80G wording; the estimator shows
 * the indicative deduction (50% of gift) and is labelled as indicative, not tax advice.
 */
export function TaxBenefitBlock({ amount }: { amount?: number }) {
  const [value, setValue] = useState<number>(amount ?? 2000);
  const [typed, setTyped] = useState<string>(amount ? String(amount) : "2000");
  const saving = Math.round(value * 0.5);

  const onChange = (raw: string) => {
    setTyped(raw);
    const parsed = Number(raw.replace(/[^\d]/g, ""));
    setValue(Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 10000000) : 0);
  };

  return (
    <section className="tax-benefit-block" aria-label="Section 80G tax benefit information">
      <div className="tax-benefit-copy" data-reveal>
        <span className="section-kicker"><BadgeCheck size={15} /> Tax exemption context</span>
        <h3>Donations may qualify for 50% tax benefit under Section 80G.</h3>
        <p>The AASW live website states that tax-exempt contributions may be available under Section 80G of the Income Tax Act. Your donation receipt carries the details the foundation has on record. Please confirm eligibility with the foundation before making a live donation.</p>
      </div>
      <div className="tax-benefit-calculator" data-reveal data-reveal-delay="1">
        <span className="section-kicker">Indicative saving</span>
        <label htmlFor="tax-calc-amount">Enter your donation amount (₹)</label>
        <input id="tax-calc-amount" inputMode="numeric" value={typed} onChange={(event) => onChange(event.target.value)} aria-label="Donation amount in rupees for indicative 80G saving" />
        <div className="tax-benefit-result" aria-live="polite">
          <span>Indicative 80G deduction</span>
          <strong>₹{saving.toLocaleString("en-IN")}</strong>
          <small>50% of your gift. Final benefit depends on your income slab and eligibility — please treat this as a guide, not tax advice.</small>
        </div>
      </div>
    </section>
  );
}

/** Compact 80G note for the donation form area (no calculator). */
export function TaxInlineNote() {
  return <p className="tax-inline-note"><FileCheck2 size={15} /> 80G receipts are issued with every recorded donation. Confirm current exemption status with the foundation.</p>;
}

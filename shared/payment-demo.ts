// Payment-mode boundary: no gateway credentials live here. Demo and future live gateways share the same small checkout contract.
export type PaymentKind = "donation" | "membership";
export type PaymentGatewayMode = "demo" | "razorpay";
export type DemoCheckoutOutcome = "success" | "failed";
export type DemoCheckoutResult = { status: DemoCheckoutOutcome; reference?: string; message: string };

export const MEMBERSHIP_OPTIONS = [
  { amount: 1100, label: "Annual membership", detail: "One year of support" },
  { amount: 10000, label: "Lifetime membership", detail: "A permanent commitment" },
] as const;

export const DONATION_PRESETS = [2000, 4000, 8000, 16000] as const;
export const MINIMUM_PAYMENT_AMOUNT = 10;

export function resolvePaymentGatewayMode(value?: string): PaymentGatewayMode {
  return value === "razorpay" ? "razorpay" : "demo";
}

export function resolveDemoAmount(kind: PaymentKind, requestedAmount: number): number | null {
  if (!Number.isInteger(requestedAmount) || requestedAmount < MINIMUM_PAYMENT_AMOUNT) return null;
  if (kind === "membership") {
    return MEMBERSHIP_OPTIONS.some((option) => option.amount === requestedAmount) ? requestedAmount : null;
  }
  return requestedAmount;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function createDemoReceipt(kind: PaymentKind, amount: number, now = new Date()): string {
  const date = [now.getUTCFullYear(), String(now.getUTCMonth() + 1).padStart(2, "0"), String(now.getUTCDate()).padStart(2, "0")].join("");
  const type = kind === "membership" ? "MEM" : "DON";
  return `AASW-DEMO-${type}-${date}-${amount}`;
}

export function createDemoCheckoutResult(kind: PaymentKind, amount: number, outcome: DemoCheckoutOutcome, now = new Date()): DemoCheckoutResult {
  if (outcome === "failed") {
    return { status: "failed", message: "Demo unsuccessful attempt shown. No bank, UPI or card request was made." };
  }
  return { status: "success", reference: createDemoReceipt(kind, amount, now), message: "Demo confirmation generated. No money was charged." };
}

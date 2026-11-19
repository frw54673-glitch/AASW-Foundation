export type RazorpayCheckoutSuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  notes: Record<string, string>;
  theme: { color: string };
  handler: (result: RazorpayCheckoutSuccess) => void;
  modal: { ondismiss: () => void };
};

export type RazorpayCheckoutInstance = {
  open: () => void;
  on: (event: "payment.failed", callback: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

export function loadRazorpayCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing && existing.dataset.failed === "true") existing.remove();
    let script = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
    const timer = window.setTimeout(() => {
      script?.setAttribute("data-failed", "true");
      reject(new Error("Razorpay Checkout timed out while loading. Please check your connection and try again."));
    }, 15_000);
    script.addEventListener("load", () => {
      window.clearTimeout(timer);
      if (window.Razorpay) resolve();
      else {
        script?.setAttribute("data-failed", "true");
        reject(new Error("Razorpay Checkout did not load. Please try again."));
      }
    }, { once: true });
    script.addEventListener("error", () => {
      window.clearTimeout(timer);
      script?.setAttribute("data-failed", "true");
      script?.remove();
      reject(new Error("Could not load Razorpay Checkout. Check your connection and try again."));
    }, { once: true });
    if (window.Razorpay) {
      window.clearTimeout(timer);
      resolve();
    }
  });
}

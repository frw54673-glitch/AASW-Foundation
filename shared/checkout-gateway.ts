// Gateway contract: the UI calls this adapter shape for every checkout, while the selected adapter owns its execution details.
import { createDemoCheckoutResult, type DemoCheckoutOutcome, type PaymentGatewayMode, type PaymentKind } from "./payment-demo";

export type CheckoutRequest = {
  kind: PaymentKind;
  amount: number;
  simulateFailure?: boolean;
};

export type CheckoutResponse = {
  status: "success" | "failed" | "not_ready";
  reference?: string;
  message: string;
};

export type CheckoutGateway = {
  mode: PaymentGatewayMode;
  complete: (request: CheckoutRequest) => Promise<CheckoutResponse>;
};

function createDemoGateway(): CheckoutGateway {
  return {
    mode: "demo",
    async complete(request) {
      const outcome: DemoCheckoutOutcome = request.simulateFailure ? "failed" : "success";
      return createDemoCheckoutResult(request.kind, request.amount, outcome);
    },
  };
}

function createRazorpayGatewayPlaceholder(): CheckoutGateway {
  return {
    mode: "razorpay",
    async complete() {
      return {
        status: "not_ready",
        message: "Live Razorpay credentials and server-side order verification must be configured before this checkout can accept money.",
      };
    },
  };
}

export function createCheckoutGateway(mode: PaymentGatewayMode): CheckoutGateway {
  return mode === "razorpay" ? createRazorpayGatewayPlaceholder() : createDemoGateway();
}

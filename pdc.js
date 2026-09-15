import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/PaymentDemoCheckout.tsx");import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false, "VITE_ANALYTICS_ENDPOINT": "", "VITE_ANALYTICS_WEBSITE_ID": "", "VITE_PAYMENT_GATEWAY_MODE": "razorpay", "VITE_USER_NODE_ENV": "development"};import __vite__cjsImport0_react_jsxDevRuntime from "/@fs/C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=109a1417"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/@fs/C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/node_modules/.vite/deps/react.js?v=109a1417"; const useEffect = __vite__cjsImport1_react["useEffect"]; const useMemo = __vite__cjsImport1_react["useMemo"]; const useState = __vite__cjsImport1_react["useState"];
import { Check, CheckCircle2, ChevronRight, CreditCard, Landmark, LoaderCircle, ShieldCheck, Smartphone, X } from "/@fs/C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/node_modules/.vite/deps/lucide-react.js?v=109a1417";
import { DONATION_PRESETS, formatINR, MEMBERSHIP_OPTIONS, resolveDemoAmount, resolvePaymentGatewayMode } from "/@fs/C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/shared/payment-demo.ts";
import { createCheckoutGateway } from "/@fs/C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/shared/checkout-gateway.ts";
import { useLocation } from "/@fs/C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/node_modules/.vite/deps/wouter.js?v=109a1417";
export function PaymentDemoButton({ kind, initialAmount, className = "button button-ochre", label, supporter }) {
  _s();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("details");
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
    const onKeyDown = (event) => {
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
      setError("Demo receipt ke liye naam aur valid email enter kijiye.");
      return;
    }
    if (!validAmount) {
      setError(kind === "membership" ? "Annual ya lifetime membership contribution select kijiye." : "Minimum demo donation ₹10 hai.");
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
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("button", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:91", type: "button", className, onClick: openCheckout, children: [
      label,
      " ",
      /* @__PURE__ */ jsxDEV(ChevronRight, { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:91", size: 16 }, void 0, false, {
        fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
        lineNumber: 91,
        columnNumber: 140
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
      lineNumber: 91,
      columnNumber: 5
    }, this),
    open && /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:92", className: "payment-demo-backdrop", role: "presentation", onMouseDown: (event) => {
      if (event.target === event.currentTarget) closeCheckout();
    }, children: /* @__PURE__ */ jsxDEV("section", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:93", className: "payment-demo-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "payment-demo-title", children: [
      /* @__PURE__ */ jsxDEV("header", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:94", className: "payment-demo-header", children: [
        /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:95", children: [
          /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:95", className: "payment-demo-chip", children: [
            /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:95" }, void 0, false, {
              fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
              lineNumber: 95,
              columnNumber: 172
            }, this),
            "Demo checkout · no charge"
          ] }, void 0, true, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 95,
            columnNumber: 76
          }, this),
          /* @__PURE__ */ jsxDEV("h2", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:95", id: "payment-demo-title", children: step === "complete" ? "Demo confirmed." : `${itemLabel}, with clarity.` }, void 0, false, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 95,
            columnNumber: 272
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 95,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:96", type: "button", className: "payment-demo-close", onClick: closeCheckout, "aria-label": "Close demo checkout", children: /* @__PURE__ */ jsxDEV(X, { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:96", size: 20 }, void 0, false, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 96,
          columnNumber: 181
        }, this) }, void 0, false, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 96,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
        lineNumber: 94,
        columnNumber: 9
      }, this),
      step === "details" && /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:99", className: "payment-demo-body", children: [
        /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:100", className: "payment-demo-disclosure", children: [
          /* @__PURE__ */ jsxDEV(ShieldCheck, { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:100", size: 19 }, void 0, false, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 100,
            columnNumber: 113
          }, this),
          /* @__PURE__ */ jsxDEV("p", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:100", children: [
            /* @__PURE__ */ jsxDEV("strong", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:100", children: "This is a demonstration only." }, void 0, false, {
              fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
              lineNumber: 100,
              columnNumber: 263
            }, this),
            " No money is collected or transferred, and no Razorpay transaction is created."
          ] }, void 0, true, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 100,
            columnNumber: 199
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 100,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:101", className: "payment-demo-grid", children: [
          /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:102", className: "payment-demo-form", children: [
            /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:103", className: "payment-demo-group", children: [
              /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:103", className: "payment-demo-label", children: kind === "membership" ? "Choose membership" : "Choose donation amount" }, void 0, false, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 103,
                columnNumber: 112
              }, this),
              /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:103", className: "payment-amount-options", children: kind === "membership" ? MEMBERSHIP_OPTIONS.map((option) => /* @__PURE__ */ jsxDEV("button", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:104", type: "button", className: `payment-amount-option ${!isCustom && selectedAmount === option.amount ? "payment-amount-active" : ""}`, onClick: () => {
                setSelectedAmount(option.amount);
                setIsCustom(false);
                setError("");
              }, children: [
                /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:104", children: formatINR(option.amount) }, void 0, false, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 104,
                  columnNumber: 380
                }, this),
                /* @__PURE__ */ jsxDEV("small", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:104", children: option.label }, void 0, false, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 104,
                  columnNumber: 480
                }, this),
                /* @__PURE__ */ jsxDEV("i", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:104", children: !isCustom && selectedAmount === option.amount && /* @__PURE__ */ jsxDEV(Check, { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:104", size: 14 }, void 0, false, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 104,
                  columnNumber: 684
                }, this) }, void 0, false, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 104,
                  columnNumber: 570
                }, this)
              ] }, option.amount, true, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 104,
                columnNumber: 77
              }, this)) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
                DONATION_PRESETS.map((preset) => /* @__PURE__ */ jsxDEV("button", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:105", type: "button", className: `payment-amount-option ${!isCustom && selectedAmount === preset ? "payment-amount-active" : ""}`, onClick: () => {
                  setSelectedAmount(preset);
                  setIsCustom(false);
                  setError("");
                }, children: [
                  /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:105", children: formatINR(preset) }, void 0, false, {
                    fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                    lineNumber: 105,
                    columnNumber: 335
                  }, this),
                  /* @__PURE__ */ jsxDEV("small", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:105", children: "Donation" }, void 0, false, {
                    fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                    lineNumber: 105,
                    columnNumber: 428
                  }, this),
                  /* @__PURE__ */ jsxDEV("i", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:105", children: !isCustom && selectedAmount === preset && /* @__PURE__ */ jsxDEV(Check, { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:105", size: 14 }, void 0, false, {
                    fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                    lineNumber: 105,
                    columnNumber: 619
                  }, this) }, void 0, false, {
                    fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                    lineNumber: 105,
                    columnNumber: 512
                  }, this)
                ] }, preset, true, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 105,
                  columnNumber: 53
                }, this)),
                /* @__PURE__ */ jsxDEV("button", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:106", type: "button", className: `payment-amount-option ${isCustom ? "payment-amount-active" : ""}`, onClick: () => {
                  setIsCustom(true);
                  setError("");
                }, children: [
                  /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:106", children: "Custom" }, void 0, false, {
                    fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                    lineNumber: 106,
                    columnNumber: 231
                  }, this),
                  /* @__PURE__ */ jsxDEV("small", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:106", children: "Choose an amount" }, void 0, false, {
                    fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                    lineNumber: 106,
                    columnNumber: 311
                  }, this),
                  /* @__PURE__ */ jsxDEV("i", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:106", children: isCustom && /* @__PURE__ */ jsxDEV(Check, { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:106", size: 14 }, void 0, false, {
                    fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                    lineNumber: 106,
                    columnNumber: 480
                  }, this) }, void 0, false, {
                    fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                    lineNumber: 106,
                    columnNumber: 403
                  }, this)
                ] }, void 0, true, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 106,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 104,
                columnNumber: 782
              }, this) }, void 0, false, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 103,
                columnNumber: 289
              }, this),
              isCustom && /* @__PURE__ */ jsxDEV("label", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:108", className: "payment-input-wrap", children: [
                /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:108", children: "Custom donation in ₹" }, void 0, false, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 108,
                  columnNumber: 133
                }, this),
                /* @__PURE__ */ jsxDEV("input", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:108", inputMode: "numeric", type: "number", min: "10", value: customAmount, onChange: (event) => setCustomAmount(event.target.value), placeholder: "e.g. 2500" }, void 0, false, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 108,
                  columnNumber: 227
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 108,
                columnNumber: 34
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
              lineNumber: 103,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:109", className: "payment-demo-fields", children: [
              /* @__PURE__ */ jsxDEV("label", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:109", className: "payment-input-wrap", children: [
                /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:109", children: "Your name" }, void 0, false, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 109,
                  columnNumber: 212
                }, this),
                /* @__PURE__ */ jsxDEV("input", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:109", value: name, onChange: (event) => setName(event.target.value), placeholder: "Enter your name", autoComplete: "name" }, void 0, false, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 109,
                  columnNumber: 295
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 109,
                columnNumber: 113
              }, this),
              /* @__PURE__ */ jsxDEV("label", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:109", className: "payment-input-wrap", children: [
                /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:109", children: "Email for demo receipt" }, void 0, false, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 109,
                  columnNumber: 585
                }, this),
                /* @__PURE__ */ jsxDEV("input", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:109", value: email, onChange: (event) => setEmail(event.target.value), placeholder: "you@example.com", type: "email", autoComplete: "email" }, void 0, false, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 109,
                  columnNumber: 681
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 109,
                columnNumber: 486
              }, this),
              /* @__PURE__ */ jsxDEV("label", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:109", className: "payment-input-wrap", children: [
                /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:109", children: [
                  "Phone ",
                  /* @__PURE__ */ jsxDEV("small", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:109", children: "(optional)" }, void 0, false, {
                    fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                    lineNumber: 109,
                    columnNumber: 1060
                  }, this)
                ] }, void 0, true, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 109,
                  columnNumber: 987
                }, this),
                /* @__PURE__ */ jsxDEV("input", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:109", value: phone, onChange: (event) => setPhone(event.target.value), placeholder: "+91", inputMode: "tel", autoComplete: "tel" }, void 0, false, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 109,
                  columnNumber: 1153
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 109,
                columnNumber: 888
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
              lineNumber: 109,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:110", className: "payment-demo-group", children: [
              /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:110", className: "payment-demo-label", children: [
                "Preferred payment method ",
                /* @__PURE__ */ jsxDEV("small", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:110", children: "(visual demo only)" }, void 0, false, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 110,
                  columnNumber: 235
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 110,
                columnNumber: 112
              }, this),
              /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:110", className: "payment-method-row", children: [{ label: "UPI", icon: Smartphone }, { label: "Card", icon: CreditCard }, { label: "Bank", icon: Landmark }].map(({ label: methodLabel, icon: Icon }) => /* @__PURE__ */ jsxDEV("button", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:110", type: "button", onClick: () => setMethod(methodLabel), className: `payment-method ${method === methodLabel ? "payment-method-active" : ""}`, children: [
                /* @__PURE__ */ jsxDEV(Icon, { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:110", size: 16 }, void 0, false, {
                  fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                  lineNumber: 110,
                  columnNumber: 813
                }, this),
                methodLabel
              ] }, methodLabel, true, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 110,
                columnNumber: 587
              }, this)) }, void 0, false, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 110,
                columnNumber: 336
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
              lineNumber: 110,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("label", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:111", className: "payment-demo-simulation", children: [
              /* @__PURE__ */ jsxDEV("input", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:111", type: "checkbox", checked: simulateFailure, onChange: (event) => setSimulateFailure(event.target.checked) }, void 0, false, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 111,
                columnNumber: 119
              }, this),
              /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:111", children: "Show an unsuccessful attempt in this demo." }, void 0, false, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 111,
                columnNumber: 294
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
              lineNumber: 111,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 102,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("aside", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:113", className: "payment-demo-summary", children: [
            /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:113", className: "section-kicker", children: "Demo summary" }, void 0, false, {
              fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
              lineNumber: 113,
              columnNumber: 114
            }, this),
            /* @__PURE__ */ jsxDEV("h3", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:113", children: itemLabel }, void 0, false, {
              fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
              lineNumber: 113,
              columnNumber: 227
            }, this),
            /* @__PURE__ */ jsxDEV("strong", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:113", children: formattedAmount }, void 0, false, {
              fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
              lineNumber: 113,
              columnNumber: 308
            }, this),
            /* @__PURE__ */ jsxDEV("p", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:113", children: kind === "membership" ? "AASW membership demonstration — annual or lifetime contribution shown for flow preview." : "AASW donation demonstration — no amount will be debited." }, void 0, false, {
              fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
              lineNumber: 113,
              columnNumber: 403
            }, this),
            /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:113", children: [
              /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:113", children: "Gateway status" }, void 0, false, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 113,
                columnNumber: 713
              }, this),
              /* @__PURE__ */ jsxDEV("b", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:113", children: checkoutGateway.mode === "demo" ? "Demo mode" : "Live setup pending" }, void 0, false, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 113,
                columnNumber: 801
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
              lineNumber: 113,
              columnNumber: 647
            }, this),
            /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:113", children: [
              /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:113", children: "Payment method" }, void 0, false, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 113,
                columnNumber: 1011
              }, this),
              /* @__PURE__ */ jsxDEV("b", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:113", children: method }, void 0, false, {
                fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
                lineNumber: 113,
                columnNumber: 1099
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
              lineNumber: 113,
              columnNumber: 945
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 113,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 101,
          columnNumber: 11
        }, this),
        error && /* @__PURE__ */ jsxDEV("p", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:115", className: "payment-demo-error", role: "alert", children: error }, void 0, false, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 115,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV("button", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:116", type: "button", className: "button button-ochre payment-demo-submit", onClick: continueDemo, children: [
          "Continue to demo confirmation ",
          /* @__PURE__ */ jsxDEV(ChevronRight, { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:116", size: 16 }, void 0, false, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 116,
            columnNumber: 199
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 116,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
        lineNumber: 99,
        columnNumber: 32
      }, this),
      step === "processing" && /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:119", className: "payment-demo-processing", children: [
        /* @__PURE__ */ jsxDEV(LoaderCircle, { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:119", size: 34 }, void 0, false, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 119,
          columnNumber: 137
        }, this),
        /* @__PURE__ */ jsxDEV("h3", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:119", children: "Demo payment step loading…" }, void 0, false, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 119,
          columnNumber: 224
        }, this),
        /* @__PURE__ */ jsxDEV("p", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:119", children: "No bank, UPI or card request is being sent." }, void 0, false, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 119,
          columnNumber: 320
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
        lineNumber: 119,
        columnNumber: 35
      }, this),
      step === "failed" && /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:121", className: "payment-demo-complete payment-demo-failed", children: [
        /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:121", className: "payment-demo-complete-icon", children: /* @__PURE__ */ jsxDEV(X, { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:121", size: 28 }, void 0, false, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 121,
          columnNumber: 257
        }, this) }, void 0, false, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 121,
          columnNumber: 151
        }, this),
        /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:121", className: "section-kicker", children: "Demo unsuccessful attempt" }, void 0, false, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 121,
          columnNumber: 340
        }, this),
        /* @__PURE__ */ jsxDEV("h3", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:121", children: "This is the retry path." }, void 0, false, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 121,
          columnNumber: 466
        }, this),
        /* @__PURE__ */ jsxDEV("p", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:121", children: failureMessage || "No money has been charged. You can return to the details and preview the flow again." }, void 0, false, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 121,
          columnNumber: 559
        }, this),
        /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:121", className: "payment-demo-receipt", children: [
          /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:121", children: "Gateway response" }, void 0, false, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 121,
            columnNumber: 832
          }, this),
          /* @__PURE__ */ jsxDEV("strong", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:121", children: "DEMO-ATTEMPT-NOT-COMPLETED" }, void 0, false, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 121,
            columnNumber: 922
          }, this),
          /* @__PURE__ */ jsxDEV("small", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:121", children: [
            formattedAmount,
            " · ",
            method
          ] }, void 0, true, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 121,
            columnNumber: 1026
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 121,
          columnNumber: 733
        }, this),
        /* @__PURE__ */ jsxDEV("button", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:121", type: "button", className: "button button-primary", onClick: () => setStep("details"), children: [
          "Try demo again ",
          /* @__PURE__ */ jsxDEV(ChevronRight, { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:121", size: 16 }, void 0, false, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 121,
            columnNumber: 1303
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 121,
          columnNumber: 1136
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
        lineNumber: 121,
        columnNumber: 31
      }, this),
      step === "complete" && /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:123", className: "payment-demo-complete", children: [
        /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:123", className: "payment-demo-complete-icon", children: /* @__PURE__ */ jsxDEV(CheckCircle2, { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:123", size: 31 }, void 0, false, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 123,
          columnNumber: 239
        }, this) }, void 0, false, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 123,
          columnNumber: 133
        }, this),
        /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:123", className: "section-kicker", children: "Demo confirmation" }, void 0, false, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 123,
          columnNumber: 333
        }, this),
        /* @__PURE__ */ jsxDEV("h3", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:123", children: [
          "Your ",
          itemLabel.toLowerCase(),
          " journey is mapped."
        ] }, void 0, true, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 123,
          columnNumber: 451
        }, this),
        /* @__PURE__ */ jsxDEV("p", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:123", children: [
          name || "Supporter",
          ", this is a preview receipt only. No money has been charged, and AASW has not received a payment."
        ] }, void 0, true, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 123,
          columnNumber: 570
        }, this),
        /* @__PURE__ */ jsxDEV("div", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:123", className: "payment-demo-receipt", children: [
          /* @__PURE__ */ jsxDEV("span", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:123", children: "Preview reference" }, void 0, false, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 123,
            columnNumber: 855
          }, this),
          /* @__PURE__ */ jsxDEV("strong", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:123", children: [
            "AASW-DEMO-",
            kind === "membership" ? "MEM" : "DON",
            "-",
            amount || initialAmount
          ] }, void 0, true, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 123,
            columnNumber: 946
          }, this),
          /* @__PURE__ */ jsxDEV("small", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:123", children: [
            formattedAmount,
            " · ",
            method
          ] }, void 0, true, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 123,
            columnNumber: 1099
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 123,
          columnNumber: 756
        }, this),
        /* @__PURE__ */ jsxDEV("button", { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:123", type: "button", className: "button button-primary", onClick: () => setOpen(false), children: [
          "Back to AASW ",
          /* @__PURE__ */ jsxDEV(ChevronRight, { "data-loc": "client\\src\\components\\PaymentDemoCheckout.tsx:123", size: 16 }, void 0, false, {
            fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
            lineNumber: 123,
            columnNumber: 1370
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
          lineNumber: 123,
          columnNumber: 1209
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
        lineNumber: 123,
        columnNumber: 33
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
      lineNumber: 93,
      columnNumber: 7
    }, this) }, void 0, false, {
      fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
      lineNumber: 92,
      columnNumber: 14
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx",
    lineNumber: 90,
    columnNumber: 10
  }, this);
}
_s(PaymentDemoButton, "4joFs8GTQbZUs9RK+DC73zZrA9g=", false, function() {
  return [useLocation];
});
_c = PaymentDemoButton;
var _c;
$RefreshReg$(_c, "PaymentDemoButton");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "C:/Users/om/Downloads/AASW-NEW-VERSION-main/AASW-NEW-VERSION-main/client/src/components/PaymentDemoCheckout.tsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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QUEsUUFBSyx1QkFBQywyRUFBR3ZEO0FBQUFBLGtCQUFRO0FBQUEsVUFBWTtBQUFBLGFBQXhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBeUg7QUFBQSxRQUFJLHVCQUFDLDZFQUFJLFdBQVUsd0JBQXVCO0FBQUEsaUNBQUMsOEVBQUssaUNBQU47QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBdUI7QUFBQSxVQUFPLHVCQUFDLGdGQUFPO0FBQUE7QUFBQSxZQUFXakIsU0FBUyxlQUFlLFFBQVE7QUFBQSxZQUFNO0FBQUEsWUFBRStCLFVBQVU5QjtBQUFBQSxlQUFyRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFtRjtBQUFBLFVBQVMsdUJBQUMsK0VBQU9nQztBQUFBQTtBQUFBQSxZQUFnQjtBQUFBLFlBQUlWO0FBQUFBLGVBQTVCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQW1DO0FBQUEsYUFBbk07QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUEyTTtBQUFBLFFBQU0sdUJBQUMsZ0ZBQU8sTUFBSyxVQUFTLFdBQVUseUJBQXdCLFNBQVMsTUFBTWYsUUFBUSxLQUFLLEdBQUc7QUFBQTtBQUFBLFVBQWEsdUJBQUMsb0ZBQWEsTUFBTSxNQUFwQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUF1QjtBQUFBLGFBQTNIO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBOEg7QUFBQSxXQUFwckI7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUE2ckI7QUFBQSxTQTlCdnRCO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0ErQkEsS0FoQ087QUFBQTtBQUFBO0FBQUE7QUFBQSxXQWlDVDtBQUFBLE9BbkNLO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FvQ1A7QUFDRjtBQUFDSCxHQTdHZU4sbUJBQWlCO0FBQUEsVUFDVkQsV0FBVztBQUFBO0FBQUEyRSxLQURsQjFFO0FBQWlCLElBQUEwRTtBQUFBQyxhQUFBRCxJQUFBIiwibmFtZXMiOlsidXNlRWZmZWN0IiwidXNlTWVtbyIsInVzZVN0YXRlIiwiQ2hlY2siLCJDaGVja0NpcmNsZTIiLCJDaGV2cm9uUmlnaHQiLCJDcmVkaXRDYXJkIiwiTGFuZG1hcmsiLCJMb2FkZXJDaXJjbGUiLCJTaGllbGRDaGVjayIsIlNtYXJ0cGhvbmUiLCJYIiwiRE9OQVRJT05fUFJFU0VUUyIsImZvcm1hdElOUiIsIk1FTUJFUlNISVBfT1BUSU9OUyIsInJlc29sdmVEZW1vQW1vdW50IiwicmVzb2x2ZVBheW1lbnRHYXRld2F5TW9kZSIsImNyZWF0ZUNoZWNrb3V0R2F0ZXdheSIsInVzZUxvY2F0aW9uIiwiUGF5bWVudERlbW9CdXR0b24iLCJraW5kIiwiaW5pdGlhbEFtb3VudCIsImNsYXNzTmFtZSIsImxhYmVsIiwic3VwcG9ydGVyIiwiX3MiLCJuYXZpZ2F0ZSIsIm9wZW4iLCJzZXRPcGVuIiwic3RlcCIsInNldFN0ZXAiLCJzZWxlY3RlZEFtb3VudCIsInNldFNlbGVjdGVkQW1vdW50IiwiY3VzdG9tQW1vdW50Iiwic2V0Q3VzdG9tQW1vdW50IiwiaXNDdXN0b20iLCJzZXRJc0N1c3RvbSIsIm5hbWUiLCJzZXROYW1lIiwiZW1haWwiLCJzZXRFbWFpbCIsInBob25lIiwic2V0UGhvbmUiLCJtZXRob2QiLCJzZXRNZXRob2QiLCJzaW11bGF0ZUZhaWx1cmUiLCJzZXRTaW11bGF0ZUZhaWx1cmUiLCJlcnJvciIsInNldEVycm9yIiwiZmFpbHVyZU1lc3NhZ2UiLCJzZXRGYWlsdXJlTWVzc2FnZSIsImFtb3VudCIsIk51bWJlciIsImZvcm1hdHRlZEFtb3VudCIsIml0ZW1MYWJlbCIsImdhdGV3YXlNb2RlIiwiaW1wb3J0IiwiZW52IiwiVklURV9QQVlNRU5UX0dBVEVXQVlfTU9ERSIsImNoZWNrb3V0R2F0ZXdheSIsIm9uS2V5RG93biIsImV2ZW50Iiwia2V5Iiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJvcGVuQ2hlY2tvdXQiLCJjbG9zZUNoZWNrb3V0IiwiY29udGludWVEZW1vIiwidmFsaWRBbW91bnQiLCJ0cmltIiwiaW5jbHVkZXMiLCJQcm9taXNlIiwicmVzb2x2ZSIsInNldFRpbWVvdXQiLCJyZXN1bHQiLCJjb21wbGV0ZSIsInN0YXR1cyIsInJlY2VpcHQiLCJlbmNvZGVVUklDb21wb25lbnQiLCJtZXNzYWdlIiwidGFyZ2V0IiwiY3VycmVudFRhcmdldCIsIm1hcCIsIm9wdGlvbiIsInByZXNldCIsInZhbHVlIiwiaWNvbiIsIm1ldGhvZExhYmVsIiwiSWNvbiIsImNoZWNrZWQiLCJtb2RlIiwidG9Mb3dlckNhc2UiLCJfYyIsIiRSZWZyZXNoUmVnJCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJQYXltZW50RGVtb0NoZWNrb3V0LnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBEZXNpZ24gcmVtaW5kZXI6IEh1bWFuLWZpcnN0IENpdmljIEVkaXRvcmlhbCDigJQgY2hlY2tvdXQgc2hvdWxkIGZlZWwgY2FuZGlkLCBjYWxtIGFuZCBjbGVhcmx5IG5vbi10cmFuc2FjdGlvbmFsIHVudGlsIGxpdmUgcGF5bWVudCBrZXlzIGFyZSBzdXBwbGllZC5cbmltcG9ydCB7IHVzZUVmZmVjdCwgdXNlTWVtbywgdXNlU3RhdGUgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB7IENoZWNrLCBDaGVja0NpcmNsZTIsIENoZXZyb25SaWdodCwgQ3JlZGl0Q2FyZCwgTGFuZG1hcmssIExvYWRlckNpcmNsZSwgU2hpZWxkQ2hlY2ssIFNtYXJ0cGhvbmUsIFggfSBmcm9tIFwibHVjaWRlLXJlYWN0XCI7XG5pbXBvcnQgeyBET05BVElPTl9QUkVTRVRTLCBmb3JtYXRJTlIsIE1FTUJFUlNISVBfT1BUSU9OUywgcmVzb2x2ZURlbW9BbW91bnQsIHJlc29sdmVQYXltZW50R2F0ZXdheU1vZGUsIHR5cGUgUGF5bWVudEtpbmQgfSBmcm9tIFwiQHNoYXJlZC9wYXltZW50LWRlbW9cIjtcbmltcG9ydCB7IGNyZWF0ZUNoZWNrb3V0R2F0ZXdheSB9IGZyb20gXCJAc2hhcmVkL2NoZWNrb3V0LWdhdGV3YXlcIjtcbmltcG9ydCB7IHVzZUxvY2F0aW9uIH0gZnJvbSBcIndvdXRlclwiO1xuXG50eXBlIFBheW1lbnREZW1vQnV0dG9uUHJvcHMgPSB7XG4gIGtpbmQ6IFBheW1lbnRLaW5kO1xuICBpbml0aWFsQW1vdW50OiBudW1iZXI7XG4gIGNsYXNzTmFtZT86IHN0cmluZztcbiAgbGFiZWw6IHN0cmluZztcbiAgc3VwcG9ydGVyPzogeyBuYW1lOiBzdHJpbmc7IGVtYWlsOiBzdHJpbmc7IHBob25lOiBzdHJpbmcgfTtcbn07XG5cbnR5cGUgQ2hlY2tvdXRTdGF0ZSA9IFwiZGV0YWlsc1wiIHwgXCJwcm9jZXNzaW5nXCIgfCBcImNvbXBsZXRlXCIgfCBcImZhaWxlZFwiO1xuXG5leHBvcnQgZnVuY3Rpb24gUGF5bWVudERlbW9CdXR0b24oeyBraW5kLCBpbml0aWFsQW1vdW50LCBjbGFzc05hbWUgPSBcImJ1dHRvbiBidXR0b24tb2NocmVcIiwgbGFiZWwsIHN1cHBvcnRlciB9OiBQYXltZW50RGVtb0J1dHRvblByb3BzKSB7XG4gIGNvbnN0IFssIG5hdmlnYXRlXSA9IHVzZUxvY2F0aW9uKCk7XG4gIGNvbnN0IFtvcGVuLCBzZXRPcGVuXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW3N0ZXAsIHNldFN0ZXBdID0gdXNlU3RhdGU8Q2hlY2tvdXRTdGF0ZT4oXCJkZXRhaWxzXCIpO1xuICBjb25zdCBbc2VsZWN0ZWRBbW91bnQsIHNldFNlbGVjdGVkQW1vdW50XSA9IHVzZVN0YXRlKGluaXRpYWxBbW91bnQpO1xuICBjb25zdCBbY3VzdG9tQW1vdW50LCBzZXRDdXN0b21BbW91bnRdID0gdXNlU3RhdGUoXCJcIik7XG4gIGNvbnN0IFtpc0N1c3RvbSwgc2V0SXNDdXN0b21dID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbbmFtZSwgc2V0TmFtZV0gPSB1c2VTdGF0ZShcIlwiKTtcbiAgY29uc3QgW2VtYWlsLCBzZXRFbWFpbF0gPSB1c2VTdGF0ZShcIlwiKTtcbiAgY29uc3QgW3Bob25lLCBzZXRQaG9uZV0gPSB1c2VTdGF0ZShcIlwiKTtcbiAgY29uc3QgW21ldGhvZCwgc2V0TWV0aG9kXSA9IHVzZVN0YXRlKFwiVVBJXCIpO1xuICBjb25zdCBbc2ltdWxhdGVGYWlsdXJlLCBzZXRTaW11bGF0ZUZhaWx1cmVdID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbZXJyb3IsIHNldEVycm9yXSA9IHVzZVN0YXRlKFwiXCIpO1xuICBjb25zdCBbZmFpbHVyZU1lc3NhZ2UsIHNldEZhaWx1cmVNZXNzYWdlXSA9IHVzZVN0YXRlKFwiXCIpO1xuXG4gIGNvbnN0IGFtb3VudCA9IHVzZU1lbW8oKCkgPT4gaXNDdXN0b20gPyBOdW1iZXIoY3VzdG9tQW1vdW50KSA6IHNlbGVjdGVkQW1vdW50LCBbY3VzdG9tQW1vdW50LCBpc0N1c3RvbSwgc2VsZWN0ZWRBbW91bnRdKTtcbiAgY29uc3QgZm9ybWF0dGVkQW1vdW50ID0gcmVzb2x2ZURlbW9BbW91bnQoa2luZCwgYW1vdW50KSA/IGZvcm1hdElOUihhbW91bnQpIDogXCLigJRcIjtcbiAgY29uc3QgaXRlbUxhYmVsID0ga2luZCA9PT0gXCJtZW1iZXJzaGlwXCIgPyBcIk1lbWJlcnNoaXBcIiA6IFwiRG9uYXRpb25cIjtcbiAgY29uc3QgZ2F0ZXdheU1vZGUgPSByZXNvbHZlUGF5bWVudEdhdGV3YXlNb2RlKGltcG9ydC5tZXRhLmVudi5WSVRFX1BBWU1FTlRfR0FURVdBWV9NT0RFKTtcbiAgY29uc3QgY2hlY2tvdXRHYXRld2F5ID0gdXNlTWVtbygoKSA9PiBjcmVhdGVDaGVja291dEdhdGV3YXkoZ2F0ZXdheU1vZGUpLCBbZ2F0ZXdheU1vZGVdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghb3BlbikgcmV0dXJuO1xuICAgIGNvbnN0IG9uS2V5RG93biA9IChldmVudDogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgICAgaWYgKGV2ZW50LmtleSA9PT0gXCJFc2NhcGVcIiAmJiBzdGVwICE9PSBcInByb2Nlc3NpbmdcIikgc2V0T3BlbihmYWxzZSk7XG4gICAgfTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgb25LZXlEb3duKTtcbiAgICByZXR1cm4gKCkgPT4gd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIG9uS2V5RG93bik7XG4gIH0sIFtvcGVuLCBzdGVwXSk7XG5cbiAgY29uc3Qgb3BlbkNoZWNrb3V0ID0gKCkgPT4ge1xuICAgIHNldE9wZW4odHJ1ZSk7XG4gICAgc2V0U3RlcChcImRldGFpbHNcIik7XG4gICAgc2V0U2VsZWN0ZWRBbW91bnQoaW5pdGlhbEFtb3VudCk7XG4gICAgc2V0SXNDdXN0b20oZmFsc2UpO1xuICAgIHNldEN1c3RvbUFtb3VudChcIlwiKTtcbiAgICBzZXRTaW11bGF0ZUZhaWx1cmUoZmFsc2UpO1xuICAgIHNldEZhaWx1cmVNZXNzYWdlKFwiXCIpO1xuICAgIHNldEVycm9yKFwiXCIpO1xuICAgIHNldE5hbWUoc3VwcG9ydGVyPy5uYW1lID8/IFwiXCIpO1xuICAgIHNldEVtYWlsKHN1cHBvcnRlcj8uZW1haWwgPz8gXCJcIik7XG4gICAgc2V0UGhvbmUoc3VwcG9ydGVyPy5waG9uZSA/PyBcIlwiKTtcbiAgfTtcblxuICBjb25zdCBjbG9zZUNoZWNrb3V0ID0gKCkgPT4ge1xuICAgIGlmIChzdGVwICE9PSBcInByb2Nlc3NpbmdcIikgc2V0T3BlbihmYWxzZSk7XG4gIH07XG5cbiAgY29uc3QgY29udGludWVEZW1vID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHZhbGlkQW1vdW50ID0gcmVzb2x2ZURlbW9BbW91bnQoa2luZCwgYW1vdW50KTtcbiAgICBpZiAoIW5hbWUudHJpbSgpIHx8ICFlbWFpbC50cmltKCkgfHwgIWVtYWlsLmluY2x1ZGVzKFwiQFwiKSkge1xuICAgICAgc2V0RXJyb3IoXCJEZW1vIHJlY2VpcHQga2UgbGl5ZSBuYWFtIGF1ciB2YWxpZCBlbWFpbCBlbnRlciBraWppeWUuXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXZhbGlkQW1vdW50KSB7XG4gICAgICBzZXRFcnJvcihraW5kID09PSBcIm1lbWJlcnNoaXBcIiA/IFwiQW5udWFsIHlhIGxpZmV0aW1lIG1lbWJlcnNoaXAgY29udHJpYnV0aW9uIHNlbGVjdCBraWppeWUuXCIgOiBcIk1pbmltdW0gZGVtbyBkb25hdGlvbiDigrkxMCBoYWkuXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzZXRFcnJvcihcIlwiKTtcbiAgICBzZXRTdGVwKFwicHJvY2Vzc2luZ1wiKTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gd2luZG93LnNldFRpbWVvdXQocmVzb2x2ZSwgODUwKSk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hlY2tvdXRHYXRld2F5LmNvbXBsZXRlKHsga2luZCwgYW1vdW50OiB2YWxpZEFtb3VudCwgc2ltdWxhdGVGYWlsdXJlIH0pO1xuICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSBcInN1Y2Nlc3NcIikge1xuICAgICAgc2V0T3BlbihmYWxzZSk7XG4gICAgICBjb25zdCByZWNlaXB0ID0gYEFBU1ctREVNTy0ke2tpbmQgPT09IFwibWVtYmVyc2hpcFwiID8gXCJNRU1cIiA6IFwiRE9OXCJ9LSR7dmFsaWRBbW91bnR9YDtcbiAgICAgIG5hdmlnYXRlKGAvdGhhbmsteW91P3JlY2VpcHQ9JHtlbmNvZGVVUklDb21wb25lbnQocmVjZWlwdCl9JmtpbmQ9JHtraW5kfSZhbW91bnQ9JHt2YWxpZEFtb3VudH0mZGVtbz10cnVlYCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHNldEZhaWx1cmVNZXNzYWdlKHJlc3VsdC5tZXNzYWdlKTtcbiAgICBzZXRTdGVwKFwiZmFpbGVkXCIpO1xuICB9O1xuXG4gIHJldHVybiA8PlxuICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17Y2xhc3NOYW1lfSBvbkNsaWNrPXtvcGVuQ2hlY2tvdXR9PntsYWJlbH0gPENoZXZyb25SaWdodCBzaXplPXsxNn0gLz48L2J1dHRvbj5cbiAgICB7b3BlbiAmJiA8ZGl2IGNsYXNzTmFtZT1cInBheW1lbnQtZGVtby1iYWNrZHJvcFwiIHJvbGU9XCJwcmVzZW50YXRpb25cIiBvbk1vdXNlRG93bj17KGV2ZW50KSA9PiB7IGlmIChldmVudC50YXJnZXQgPT09IGV2ZW50LmN1cnJlbnRUYXJnZXQpIGNsb3NlQ2hlY2tvdXQoKTsgfX0+XG4gICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJwYXltZW50LWRlbW8tbW9kYWxcIiByb2xlPVwiZGlhbG9nXCIgYXJpYS1tb2RhbD1cInRydWVcIiBhcmlhLWxhYmVsbGVkYnk9XCJwYXltZW50LWRlbW8tdGl0bGVcIj5cbiAgICAgICAgPGhlYWRlciBjbGFzc05hbWU9XCJwYXltZW50LWRlbW8taGVhZGVyXCI+XG4gICAgICAgICAgPGRpdj48c3BhbiBjbGFzc05hbWU9XCJwYXltZW50LWRlbW8tY2hpcFwiPjxzcGFuIC8+RGVtbyBjaGVja291dCDCtyBubyBjaGFyZ2U8L3NwYW4+PGgyIGlkPVwicGF5bWVudC1kZW1vLXRpdGxlXCI+e3N0ZXAgPT09IFwiY29tcGxldGVcIiA/IFwiRGVtbyBjb25maXJtZWQuXCIgOiBgJHtpdGVtTGFiZWx9LCB3aXRoIGNsYXJpdHkuYH08L2gyPjwvZGl2PlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cInBheW1lbnQtZGVtby1jbG9zZVwiIG9uQ2xpY2s9e2Nsb3NlQ2hlY2tvdXR9IGFyaWEtbGFiZWw9XCJDbG9zZSBkZW1vIGNoZWNrb3V0XCI+PFggc2l6ZT17MjB9IC8+PC9idXR0b24+XG4gICAgICAgIDwvaGVhZGVyPlxuXG4gICAgICAgIHtzdGVwID09PSBcImRldGFpbHNcIiAmJiA8ZGl2IGNsYXNzTmFtZT1cInBheW1lbnQtZGVtby1ib2R5XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwYXltZW50LWRlbW8tZGlzY2xvc3VyZVwiPjxTaGllbGRDaGVjayBzaXplPXsxOX0gLz48cD48c3Ryb25nPlRoaXMgaXMgYSBkZW1vbnN0cmF0aW9uIG9ubHkuPC9zdHJvbmc+IE5vIG1vbmV5IGlzIGNvbGxlY3RlZCBvciB0cmFuc2ZlcnJlZCwgYW5kIG5vIFJhem9ycGF5IHRyYW5zYWN0aW9uIGlzIGNyZWF0ZWQuPC9wPjwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicGF5bWVudC1kZW1vLWdyaWRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicGF5bWVudC1kZW1vLWZvcm1cIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwYXltZW50LWRlbW8tZ3JvdXBcIj48c3BhbiBjbGFzc05hbWU9XCJwYXltZW50LWRlbW8tbGFiZWxcIj57a2luZCA9PT0gXCJtZW1iZXJzaGlwXCIgPyBcIkNob29zZSBtZW1iZXJzaGlwXCIgOiBcIkNob29zZSBkb25hdGlvbiBhbW91bnRcIn08L3NwYW4+PGRpdiBjbGFzc05hbWU9XCJwYXltZW50LWFtb3VudC1vcHRpb25zXCI+XG4gICAgICAgICAgICAgICAge2tpbmQgPT09IFwibWVtYmVyc2hpcFwiID8gTUVNQkVSU0hJUF9PUFRJT05TLm1hcCgob3B0aW9uKSA9PiA8YnV0dG9uIGtleT17b3B0aW9uLmFtb3VudH0gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17YHBheW1lbnQtYW1vdW50LW9wdGlvbiAkeyFpc0N1c3RvbSAmJiBzZWxlY3RlZEFtb3VudCA9PT0gb3B0aW9uLmFtb3VudCA/IFwicGF5bWVudC1hbW91bnQtYWN0aXZlXCIgOiBcIlwifWB9IG9uQ2xpY2s9eygpID0+IHsgc2V0U2VsZWN0ZWRBbW91bnQob3B0aW9uLmFtb3VudCk7IHNldElzQ3VzdG9tKGZhbHNlKTsgc2V0RXJyb3IoXCJcIik7IH19PjxzcGFuPntmb3JtYXRJTlIob3B0aW9uLmFtb3VudCl9PC9zcGFuPjxzbWFsbD57b3B0aW9uLmxhYmVsfTwvc21hbGw+PGk+eyFpc0N1c3RvbSAmJiBzZWxlY3RlZEFtb3VudCA9PT0gb3B0aW9uLmFtb3VudCAmJiA8Q2hlY2sgc2l6ZT17MTR9IC8+fTwvaT48L2J1dHRvbj4pIDogPD5cbiAgICAgICAgICAgICAgICAgIHtET05BVElPTl9QUkVTRVRTLm1hcCgocHJlc2V0KSA9PiA8YnV0dG9uIGtleT17cHJlc2V0fSB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtgcGF5bWVudC1hbW91bnQtb3B0aW9uICR7IWlzQ3VzdG9tICYmIHNlbGVjdGVkQW1vdW50ID09PSBwcmVzZXQgPyBcInBheW1lbnQtYW1vdW50LWFjdGl2ZVwiIDogXCJcIn1gfSBvbkNsaWNrPXsoKSA9PiB7IHNldFNlbGVjdGVkQW1vdW50KHByZXNldCk7IHNldElzQ3VzdG9tKGZhbHNlKTsgc2V0RXJyb3IoXCJcIik7IH19PjxzcGFuPntmb3JtYXRJTlIocHJlc2V0KX08L3NwYW4+PHNtYWxsPkRvbmF0aW9uPC9zbWFsbD48aT57IWlzQ3VzdG9tICYmIHNlbGVjdGVkQW1vdW50ID09PSBwcmVzZXQgJiYgPENoZWNrIHNpemU9ezE0fSAvPn08L2k+PC9idXR0b24+KX1cbiAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17YHBheW1lbnQtYW1vdW50LW9wdGlvbiAke2lzQ3VzdG9tID8gXCJwYXltZW50LWFtb3VudC1hY3RpdmVcIiA6IFwiXCJ9YH0gb25DbGljaz17KCkgPT4geyBzZXRJc0N1c3RvbSh0cnVlKTsgc2V0RXJyb3IoXCJcIik7IH19PjxzcGFuPkN1c3RvbTwvc3Bhbj48c21hbGw+Q2hvb3NlIGFuIGFtb3VudDwvc21hbGw+PGk+e2lzQ3VzdG9tICYmIDxDaGVjayBzaXplPXsxNH0gLz59PC9pPjwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvPn1cbiAgICAgICAgICAgICAgPC9kaXY+e2lzQ3VzdG9tICYmIDxsYWJlbCBjbGFzc05hbWU9XCJwYXltZW50LWlucHV0LXdyYXBcIj48c3Bhbj5DdXN0b20gZG9uYXRpb24gaW4g4oK5PC9zcGFuPjxpbnB1dCBpbnB1dE1vZGU9XCJudW1lcmljXCIgdHlwZT1cIm51bWJlclwiIG1pbj1cIjEwXCIgdmFsdWU9e2N1c3RvbUFtb3VudH0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0Q3VzdG9tQW1vdW50KGV2ZW50LnRhcmdldC52YWx1ZSl9IHBsYWNlaG9sZGVyPVwiZS5nLiAyNTAwXCIgLz48L2xhYmVsPn08L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwYXltZW50LWRlbW8tZmllbGRzXCI+PGxhYmVsIGNsYXNzTmFtZT1cInBheW1lbnQtaW5wdXQtd3JhcFwiPjxzcGFuPllvdXIgbmFtZTwvc3Bhbj48aW5wdXQgdmFsdWU9e25hbWV9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldE5hbWUoZXZlbnQudGFyZ2V0LnZhbHVlKX0gcGxhY2Vob2xkZXI9XCJFbnRlciB5b3VyIG5hbWVcIiBhdXRvQ29tcGxldGU9XCJuYW1lXCIgLz48L2xhYmVsPjxsYWJlbCBjbGFzc05hbWU9XCJwYXltZW50LWlucHV0LXdyYXBcIj48c3Bhbj5FbWFpbCBmb3IgZGVtbyByZWNlaXB0PC9zcGFuPjxpbnB1dCB2YWx1ZT17ZW1haWx9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEVtYWlsKGV2ZW50LnRhcmdldC52YWx1ZSl9IHBsYWNlaG9sZGVyPVwieW91QGV4YW1wbGUuY29tXCIgdHlwZT1cImVtYWlsXCIgYXV0b0NvbXBsZXRlPVwiZW1haWxcIiAvPjwvbGFiZWw+PGxhYmVsIGNsYXNzTmFtZT1cInBheW1lbnQtaW5wdXQtd3JhcFwiPjxzcGFuPlBob25lIDxzbWFsbD4ob3B0aW9uYWwpPC9zbWFsbD48L3NwYW4+PGlucHV0IHZhbHVlPXtwaG9uZX0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0UGhvbmUoZXZlbnQudGFyZ2V0LnZhbHVlKX0gcGxhY2Vob2xkZXI9XCIrOTFcIiBpbnB1dE1vZGU9XCJ0ZWxcIiBhdXRvQ29tcGxldGU9XCJ0ZWxcIiAvPjwvbGFiZWw+PC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicGF5bWVudC1kZW1vLWdyb3VwXCI+PHNwYW4gY2xhc3NOYW1lPVwicGF5bWVudC1kZW1vLWxhYmVsXCI+UHJlZmVycmVkIHBheW1lbnQgbWV0aG9kIDxzbWFsbD4odmlzdWFsIGRlbW8gb25seSk8L3NtYWxsPjwvc3Bhbj48ZGl2IGNsYXNzTmFtZT1cInBheW1lbnQtbWV0aG9kLXJvd1wiPntbeyBsYWJlbDogXCJVUElcIiwgaWNvbjogU21hcnRwaG9uZSB9LCB7IGxhYmVsOiBcIkNhcmRcIiwgaWNvbjogQ3JlZGl0Q2FyZCB9LCB7IGxhYmVsOiBcIkJhbmtcIiwgaWNvbjogTGFuZG1hcmsgfV0ubWFwKCh7IGxhYmVsOiBtZXRob2RMYWJlbCwgaWNvbjogSWNvbiB9KSA9PiA8YnV0dG9uIGtleT17bWV0aG9kTGFiZWx9IHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBzZXRNZXRob2QobWV0aG9kTGFiZWwpfSBjbGFzc05hbWU9e2BwYXltZW50LW1ldGhvZCAke21ldGhvZCA9PT0gbWV0aG9kTGFiZWwgPyBcInBheW1lbnQtbWV0aG9kLWFjdGl2ZVwiIDogXCJcIn1gfT48SWNvbiBzaXplPXsxNn0gLz57bWV0aG9kTGFiZWx9PC9idXR0b24+KX08L2Rpdj48L2Rpdj5cbiAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cInBheW1lbnQtZGVtby1zaW11bGF0aW9uXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9e3NpbXVsYXRlRmFpbHVyZX0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0U2ltdWxhdGVGYWlsdXJlKGV2ZW50LnRhcmdldC5jaGVja2VkKX0gLz48c3Bhbj5TaG93IGFuIHVuc3VjY2Vzc2Z1bCBhdHRlbXB0IGluIHRoaXMgZGVtby48L3NwYW4+PC9sYWJlbD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGFzaWRlIGNsYXNzTmFtZT1cInBheW1lbnQtZGVtby1zdW1tYXJ5XCI+PHNwYW4gY2xhc3NOYW1lPVwic2VjdGlvbi1raWNrZXJcIj5EZW1vIHN1bW1hcnk8L3NwYW4+PGgzPntpdGVtTGFiZWx9PC9oMz48c3Ryb25nPntmb3JtYXR0ZWRBbW91bnR9PC9zdHJvbmc+PHA+e2tpbmQgPT09IFwibWVtYmVyc2hpcFwiID8gXCJBQVNXIG1lbWJlcnNoaXAgZGVtb25zdHJhdGlvbiDigJQgYW5udWFsIG9yIGxpZmV0aW1lIGNvbnRyaWJ1dGlvbiBzaG93biBmb3IgZmxvdyBwcmV2aWV3LlwiIDogXCJBQVNXIGRvbmF0aW9uIGRlbW9uc3RyYXRpb24g4oCUIG5vIGFtb3VudCB3aWxsIGJlIGRlYml0ZWQuXCJ9PC9wPjxkaXY+PHNwYW4+R2F0ZXdheSBzdGF0dXM8L3NwYW4+PGI+e2NoZWNrb3V0R2F0ZXdheS5tb2RlID09PSBcImRlbW9cIiA/IFwiRGVtbyBtb2RlXCIgOiBcIkxpdmUgc2V0dXAgcGVuZGluZ1wifTwvYj48L2Rpdj48ZGl2PjxzcGFuPlBheW1lbnQgbWV0aG9kPC9zcGFuPjxiPnttZXRob2R9PC9iPjwvZGl2PjwvYXNpZGU+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAge2Vycm9yICYmIDxwIGNsYXNzTmFtZT1cInBheW1lbnQtZGVtby1lcnJvclwiIHJvbGU9XCJhbGVydFwiPntlcnJvcn08L3A+fVxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImJ1dHRvbiBidXR0b24tb2NocmUgcGF5bWVudC1kZW1vLXN1Ym1pdFwiIG9uQ2xpY2s9e2NvbnRpbnVlRGVtb30+Q29udGludWUgdG8gZGVtbyBjb25maXJtYXRpb24gPENoZXZyb25SaWdodCBzaXplPXsxNn0gLz48L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+fVxuXG4gICAgICAgIHtzdGVwID09PSBcInByb2Nlc3NpbmdcIiAmJiA8ZGl2IGNsYXNzTmFtZT1cInBheW1lbnQtZGVtby1wcm9jZXNzaW5nXCI+PExvYWRlckNpcmNsZSBzaXplPXszNH0gLz48aDM+RGVtbyBwYXltZW50IHN0ZXAgbG9hZGluZ+KApjwvaDM+PHA+Tm8gYmFuaywgVVBJIG9yIGNhcmQgcmVxdWVzdCBpcyBiZWluZyBzZW50LjwvcD48L2Rpdj59XG5cbiAgICAgICAge3N0ZXAgPT09IFwiZmFpbGVkXCIgJiYgPGRpdiBjbGFzc05hbWU9XCJwYXltZW50LWRlbW8tY29tcGxldGUgcGF5bWVudC1kZW1vLWZhaWxlZFwiPjxzcGFuIGNsYXNzTmFtZT1cInBheW1lbnQtZGVtby1jb21wbGV0ZS1pY29uXCI+PFggc2l6ZT17Mjh9IC8+PC9zcGFuPjxzcGFuIGNsYXNzTmFtZT1cInNlY3Rpb24ta2lja2VyXCI+RGVtbyB1bnN1Y2Nlc3NmdWwgYXR0ZW1wdDwvc3Bhbj48aDM+VGhpcyBpcyB0aGUgcmV0cnkgcGF0aC48L2gzPjxwPntmYWlsdXJlTWVzc2FnZSB8fCBcIk5vIG1vbmV5IGhhcyBiZWVuIGNoYXJnZWQuIFlvdSBjYW4gcmV0dXJuIHRvIHRoZSBkZXRhaWxzIGFuZCBwcmV2aWV3IHRoZSBmbG93IGFnYWluLlwifTwvcD48ZGl2IGNsYXNzTmFtZT1cInBheW1lbnQtZGVtby1yZWNlaXB0XCI+PHNwYW4+R2F0ZXdheSByZXNwb25zZTwvc3Bhbj48c3Ryb25nPkRFTU8tQVRURU1QVC1OT1QtQ09NUExFVEVEPC9zdHJvbmc+PHNtYWxsPntmb3JtYXR0ZWRBbW91bnR9IMK3IHttZXRob2R9PC9zbWFsbD48L2Rpdj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJidXR0b24gYnV0dG9uLXByaW1hcnlcIiBvbkNsaWNrPXsoKSA9PiBzZXRTdGVwKFwiZGV0YWlsc1wiKX0+VHJ5IGRlbW8gYWdhaW4gPENoZXZyb25SaWdodCBzaXplPXsxNn0gLz48L2J1dHRvbj48L2Rpdj59XG5cbiAgICAgICAge3N0ZXAgPT09IFwiY29tcGxldGVcIiAmJiA8ZGl2IGNsYXNzTmFtZT1cInBheW1lbnQtZGVtby1jb21wbGV0ZVwiPjxzcGFuIGNsYXNzTmFtZT1cInBheW1lbnQtZGVtby1jb21wbGV0ZS1pY29uXCI+PENoZWNrQ2lyY2xlMiBzaXplPXszMX0gLz48L3NwYW4+PHNwYW4gY2xhc3NOYW1lPVwic2VjdGlvbi1raWNrZXJcIj5EZW1vIGNvbmZpcm1hdGlvbjwvc3Bhbj48aDM+WW91ciB7aXRlbUxhYmVsLnRvTG93ZXJDYXNlKCl9IGpvdXJuZXkgaXMgbWFwcGVkLjwvaDM+PHA+e25hbWUgfHwgXCJTdXBwb3J0ZXJcIn0sIHRoaXMgaXMgYSBwcmV2aWV3IHJlY2VpcHQgb25seS4gTm8gbW9uZXkgaGFzIGJlZW4gY2hhcmdlZCwgYW5kIEFBU1cgaGFzIG5vdCByZWNlaXZlZCBhIHBheW1lbnQuPC9wPjxkaXYgY2xhc3NOYW1lPVwicGF5bWVudC1kZW1vLXJlY2VpcHRcIj48c3Bhbj5QcmV2aWV3IHJlZmVyZW5jZTwvc3Bhbj48c3Ryb25nPkFBU1ctREVNTy17a2luZCA9PT0gXCJtZW1iZXJzaGlwXCIgPyBcIk1FTVwiIDogXCJET05cIn0te2Ftb3VudCB8fCBpbml0aWFsQW1vdW50fTwvc3Ryb25nPjxzbWFsbD57Zm9ybWF0dGVkQW1vdW50fSDCtyB7bWV0aG9kfTwvc21hbGw+PC9kaXY+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYnV0dG9uIGJ1dHRvbi1wcmltYXJ5XCIgb25DbGljaz17KCkgPT4gc2V0T3BlbihmYWxzZSl9PkJhY2sgdG8gQUFTVyA8Q2hldnJvblJpZ2h0IHNpemU9ezE2fSAvPjwvYnV0dG9uPjwvZGl2Pn1cbiAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj59XG4gIDwvPjtcbn1cbiJdLCJmaWxlIjoiQzovVXNlcnMvb20vRG93bmxvYWRzL0FBU1ctTkVXLVZFUlNJT04tbWFpbi9BQVNXLU5FVy1WRVJTSU9OLW1haW4vY2xpZW50L3NyYy9jb21wb25lbnRzL1BheW1lbnREZW1vQ2hlY2tvdXQudHN4In0=
import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";
import "./readability-fixes.css";

// Sensible query defaults: session-scoped member/admin data changes rarely,
// so keep it fresh for 30s instead of refetching on every window focus.
// One retry (not the default 3) keeps failures visible quickly without
// hammering the server on hard errors.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const MEMBER_UNAUTHED_MSG = "Member login is required.";

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  // Member-portal procedures fail with their own message; those sessions
  // must return to the Member Login page, not the Manus OAuth portal.
  if (error.message === MEMBER_UNAUTHED_MSG) {
    const onMemberPortal = window.location.pathname.startsWith("/member");
    if (onMemberPortal) window.location.assign("/member/login");
    return;
  }

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Foundation Admin and MIS screens authenticate through the owner login
  // page (email + password); the platform OAuth flow is not part of this
  // deployment, so a stale or missing admin session lands on that page.
  const path = window.location.pathname;
  if (path.startsWith("/foundation-admin") || path.startsWith("/mis")) {
    window.location.assign("/foundation-admin/login");
    return;
  }

  startLogin();
};

const isTransientPreviewTransportError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return error.message === "Failed to fetch" || error.message.includes("received HTML instead of JSON") || error.message.includes("Unexpected token '<'");
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    if (isTransientPreviewTransportError(error)) return;
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    if (isTransientPreviewTransportError(error)) return;
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        }).then((response) => {
          const contentType = response.headers.get("content-type") ?? "";
          if (contentType.includes("text/html")) {
            const requestPath = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
            throw new Error(`tRPC request received HTML instead of JSON: ${requestPath}`);
          }
          return response;
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

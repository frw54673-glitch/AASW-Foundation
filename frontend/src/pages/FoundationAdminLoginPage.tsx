import { FormEvent, useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { trpc } from "@/lib/trpc";
import "./foundation-admin.css";

// Only the Foundation owner account can sign in here; the server rejects
// every other email before it ever compares a password.
const OWNER_EMAIL = "aaswfoundation06@gmail.com";

export function FoundationAdminLoginPage() {
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [password, setPassword] = useState("");
  const login = trpc.auth.ownerLogin.useMutation({
    onSuccess: () => { window.location.assign("/foundation-admin"); },
  });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!login.isPending) login.mutate({ email: email.trim(), password }); };
  return (
    <main className="foundation-admin-access-shell">
      <section>
        <div className="foundation-admin-access-mark"><LockKeyhole size={23} /></div>
        <p>Foundation management</p>
        <h1>Sign in to manage AASW.</h1>
        <span>Enter the authorised Foundation account password to review records, manage follow-ups and open the Project MIS workspaces.</span>
        <form onSubmit={submit} className="foundation-admin-login-form">
          <label>
            Email address
            <input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="username" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={event => setPassword(event.target.value)} required autoComplete="current-password" autoFocus />
          </label>
          <button type="submit" disabled={login.isPending}>
            {login.isPending ? <Loader2 size={15} className="animate-spin" /> : <LockKeyhole size={15} />}
            {login.isPending ? "Signing in…" : "Sign in to Foundation Admin"}
          </button>
        </form>
        {login.isError && <small role="alert" data-login-error>{login.error.message}</small>}
        <small>Access is limited to {OWNER_EMAIL}. Sessions expire after 12 hours.</small>
      </section>
    </main>
  );
}

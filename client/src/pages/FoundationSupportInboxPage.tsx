import { useState } from "react";
import { CheckCircle2, ClipboardList, LifeBuoy, LockKeyhole, RefreshCw, Send, ShieldAlert, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { notifyError, notifySuccess } from "@/lib/notifications";
import "./foundation-admin.css";

const menu = [
  { icon: ClipboardList, label: "Foundation workspace", path: "/foundation-admin" },
  { icon: Users, label: "Member accounts", path: "/foundation-admin/members" },
  { icon: CheckCircle2, label: "Programme requests", path: "/foundation-admin/service-requests" },
  { icon: LifeBuoy, label: "Support inbox", path: "/foundation-admin/support-inbox" },
];
const statuses = ["submitted", "reviewing", "responded", "closed"] as const;
const words = (value: string) => value.replaceAll("_", " ");
const dateTime = (value: Date | string) => new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export function FoundationSupportInboxPage() {
  const { user, loading } = useAuth();
  if (loading) return <main className="min-h-screen bg-[#fffdf7]" />;
  if (!user) return <main className="grid min-h-screen place-items-center bg-[#fffdf7] p-6 text-center text-[#291d1d]"><section className="max-w-md border border-[#291d1d]/15 bg-white p-8"><LockKeyhole className="mx-auto text-[#2f6b52]" size={28} /><p className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-[#2f6b52]">Foundation support inbox</p><h1 className="mt-2 font-serif text-4xl">Member support, with care.</h1><p className="mt-4 text-sm leading-6 text-[#5b4c47]">Sign in with an authorised Foundation account to review and reply to member support messages.</p><button type="button" onClick={() => startLogin()} className="mt-6 bg-[#2f6b52] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white">Sign in to continue</button></section></main>;
  if (user.role !== "admin") return <DashboardLayout menuItems={menu} title="AASW Foundation"><section className="mx-auto mt-14 max-w-2xl border border-red-200 bg-red-50 p-8 text-red-950"><ShieldAlert size={28} /><p className="mt-4 text-xs font-bold uppercase tracking-[.14em]">Restricted workspace</p><h1 className="mt-2 font-serif text-4xl">Foundation management is admin-only.</h1></section></DashboardLayout>;
  return <DashboardLayout menuItems={menu} title="AASW Foundation"><SupportInbox /></DashboardLayout>;
}

function SupportInbox() {
  const utils = trpc.useUtils();
  const messages = trpc.management.supportMessages.list.useQuery({ limit: 100 });
  const respond = trpc.management.supportMessages.respond.useMutation({
    onSuccess: (_, input) => { notifySuccess("Support conversation updated", `Status changed to ${words(input.status)}.`); void utils.management.supportMessages.list.invalidate(); },
    onError: error => notifyError("Support update could not be saved", error.message),
  });
  if (messages.isLoading) return <main className="foundation-admin-workspace mx-auto max-w-6xl space-y-6 bg-[#fffdf7] text-[#291d1d]" aria-busy="true"><div className="foundation-admin-skeleton-hero animate-pulse" aria-hidden /><div className="grid gap-4 xl:grid-cols-2">{Array.from({ length: 2 }, (_, i) => <div key={i} className="foundation-admin-skeleton-record animate-pulse" style={{ minHeight: 180 }} aria-hidden />)}</div><p className="sr-only">Loading private member support messages.</p></main>;
  if (messages.error) return <main className="mx-auto max-w-6xl p-6 text-[#291d1d]"><p className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">{messages.error.message}</p></main>;
  return <main className="foundation-admin-workspace mx-auto max-w-6xl space-y-6 bg-[#fffdf7] text-[#291d1d]"><header className="foundation-admin-hero flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#2f6b52]">Private member support</p><h1 className="mt-2 font-serif text-5xl tracking-tight">Support inbox.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#5b4c47]">Read member-submitted questions, write a Foundation reply and manage follow-up status. This inbox does not display member documents, PAN or address data.</p></div><button type="button" onClick={() => messages.refetch()} className="inline-flex items-center gap-2 self-start border border-[#2f6b52] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#2f6b52] hover:bg-[#2f6b52] hover:text-white"><RefreshCw size={14} />Refresh</button></header><section className="grid gap-4 xl:grid-cols-2">{messages.data?.length ? messages.data.map(message => <SupportMessageCard key={message.messageRef} message={message} pending={respond.isPending} onUpdate={(input) => respond.mutate(input)} />) : <p className="border border-dashed border-[#291d1d]/20 p-5 text-sm text-[#796966]">No private member support messages have been submitted yet.</p>}</section></main>;
}

function SupportMessageCard({ message, pending, onUpdate }: { message: { messageRef: string; fullName: string; membershipNo: string; email: string; message: string; status: "submitted" | "reviewing" | "responded" | "closed"; adminReply: string | null; createdAt: Date | string }; pending: boolean; onUpdate: (input: { messageRef: string; status: (typeof statuses)[number]; adminReply?: string }) => void }) {
  const [reply, setReply] = useState(message.adminReply ?? "");
  const [status, setStatus] = useState<(typeof statuses)[number]>(message.status);
  const submit = (event: React.FormEvent) => { event.preventDefault(); onUpdate({ messageRef: message.messageRef, status, adminReply: reply.trim() || undefined }); };
  return <article className="border border-[#291d1d]/15 bg-[#fffaf0] p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#2f6b52]">Member support message</p><h2 className="mt-2 font-serif text-3xl">{message.fullName}</h2><p className="mt-1 text-xs text-[#796966]">{message.membershipNo} · {message.email}</p></div><select value={status} disabled={pending} onChange={event => setStatus(event.target.value as (typeof statuses)[number])} className="border border-[#291d1d]/20 bg-white px-2 py-2 text-xs capitalize disabled:opacity-60">{statuses.map(item => <option key={item} value={item}>{words(item)}</option>)}</select></div><div className="mt-4 rounded-lg bg-white p-4 text-sm leading-6 text-[#3c3531]"><strong className="block text-[10px] uppercase tracking-wider text-[#6e655d]">Member message</strong><p className="mt-2 whitespace-pre-wrap">{message.message}</p></div><form onSubmit={submit} className="mt-4 grid gap-2"><label className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-[#625951]">Foundation reply<textarea value={reply} onChange={event => setReply(event.target.value)} maxLength={3000} rows={4} placeholder="Write a private response for this member." className="border border-[#291d1d]/20 bg-white p-3 text-sm font-normal normal-case tracking-normal" /></label><button disabled={pending} className="inline-flex w-fit items-center gap-2 bg-[#2f6b52] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60"><Send size={14} />{pending ? "Saving" : "Save reply & status"}</button></form><p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-[#796966]">{message.messageRef} · submitted {dateTime(message.createdAt)}</p></article>;
}

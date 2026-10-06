import { useState } from "react";
import { CheckCircle2, ClipboardList, FileImage, FileText, LifeBuoy, Loader2, LockKeyhole, RefreshCw, ShieldAlert, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { notifyError } from "@/lib/notifications";
import "./foundation-admin.css";

const menu = [
  { icon: ClipboardList, label: "Foundation workspace", path: "/foundation-admin" },
  { icon: Users, label: "Member accounts", path: "/foundation-admin/members" },
  { icon: CheckCircle2, label: "Programme requests", path: "/foundation-admin/service-requests" },
  { icon: LifeBuoy, label: "Support inbox", path: "/foundation-admin/support-inbox" },
  { icon: FileImage, label: "Member documents", path: "/foundation-admin/documents" },
];
const dateTime = (value: Date | string) => new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
const sizeLabel = (bytes: number | null | undefined) => (bytes ? `${(bytes / 1024).toFixed(0)} KB` : "—");

export function FoundationDocumentsPage() {
  const { user, loading } = useAuth();
  if (loading) return <main className="min-h-screen bg-[#fffdf7]" />;
  if (!user) return <main className="grid min-h-screen place-items-center bg-[#fffdf7] p-6 text-center text-[#291d1d]"><section className="max-w-md border border-[#291d1d]/15 bg-white p-8"><LockKeyhole className="mx-auto text-[#2f6b52]" size={28} /><p className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-[#2f6b52]">Member documents</p><h1 className="mt-2 font-serif text-4xl">Documents, kept safe.</h1><p className="mt-4 text-sm leading-6 text-[#5b4c47]">Sign in with an authorised Foundation account to review member-uploaded identity proofs and completion documents.</p><button type="button" onClick={() => { window.location.assign("/foundation-admin/login"); }} className="mt-6 bg-[#2f6b52] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white">Sign in to continue</button></section></main>;
  if (user.role !== "admin") return <DashboardLayout menuItems={menu} title="AASW Foundation"><section className="mx-auto mt-14 max-w-2xl border border-red-200 bg-red-50 p-8 text-red-950"><ShieldAlert size={28} /><p className="mt-4 text-xs font-bold uppercase tracking-[.14em]">Restricted workspace</p><h1 className="mt-2 font-serif text-4xl">Foundation management is admin-only.</h1></section></DashboardLayout>;
  return <DashboardLayout menuItems={menu} title="AASW Foundation"><DocumentsWorkspace /></DashboardLayout>;
}

type DocumentRecord = { kind: string; ref: string; memberName: string; membershipNo: string | null; email: string; fileName: string; mimeType: string; storageKey: string; uploadedAt: Date | string };

function DocumentsWorkspace() {
  const documents = trpc.documents.list.useQuery();
  const [viewingRef, setViewingRef] = useState<string | null>(null);
  const view = trpc.documents.view.useMutation({
    onSuccess: async result => {
      try {
        // Local development inlines stored files as data: URLs — browsers block
        // top-level data navigation, so convert to a blob URL first. Production
        // signed URLs (https) open directly in a new tab.
        if (result.url.startsWith("data:")) {
          const blob = await (await fetch(result.url)).blob();
          window.location.assign(URL.createObjectURL(blob));
        } else {
          window.open(result.url, "_blank", "noopener");
        }
      } catch {
        notifyError("The document could not be opened. Please try again.");
      }
      setViewingRef(null);
    },
    onError: issue => { notifyError(issue.message); setViewingRef(null); },
  });
  const openDocument = (record: DocumentRecord) => { setViewingRef(record.ref); view.mutate({ kind: record.kind as "membership_proof" | "completion_proof", ref: record.ref }); };
  const refresh = () => documents.refetch();

  const renderRow = (record: DocumentRecord, badge: string, badgeClass: string) => (
    <article key={`${record.kind}-${record.ref}`} className="border border-[#291d1d]/15 bg-[#fffaf0] p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#2f6b52]"><span className={`mr-2 inline-block border px-2 py-0.5 ${badgeClass}`}>{badge}</span>{record.ref}</p>
          <h3 className="mt-1 font-serif text-2xl">{record.memberName}{record.membershipNo ? <span className="ml-2 text-xs font-sans font-bold text-[#796966]">{record.membershipNo}</span> : null}</h3>
          <p className="mt-1 text-xs text-[#796966]">{record.fileName} · {record.email} · uploaded {dateTime(record.uploadedAt)}</p>
        </div>
        <button type="button" disabled={view.isPending && viewingRef === record.ref} onClick={() => openDocument(record)} className="inline-flex shrink-0 items-center gap-2 border border-[#2f6b52] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#2f6b52] transition hover:bg-[#2f6b52] hover:text-white disabled:opacity-60">
          {view.isPending && viewingRef === record.ref ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          {view.isPending && viewingRef === record.ref ? "Opening…" : "View document"}
        </button>
      </div>
    </article>
  );

  return (
    <main className="foundation-admin-workspace mx-auto max-w-7xl space-y-8 bg-[#fffdf7] p-2 text-[#291d1d]">
      <header className="foundation-admin-hero">
        <div>
          <p>Member documents</p>
          <h1>Records, in one place.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6">Every document members upload with their applications and completion reports — identity proofs and work evidence — stored privately and opened only from this workspace.</p>
        </div>
        <button type="button" onClick={refresh} className="inline-flex items-center gap-2 self-start border border-[#eac06e] bg-[#eac06e] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#183d31]">
          <RefreshCw size={14} />Refresh
        </button>
      </header>
      {documents.isLoading && <p className="border border-[#291d1d]/15 bg-white p-4 text-sm text-[#796966]" aria-busy="true">Loading member documents…</p>}
      {documents.isError && <p className="border border-red-300 bg-red-100 p-4 text-sm text-red-900">The document list could not be loaded. Please refresh and try again.</p>}
      {documents.data && <>
        <section className="admin-record-section" data-reveal>
          <div className="mb-4 flex gap-3">
            <FileImage className="mt-1 text-[#2f6b52]" size={22} />
            <div>
              <h2 className="font-serif text-4xl">Membership ID proofs</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5b4c47]">Identity documents uploaded with membership applications. {(documents.data.membershipDocs ?? []).length} document{(documents.data.membershipDocs ?? []).length === 1 ? "" : "s"} on record.</p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {(documents.data.membershipDocs ?? []).length ? documents.data.membershipDocs.map(record => renderRow(record, "ID PROOF", "border-[#2f6b52]/40 bg-[#edf6ee] text-[#2f6b52]")) : <p className="border border-dashed border-[#291d1d]/20 p-5 text-sm text-[#796966]">No membership ID proofs have been uploaded yet.</p>}
          </div>
        </section>
        <section className="admin-record-section" data-reveal>
          <div className="mb-4 flex gap-3">
            <FileImage className="mt-1 text-[#9c4a3c]" size={22} />
            <div>
              <h2 className="font-serif text-4xl">Completion report proofs</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5b4c47]">Work evidence members attach before a programme payout is verified. {(documents.data.completionDocs ?? []).length} document{(documents.data.completionDocs ?? []).length === 1 ? "" : "s"} on record.</p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {(documents.data.completionDocs ?? []).length ? documents.data.completionDocs.map(record => renderRow(record, "COMPLETION PROOF", "border-[#9c4a3c]/40 bg-[#fdf6f3] text-[#9c4a3c]")) : <p className="border border-dashed border-[#291d1d]/20 p-5 text-sm text-[#796966]">No completion report proofs have been uploaded yet.</p>}
          </div>
        </section>
      </>}
    </main>
  );
}

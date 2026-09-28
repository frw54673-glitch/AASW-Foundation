import { AlertTriangle, CheckCircle2, Info, XCircle, X } from "lucide-react";
import { toast } from "sonner";

export type NotificationTone = "success" | "error" | "warning" | "info";
type NotificationInput = { title: string; description?: string; duration?: number };
export const notificationToneDetails = {
  success: { icon: CheckCircle2, accent: "#2f6b52", surface: "#edf6ee", label: "Success" },
  error: { icon: XCircle, accent: "#ae2d2d", surface: "#fff0ee", label: "Action needs attention" },
  warning: { icon: AlertTriangle, accent: "#9a6500", surface: "#fff6dc", label: "Please review" },
  info: { icon: Info, accent: "#225ea8", surface: "#eef6ff", label: "AASW update" },
} as const;

export function notify(tone: NotificationTone, { title, description, duration = 6000 }: NotificationInput) {
  const config = notificationToneDetails[tone];
  const Icon = config.icon;
  return toast.custom((id) => <div role={tone === "error" ? "alert" : "status"} aria-live={tone === "error" ? "assertive" : "polite"} className="aasw-notification" data-tone={tone} style={{ background: config.surface, borderLeft: `5px solid ${config.accent}` }}><div className="aasw-notification-progress" style={{ background: config.accent, animationDuration: `${duration}ms` }} aria-hidden="true" /><Icon size={21} style={{ color: config.accent }} className="mt-0.5 shrink-0" /><div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold uppercase tracking-[.14em]" style={{ color: config.accent }}>{config.label}</p><h3 className="mt-1 font-serif text-xl leading-tight text-[#291d1d]">{title}</h3>{description && <p className="mt-1 text-xs leading-5 text-[#5b4c47]">{description}</p>}</div><button type="button" onClick={() => toast.dismiss(id)} aria-label="Dismiss notification" className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center text-[#5b4c47] transition hover:bg-white/60 hover:text-[#291d1d]"><X size={16} /></button></div>, { duration, unstyled: true });
}
export const notifySuccess = (title: string, description?: string) => notify("success", { title, description });
export const notifyError = (title: string, description?: string) => notify("error", { title, description, duration: 8000 });
export const notifyWarning = (title: string, description?: string) => notify("warning", { title, description, duration: 7000 });
export const notifyInfo = (title: string, description?: string) => notify("info", { title, description });

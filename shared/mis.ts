export const UN_SDG_GOALS = [
  "SDG 1: No Poverty",
  "SDG 2: Zero Hunger",
  "SDG 3: Good Health and Well-being",
  "SDG 4: Quality Education",
  "SDG 5: Gender Equality",
  "SDG 6: Clean Water and Sanitation",
  "SDG 7: Affordable and Clean Energy",
  "SDG 8: Decent Work and Economic Growth",
  "SDG 9: Industry Innovation and Infrastructure",
  "SDG 10: Reduced Inequalities",
  "SDG 11: Sustainable Cities and Communities",
  "SDG 12: Responsible Consumption",
  "SDG 13: Climate Action",
  "SDG 14: Life Below Water",
  "SDG 15: Life on Land",
  "SDG 16: Peace Justice and Strong Institutions",
  "SDG 17: Partnerships for the Goals",
] as const;

export type SdgGoal = (typeof UN_SDG_GOALS)[number];

export const MIS_ROLES = ["admin", "project_manager", "field_staff", "finance", "monitoring", "management"] as const;
export type MisRole = (typeof MIS_ROLES)[number];
export const MIS_ROLE_LABELS: Record<MisRole, string> = { admin: "Admin", project_manager: "Project Manager", field_staff: "Field Staff", finance: "Finance", monitoring: "Monitoring Officer", management: "Management" };

export const MIS_ROLE_PERMISSIONS: Record<MisRole, readonly string[]> = {
  admin: ["*"],
  project_manager: ["projects.read_assigned", "activities.manage", "beneficiaries.manage", "field_events.manage", "outputs.manage", "outcomes.manage", "risks.manage", "documents.manage", "reporting.manage"],
  field_staff: ["beneficiaries.manage", "field_events.manage", "attendance.manage", "finance.read", "reports.read", "monitoring.read"],
  finance: ["finance.manage", "projects.read", "documents.read"],
  monitoring: ["monitoring.manage", "targets.manage", "outcomes.manage", "projects.read", "documents.read"],
  management: ["dashboard.read", "projects.read", "reports.read", "exports.read"],
};

export function formatIndianNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits }).format(value);
}

export function formatIndianRupees(amount: number): string {
  return `₹${formatIndianNumber(amount)}`;
}

export function formatIndianDate(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

function yearOf(date: Date) { return date.getUTCFullYear(); }
function sequence(value: number, length: number) { if (!Number.isInteger(value) || value < 1) throw new Error("Sequence must be a positive whole number."); return String(value).padStart(length, "0"); }
export function createBeneficiaryId(value: number, now = new Date()) { return `BEN-${yearOf(now)}-${sequence(value, 4)}`; }
export function createFieldEventId(value: number, now = new Date()) { return `EVT-${yearOf(now)}-${sequence(value, 4)}`; }
export function suggestProjectCode(value: number, now = new Date()) { return `PRJ-${yearOf(now)}-${sequence(value, 3)}`; }

export type MisAlertTone = "red" | "amber" | "green" | "blue";
export type MisAlert = { tone: MisAlertTone; label: string; className: string };
const ALERT_CLASSES: Record<MisAlertTone, string> = { red: "bg-red-100 text-red-900 border-red-300", amber: "bg-amber-100 text-amber-950 border-amber-300", green: "bg-emerald-100 text-emerald-950 border-emerald-300", blue: "bg-blue-100 text-blue-950 border-blue-300" };
export function misAlert(tone: MisAlertTone, label: string): MisAlert { return { tone, label, className: ALERT_CLASSES[tone] }; }
export function reportingAlert(dueDate: Date | string, status?: string, now = new Date()): MisAlert {
  const normalized = status?.toLowerCase();
  if (normalized === "draft" || normalized === "pending") return misAlert("blue", "Draft / Pending");
  if (normalized === "overdue") return misAlert("red", "Overdue");
  if (normalized === "approved" || normalized === "submitted" || normalized === "on track" || normalized === "completed") return misAlert("green", "On track");
  const days = Math.ceil((new Date(dueDate).getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return misAlert("red", "Overdue");
  if (days <= 7) return misAlert("amber", "Due within 7 days");
  return misAlert("green", "On track");
}

export function riskAlert(dueDate?: Date | string | null, status?: string, now = new Date()): MisAlert {
  if (status?.toLowerCase() === "closed") return misAlert("green", "On track");
  if (!dueDate) return misAlert("blue", "Draft / Pending");
  return reportingAlert(dueDate, undefined, now);
}

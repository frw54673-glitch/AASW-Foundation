export type DashboardProjectStatus = "planned" | "active" | "on_hold" | "completed" | "closed" | "cancelled";
export type DashboardProjectFilter = "all" | DashboardProjectStatus;
export type DashboardProjectFilterable = { projectStatus: DashboardProjectStatus };

export function filterDashboardProjects<T extends DashboardProjectFilterable>(projects: T[], status: DashboardProjectFilter) {
  return status === "all" ? projects : projects.filter((project) => project.projectStatus === status);
}

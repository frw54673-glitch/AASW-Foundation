import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(import.meta.dirname, "../client/src/App.tsx"), "utf8");

describe("route-level code splitting", () => {
  it("keeps the homepage eager while lazy-loading non-home route modules behind a Suspense fallback", () => {
    expect(appSource).toContain('import { lazy, Suspense, useEffect, useRef } from "react";');
    expect(appSource).toContain('import Home from "./pages/Home";');
    expect(appSource).toContain('const MemberSidebarDashboard = lazy(() => import("./pages/MemberSidebarDashboard")');
    expect(appSource).toContain('const MisDashboardPage = lazy(() => import("./pages/MisDashboardPage")');
    expect(appSource).toContain('const ContactUsPage = lazy(() => import("./pages/MediaContactPages")');
    expect(appSource).toContain('<Suspense fallback={<RouteLoading />}>');
  });
});

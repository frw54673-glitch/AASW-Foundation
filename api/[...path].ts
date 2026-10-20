import { createApiApp } from "../backend/_core/app";

// Keep API traffic on an Express function even when Vercel also serves the
// compiled SPA from its static asset CDN. This prevents /api/* requests from
// falling through to frontend/index.html.
export default createApiApp();

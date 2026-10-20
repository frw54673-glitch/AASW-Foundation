import { createApiApp } from "../backend/_core/app";

// Vercel routes /api/* requests through this Express function. The same API
// application is used by the traditional Node server in backend/_core/index.
const app = createApiApp();

export default app;

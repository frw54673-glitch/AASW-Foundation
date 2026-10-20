import { createApiApp } from "../backend/_core/app";

// Keep the frontend on Vercel's Vite static deployment while routing every
// /api/* request through the same Express API used by the local server.
export default createApiApp();

import { createApiApp } from "../backend/_core/app";

// Shared Express app for Vercel's file-based API handlers.
export const app = createApiApp();

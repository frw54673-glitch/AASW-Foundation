import { createApiApp } from "../backend/_core/app";

// Vercel maps this Node function to /api/trpc, the shared endpoint used by
// Foundation Admin, MIS, membership, and public-site tRPC clients.
export default createApiApp();

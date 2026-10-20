import express from "express";
import path from "node:path";
import { createApiApp } from "./backend/_core/app";

const app = createApiApp();
const publicIndex = path.resolve(process.cwd(), "public", "index.html");

// Vercel serves files from the configured public output directly. Extensionless
// paths are client-side Wouter routes, so return the SPA shell for deep links.
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "API endpoint not found" });
    return;
  }
  if (path.extname(req.path)) {
    next();
    return;
  }
  res.sendFile(publicIndex, error => {
    if (error) next(error);
  });
});

export default app;

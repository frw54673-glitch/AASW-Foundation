import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer, type InlineConfig } from "vite";
import viteConfig from "../../vite.config";

// vite.config may export either a plain config object or a defineConfig
// callback (needed for mode-dependent plugins). Resolving the callback here
// keeps every setting intact when the config is spread below.
function resolveViteConfig(): InlineConfig {
  const mode = process.env.NODE_ENV === "production" ? "production" : "development";
  return typeof viteConfig === "function" ? (viteConfig as (args: { mode: string }) => InlineConfig)({ mode }) : (viteConfig as InlineConfig);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...resolveViteConfig(),
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "frontend",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Vite emits content-hashed filenames under /assets (e.g. index-CiJ5g5Dk.js),
  // so those files can be cached immutably for a year. Non-hashed files such as
  // index.html and manus-storage assets keep the default revalidation behaviour.
  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), {
      fallthrough: false,
      maxAge: "365d",
      immutable: true,
    })
  );

  // Browsers request /favicon.ico directly (address bar, bookmarks). There is
  // no committed .ico, so redirect to the branded PNG instead of falling into
  // the SPA catch-all below, which would return a ~370KB HTML document.
  app.get("/favicon.ico", (_req, res) => {
    res.redirect(302, "/manus-storage/aasw-foundation-official-logo_41a4007d.png");
  });
  app.use(express.static(distPath));

  // SPA catch-all for client-side routes — but only for browser-navigation
  // requests. A missing file with an extension (broken hashed asset, typo'd
  // .js/.css path) used to return index.html with status 200, which masks
  // deployment mistakes and makes browsers parse HTML as JavaScript. Answer
  // those with a plain 404 instead; HTML is served only for extensionless
  // paths where the client router takes over.
  app.use("*", (req, res) => {
    const pathname = (req as { originalUrl?: string }).originalUrl?.split("?")[0] ?? "";
    if (path.extname(pathname)) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// Dev-only helper: summarizes pnpm audit JSON into per-package upgrade needs.
const fs = require("fs");
const path = require("path");
const file = path.join(process.env.TEMP || ".", "audit.json");
const j = JSON.parse(fs.readFileSync(file, "utf8"));
const advs = j.advisories || {};
const seen = new Set();
Object.values(advs).forEach(a => {
  const key = a.module_name + "@" + a.vulnerable_versions;
  if (seen.has(key)) return;
  seen.add(key);
  console.log("== " + a.severity.toUpperCase() + " " + a.module_name + " (need >= " + a.patched_versions + ")");
  (a.findings || []).forEach(f => {
    console.log("   via: " + f.paths.slice(0, 2).join(" | "));
  });
});

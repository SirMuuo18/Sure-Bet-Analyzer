import { mkdir, copyFile, writeFile, readdir, rename, cp } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distVercel = join(root, "artifacts/api-server/dist/vercel");
const distWeb = join(root, "artifacts/web/dist");
const outputDir = join(root, ".vercel/output");
const funcDir = join(outputDir, "functions/api/index.func");
const staticDir = join(outputDir, "static");

// --- API serverless function ---
await mkdir(funcDir, { recursive: true });

const files = await readdir(distVercel);
for (const file of files) {
  await copyFile(join(distVercel, file), join(funcDir, file));
}

await rename(join(funcDir, "vercel-handler.mjs"), join(funcDir, "index.mjs"));

await writeFile(
  join(funcDir, ".vc-config.json"),
  JSON.stringify({
    runtime: "nodejs20.x",
    handler: "index.mjs",
    launcherType: "Nodejs",
    shouldAddHelpers: true,
    shouldAddSourcemapSupport: false,
  }, null, 2),
);

// --- Static frontend ---
await cp(distWeb, staticDir, { recursive: true });

// --- Routes: /api/* → function, everything else → SPA ---
await writeFile(
  join(outputDir, "config.json"),
  JSON.stringify({
    version: 3,
    routes: [
      { src: "/api/(.*)", dest: "/api/index" },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/index.html" },
    ],
  }, null, 2),
);

console.log("Vercel output prepared at .vercel/output/");

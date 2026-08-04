import { mkdir, copyFile, writeFile, readdir, rename } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distVercel = join(root, "artifacts/api-server/dist/vercel");
const outputDir = join(root, ".vercel/output");
const funcDir = join(outputDir, "functions/api/index.func");

await mkdir(funcDir, { recursive: true });

// Copy all pino workers + handler from dist/vercel/
const files = await readdir(distVercel);
for (const file of files) {
  await copyFile(join(distVercel, file), join(funcDir, file));
}

// Vercel function entry must be named index.mjs
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

await writeFile(
  join(outputDir, "config.json"),
  JSON.stringify({
    version: 3,
    routes: [{ src: "/(.*)", dest: "/api/index" }],
  }, null, 2),
);

console.log("Vercel output prepared at .vercel/output/");

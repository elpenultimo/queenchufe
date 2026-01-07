import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, "dist");
const exclude = new Set([
  ".git",
  "dist",
  "node_modules",
  "scripts",
  "package-lock.json",
  "package.json",
  "README.md",
  "vercel.json"
]);

await rm(outputDir, { force: true, recursive: true });
await mkdir(outputDir, { recursive: true });

const entries = await readdir(projectRoot, { withFileTypes: true });

for (const entry of entries) {
  if (exclude.has(entry.name)) {
    continue;
  }

  const sourcePath = path.join(projectRoot, entry.name);
  const destinationPath = path.join(outputDir, entry.name);

  if (entry.isDirectory()) {
    await cp(sourcePath, destinationPath, { recursive: true });
    continue;
  }

  if (entry.isFile()) {
    await cp(sourcePath, destinationPath);
    continue;
  }

  const entryStat = await stat(sourcePath);
  if (entryStat.isFile()) {
    await cp(sourcePath, destinationPath);
  }
}

console.log("Static build prepared in dist/");

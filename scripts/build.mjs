import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, "dist");
const publicPlugsDir = path.join(projectRoot, "public", "plugs");
const distPlugsDir = path.join(outputDir, "plugs");
const exclude = new Set([
  ".git",
  "dist",
  "node_modules",
  "scripts",
  "package-lock.json",
  "package.json",
  "README.md",
  "robots.txt",
  "sitemap.xml",
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

try {
  await cp(publicPlugsDir, distPlugsDir, { recursive: true });
} catch {
  // Ignore if public/plugs does not exist.
}

const PRIORITY_ORIGINS = [
  "es",
  "mx",
  "ar",
  "cl",
  "co",
  "pe",
  "us"
];

const PRIORITY_DESTINATIONS = [
  "us",
  "es",
  "fr",
  "it",
  "de",
  "gb",
  "jp",
  "cn",
  "th",
  "br",
  "ar"
];

const generateSitemap = async () => {
  const baseUrl = "https://queenchufe.com";
  const countriesPath = path.join(projectRoot, "data", "countries.json");
  const countriesRaw = await readFile(countriesPath, "utf8");
  const countries = JSON.parse(countriesRaw);
  const availableCodes = new Set(Object.keys(countries));

  const origins = PRIORITY_ORIGINS.map((code) => code.toUpperCase()).filter((code) =>
    availableCodes.has(code)
  );
  const destinations = PRIORITY_DESTINATIONS.map((code) => code.toUpperCase()).filter((code) =>
    availableCodes.has(code)
  );

  const urls = [
    {
      loc: `${baseUrl}/`,
      changefreq: "weekly",
      priority: "1.0"
    }
  ];

  for (const origin of origins) {
    for (const destination of destinations) {
      if (origin === destination) {
        continue;
      }

      urls.push({
        loc: `${baseUrl}/${origin.toLowerCase()}/${destination.toLowerCase()}`,
        changefreq: "weekly",
        priority: "0.7"
      });
    }
  }

  const urlEntries = urls
    .map(
      ({ loc, changefreq, priority }) =>
        [
          "  <url>",
          `    <loc>${loc}</loc>`,
          `    <changefreq>${changefreq}</changefreq>`,
          `    <priority>${priority}</priority>`,
          "  </url>"
        ].join("\n")
    )
    .join("\n");

  const sitemapXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlEntries,
    "</urlset>",
    ""
  ].join("\n");

  const robotsTxt = ["User-agent: *", "Allow: /", "", `Sitemap: ${baseUrl}/sitemap.xml`, ""].join(
    "\n"
  );

  await writeFile(path.join(outputDir, "sitemap.xml"), sitemapXml, "utf8");
  await writeFile(path.join(outputDir, "robots.txt"), robotsTxt, "utf8");
};

await generateSitemap();

console.log("Static build prepared in dist/");

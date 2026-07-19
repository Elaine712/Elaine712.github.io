import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputRoot = join(projectRoot, "docs");
const clientRoot = join(projectRoot, "dist", "client");
const workerPath = join(projectRoot, "dist", "server", "index.js");

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(clientRoot, outputRoot, { recursive: true });

const workerUrl = pathToFileURL(workerPath);
workerUrl.searchParams.set("static-export", Date.now().toString());
const { default: worker } = await import(workerUrl.href);
const response = await worker.fetch(
  new Request("https://birthday.local/", { headers: { accept: "text/html" } }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) throw new Error(`Static render failed: ${response.status}`);

let html = await response.text();
html = html
  .replaceAll('href="/assets/', 'href="./assets/')
  .replaceAll('src="/assets/', 'src="./assets/')
  .replaceAll('import("/assets/', 'import("./assets/')
  .replaceAll('\\"/assets/', '\\"./assets/')
  .replaceAll('href="/favicon.svg"', 'href="./favicon.svg"');

await writeFile(join(outputRoot, "index.html"), html, "utf8");

const hosting = JSON.parse(await readFile(join(projectRoot, ".openai", "hosting.json"), "utf8"));
await writeFile(join(outputRoot, ".nojekyll"), "", "utf8");
await writeFile(
  join(outputRoot, "export-info.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), projectId: hosting.project_id }, null, 2),
  "utf8",
);

console.log("Static site exported to docs/");


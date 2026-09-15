import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const files = [];
async function walk(directory) {
  for (const item of await readdir(new URL(directory, root), { withFileTypes: true })) {
    if (["node_modules", ".git", ".wrangler", ".private", ".audit", "artifacts", "dist", "cloudflare-recovery"].includes(item.name)) continue;
    const name = directory + item.name;
    if (/docs\/security\/(scan-results|preview-verification|production-verification)\.json$/.test(name)) continue;
    if (item.isDirectory()) await walk(name + "/");
    else if (/\.(js|mjs|html|css|sql|json|jsonc|md|ya?ml)$/.test(name) && !/lock\.(json|yaml)$/.test(name)) files.push(name);
  }
}
await walk("");
const rules = {
  htmlSink: /innerHTML|insertAdjacentHTML|srcdoc/g,
  dynamicCode: /\beval\s*\(|new Function\s*\(/g,
  browserStorage: /localStorage|sessionStorage/g,
  crossWindowMessage: /postMessage|addEventListener\(["']message/g,
  secretPattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:ghp_|github_pat_|AKIA|sk_live_|sk_test_)[A-Za-z0-9_]{16,}/g
};
const inventory = [];
for (const path of files.sort()) {
  const source = await readFile(new URL(path, root), "utf8");
  const matches = {};
  for (const [rule, pattern] of Object.entries(rules)) {
    matches[rule] = [...source.matchAll(pattern)].map(match => source.slice(0, match.index).split("\n").length);
  }
  inventory.push({ path, lines: source.split("\n").length, sha256: createHash("sha256").update(source).digest("hex"), matches });
}
const lock = JSON.parse(await readFile(new URL("package-lock.json", root), "utf8"));
const packages = {};
for (const [path, details] of Object.entries(lock.packages || {})) {
  if (!path || !details.version) continue;
  const name = details.name || path.split("node_modules/").at(-1);
  (packages[name] ||= new Set()).add(details.version);
}
const vendorRecords = JSON.parse(await readFile(new URL("docs/security/vendor-provenance.json", root), "utf8"));
for (const vendor of vendorRecords) {
  const name = vendor.file.includes("lucide") ? "lucide" : "tailwindcss";
  (packages[name] ||= new Set()).add(vendor.version);
}
const advisoryRequest = Object.fromEntries(Object.entries(packages).map(([name, versions]) => [name, [...versions]]));
const advisoryResponse = await fetch("https://registry.npmjs.org/-/npm/v1/security/advisories/bulk", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(advisoryRequest)
});
if (!advisoryResponse.ok) throw new Error("Dependency advisory service unavailable: " + advisoryResponse.status);
const advisories = await advisoryResponse.json();
// Search tracked historical objects without printing credential contents.
const objects = execFileSync("git", ["rev-list", "--objects", "--all"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim().split("\n");
const historicalSecretMatches = [];
for (const item of objects) {
  const split = item.indexOf(" ");
  if (split < 0) continue;
  const oid = item.slice(0, split), path = item.slice(split + 1);
  if (!/\.(js|json|jsonc|env|vars|toml|ya?ml|md|txt)$/.test(path)) continue;
  const source = execFileSync("git", ["cat-file", "-p", oid], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const match of source.matchAll(rules.secretPattern)) historicalSecretMatches.push({ oid, path, line: source.slice(0, match.index).split("\n").length });
}
const report = { date: new Date().toISOString(), scope: "Repository static inventory and public npm lockfile advisory lookup. Pattern matches require manual review; not proof of exploitability or absence of vulnerabilities.", files: inventory.length, applicationFiles: inventory.filter(f => !f.path.startsWith("public/vendor/")).length, sourceLines: inventory.reduce((n, f) => n + f.lines, 0), dependencyPackages: Object.keys(packages).length, advisories, historicalObjects: objects.length, historicalSecretMatches, inventory };
await mkdir(new URL("docs/security/", root), { recursive: true });
await writeFile(new URL("docs/security/scan-results.json", root), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ files: report.files, sourceLines: report.sourceLines, dependencyPackages: report.dependencyPackages, advisoryPackages: Object.keys(advisories), historicalObjects: objects.length, historicalSecretMatches, secretPatternMatches: inventory.filter(f => f.matches.secretPattern.length).map(f => ({ path: f.path, lines: f.matches.secretPattern })) }, null, 2));
if (Object.keys(advisories).length || historicalSecretMatches.length) process.exitCode = 1;

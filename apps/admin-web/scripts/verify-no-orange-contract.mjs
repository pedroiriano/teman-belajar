import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const rootUrl = new URL("../", import.meta.url);
const root = fileURLToPath(rootUrl);
const sourceRoot = fileURLToPath(new URL("src/", rootUrl));
const violations = [];

const forbiddenHex = new Set([
  "fff7ed", "ffedd5", "fed7aa", "fdba74", "fb923c", "f97316", "ea580c", "c2410c", "9a3412", "7c2d12", "431407",
  "fffbeb", "fef3c7", "fde68a", "fcd34d", "fbbf24", "f59e0b", "d97706", "b45309", "92400e", "78350f", "451a03",
]);

const forbiddenRgb = new Set([
  "249,115,22", "234,88,12", "194,65,12", "154,52,18", "124,45,18",
  "245,158,11", "217,119,6", "180,83,9", "146,64,14", "120,53,15",
]);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  }));
  return files.flat();
}

function reportMatches(content, path, pattern, message) {
  for (const match of content.matchAll(pattern)) {
    const line = content.slice(0, match.index).split("\n").length;
    violations.push(`${path}:${line} ${message}: ${match[0]}`);
  }
}

for (const file of await sourceFiles(sourceRoot)) {
  if (![".ts", ".tsx", ".css"].includes(extname(file))) continue;
  const content = await readFile(file, "utf8");
  const path = relative(root, file).replaceAll("\\", "/");

  reportMatches(content, path, /\b(?:orange|amber)\b/gi, "uses a forbidden Admin hue name");
  reportMatches(content, path, /(?:bg|text|border|ring|outline|shadow|from|via|to|decoration|divide|placeholder|caret|accent|fill|stroke)-(?:orange|amber)(?:-|\/|\b)/gi, "uses a forbidden Admin color utility");
  reportMatches(content, path, /hsla?\(\s*(?:1[5-9]|[2-3]\d|4[0-4])(?:deg)?(?:\s|,)/gi, "uses an orange-range HSL color");

  for (const match of content.matchAll(/#([0-9a-f]{6})\b/gi)) {
    if (!forbiddenHex.has(match[1].toLowerCase())) continue;
    const line = content.slice(0, match.index).split("\n").length;
    violations.push(`${path}:${line} uses a forbidden Admin raw color: ${match[0]}`);
  }

  for (const match of content.matchAll(/rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/gi)) {
    if (!forbiddenRgb.has(`${match[1]},${match[2]},${match[3]}`)) continue;
    const line = content.slice(0, match.index).split("\n").length;
    violations.push(`${path}:${line} uses a forbidden Admin RGB color: ${match[0]}`);
  }
}

if (violations.length > 0) {
  console.error("Admin no-orange contract failed:\n" + violations.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Admin no-orange contract passed (light and dark source guard).");

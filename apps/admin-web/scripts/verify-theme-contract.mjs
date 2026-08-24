import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const rootUrl = new URL("../", import.meta.url);
const root = fileURLToPath(rootUrl);
const sourceRoot = fileURLToPath(new URL("src/", rootUrl));
const violations = [];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  }));
  return files.flat();
}

for (const file of await sourceFiles(sourceRoot)) {
  if (![".ts", ".tsx", ".css"].includes(extname(file))) continue;
  const content = await readFile(file, "utf8");
  const path = relative(root, file).replaceAll("\\", "/");

  for (const pattern of [
    /admin-input[^"'`]*!bg-/g,
    /admin-input[^"'`]*!text-/g,
    /admin-input[^"'`]*!border-/g,
  ]) {
    for (const match of content.matchAll(pattern)) {
      const line = content.slice(0, match.index).split("\n").length;
      violations.push(`${path}:${line} contains a forced color utility on admin-input`);
    }
  }
}

const globalCss = await readFile(new URL("src/app/globals.css", rootUrl), "utf8");
for (const contract of [
  "--admin-field:",
  "--admin-field-readonly:",
  "--admin-field-disabled:",
  ".admin-input:-webkit-autofill",
  ".admin-file-input::file-selector-button",
  ".admin-checkbox",
]) {
  if (!globalCss.includes(contract)) {
    violations.push(`src/app/globals.css is missing theme contract: ${contract}`);
  }
}

const lightTheme = globalCss.match(/:root\s*\{(?<body>[^}]+)\}/)?.groups?.body;
if (!lightTheme) {
  violations.push("src/app/globals.css is missing the Admin light-theme token block");
} else {
  for (const contract of [
    "--admin-primary: #38bdf8;",
    "--admin-primary-hover: #0ea5e9;",
    "--admin-on-primary: #082f49;",
    "--admin-accent-text: #0369a1;",
    "--admin-accent-border: #0284c7;",
    "--admin-focus: #0284c7;",
  ]) {
    if (!lightTheme.includes(contract)) {
      violations.push(`Admin light theme is missing fixed Cuba blue contract: ${contract}`);
    }
  }
}

const darkTheme = globalCss.match(/:root\[data-theme="dark"\]\s*\{(?<body>[^}]+)\}/)?.groups?.body;
if (!darkTheme) {
  violations.push("src/app/globals.css is missing the Admin dark-theme token block");
} else {
  for (const contract of [
    "--admin-primary: #38bdf8;",
    "--admin-primary-hover: #0ea5e9;",
    "--admin-on-primary: #082f49;",
    "--admin-accent-text: #7dd3fc;",
    "--admin-accent-border: #38bdf8;",
    "--admin-focus: #38bdf8;",
  ]) {
    if (!darkTheme.includes(contract)) {
      violations.push(`Admin dark theme is missing fixed Cuba blue contract: ${contract}`);
    }
  }

}

if (violations.length > 0) {
  console.error("Admin theme contract failed:\n" + violations.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Admin theme contract passed.");

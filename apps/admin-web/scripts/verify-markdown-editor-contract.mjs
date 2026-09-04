import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

const editor = read("src/components/editor/cuba-markdown-editor.tsx");
const renderer = read("src/components/editor/admin-markdown-renderer.tsx");
const utils = read("src/components/editor/editor-utils.ts");
const icon = read("src/components/admin-icon.tsx");
const css = read("src/styles/cuba-foundation.css");

const knowCreate = read("src/app/dashboard/knowledge/create/page.tsx");
const knowDetail = read("src/app/dashboard/knowledge/[id]/page.tsx");
const newsCreate = read("src/app/dashboard/news/create/page.tsx");
const newsDetail = read("src/app/dashboard/news/[id]/page.tsx");
const annCreate = read("src/app/dashboard/announcements/create/page.tsx");
const annDetail = read("src/app/dashboard/announcements/[id]/page.tsx");

// 1. CubaMarkdownEditor verification
for (const token of [
  'role="toolbar"',
  'aria-label="Formatting toolbar"',
  "data-cuba-editor",
  "Heading 2",
  "Heading 3",
  "Ctrl+B",
  "Ctrl+I",
  "Ctrl+K",
  "AdminMarkdownRenderer",
  "countWords",
  "countChars",
]) {
  assert.ok(editor.includes(token), `cuba-markdown-editor.tsx missing: ${token}`);
}

// 2. AdminMarkdownRenderer verification
for (const token of [
  "AdminMarkdownRenderer",
  "parseBlocks",
  "parseInline",
  "cuba-prose",
]) {
  assert.ok(renderer.includes(token), `admin-markdown-renderer.tsx missing: ${token}`);
}

// 3. editor-utils verification
for (const token of [
  "wrapSelection",
  "insertAtLineStart",
  "insertBlock",
  "toggleNumberedList",
  "insertCodeBlock",
  "countWords",
  "countChars",
]) {
  assert.ok(utils.includes(token), `editor-utils.ts missing: ${token}`);
}

// 4. AdminIcon Feather icons verification
assert.match(icon, /"code"/);
assert.match(icon, /"list"/);
assert.match(icon, /code:\s*"m16 18/);
assert.match(icon, /list:\s*"M8 6h13/);

// 5. CSS foundation verification
for (const selector of [
  ".cuba-editor",
  ".cuba-editor-shell",
  ".cuba-editor-toolbar",
  ".cuba-toolbar-btn",
  ".cuba-editor-textarea",
  ".cuba-editor-preview",
  ".cuba-editor-footer",
]) {
  assert.ok(css.includes(selector), `cuba-foundation.css missing: ${selector}`);
}

// 6. Integration across all 6 pages
const pages = [
  ["Knowledge Create", knowCreate],
  ["Knowledge Detail", knowDetail],
  ["News Create", newsCreate],
  ["News Detail", newsDetail],
  ["Announcements Create", annCreate],
  ["Announcements Detail", annDetail],
];

for (const [name, content] of pages) {
  assert.ok(
    content.includes("CubaMarkdownEditor"),
    `${name} does not import/use CubaMarkdownEditor`
  );
}

// Detail pages also use AdminMarkdownRenderer for read-only view
assert.ok(knowDetail.includes("AdminMarkdownRenderer"), "Knowledge Detail missing AdminMarkdownRenderer");
assert.ok(newsDetail.includes("AdminMarkdownRenderer"), "News Detail missing AdminMarkdownRenderer");
assert.ok(annDetail.includes("AdminMarkdownRenderer"), "Announcements Detail missing AdminMarkdownRenderer");

// 7. No-Orange verification on all editor files
for (const [name, content] of [
  ["cuba-markdown-editor.tsx", editor],
  ["admin-markdown-renderer.tsx", renderer],
  ["editor-utils.ts", utils],
]) {
  assert.ok(
    !/\borange\b/i.test(content),
    `${name} violates No-Orange rule: contains 'orange'`
  );
  assert.ok(
    !/\bamber\b/i.test(content),
    `${name} violates No-Orange rule: contains 'amber'`
  );
}

console.log("Cuba Unified Markdown Editor contract PASS");

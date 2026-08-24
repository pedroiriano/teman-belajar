import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [picker, uploader, insertion, news, knowledge, announcement, revision, policyRoute] = await Promise.all([
  read("src/components/media/MediaPicker.tsx"), read("src/components/media/MediaUploadPanel.tsx"), read("src/components/media/insertion.ts"),
  read("src/app/dashboard/news/create/page.tsx"), read("src/app/dashboard/knowledge/create/page.tsx"), read("src/app/dashboard/announcements/create/page.tsx"),
  read("src/app/dashboard/knowledge/[id]/page.tsx"), read("src/app/api/bff/media/policy/route.ts"),
]);

assert.match(picker, /Media Library/); assert.match(picker, /Unggah Baru/); assert.match(picker, /role="dialog"/); assert.match(picker, /aria-modal="true"/);
assert.match(uploader, /compressImage/); assert.match(uploader, /Setuju dan kompres/); assert.match(uploader, /requireInsertionAlt/);
assert.match(insertion, /detected_mime_type === "application\/pdf"/); assert.match(insertion, /Teks alternatif wajib/); assert.doesNotMatch(insertion, /!\[Media\]/);
for (const editor of [news, knowledge, announcement, revision]) { assert.match(editor, /<MediaPicker/); assert.match(editor, /mediaMarkdown/); }
for (const createEditor of [news, knowledge, announcement]) assert.match(createEditor, /mediaUsagesFromMarkdown/);
assert.match(policyRoute, /\/api\/v1\/admin\/media\/policy/);

console.log("Integrated Media Manager contract verified.");

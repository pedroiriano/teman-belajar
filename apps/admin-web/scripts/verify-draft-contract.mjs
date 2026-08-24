import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [hook, indexedDb, bff, status, newsCreate, newsEdit, announcementCreate, announcementEdit, knowledgeCreate, knowledgeEdit] = await Promise.all([
  read("src/components/drafts/use-auto-save-draft.ts"),
  read("src/components/drafts/indexed-db.ts"),
  read("src/lib/draft-bff.ts"),
  read("src/components/drafts/DraftStatus.tsx"),
  read("src/app/dashboard/news/create/page.tsx"),
  read("src/app/dashboard/news/[id]/page.tsx"),
  read("src/app/dashboard/announcements/create/page.tsx"),
  read("src/app/dashboard/announcements/[id]/page.tsx"),
  read("src/app/dashboard/knowledge/create/page.tsx"),
  read("src/app/dashboard/knowledge/[id]/page.tsx"),
]);

assert.match(hook, /window\.setTimeout\([^]*3000/);
assert.match(hook, /handledImmediateRequest\.current = immediateRequest/);
assert.match(hook, /saveImmediately \? 0 : 3000/);
assert.match(hook, /expected_revision: serverRevision\.current/);
assert.match(hook, /\/api\/auth\/session/);
assert.match(hook, /DRAFT|current_draft|response\.status === 409/);
assert.match(hook, /initialDraftKey = useRef/);
assert.match(hook, /new URLSearchParams\(window\.location\.search\)/);
assert.match(hook, /Object\.entries\(value as Record<string, unknown>\)[^]*\.sort/);
assert.doesNotMatch(hook, /\[pathname, router, searchParams\]/);
assert.match(indexedDb, /actor_subject/);
assert.match(indexedDb, /actor_form/);
assert.doesNotMatch(indexedDb, /accessToken|refreshToken|Authorization/);
assert.match(bff, /getServerAccessToken/);
assert.match(bff, /allowedTopLevelFields/);
assert.match(bff, /maximumDraftRequestBytes/);
assert.match(status, /aria-live="polite"/);
assert.match(status, /tidak ada versi yang ditimpa otomatis/i);

for (const [source, key] of [
  [newsCreate, "news.create"], [newsEdit, "news.edit"],
  [announcementCreate, "announcement.create"], [announcementEdit, "announcement.edit"],
  [knowledgeCreate, "knowledge.create"], [knowledgeEdit, "knowledge.edit"],
]) {
  assert.match(source, new RegExp(key.replace(".", "\\.")));
  assert.match(source, /useAutoSaveDraft/);
  assert.match(source, /<DraftStatus/);
  assert.match(source, /media_asset_ids/);
}
assert.match(newsEdit, /expected_version/);
assert.match(announcementEdit, /expected_version/);
assert.match(knowledgeEdit, /expected_revision_no/);

console.log("Admin authoring draft contract verified.");

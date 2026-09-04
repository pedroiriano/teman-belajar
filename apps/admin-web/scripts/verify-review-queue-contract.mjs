import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

const page = read("src/app/dashboard/review-queue/page.tsx");
const component = read("src/components/review-queue/cuba-review-queue.tsx");
const action = read("src/app/actions/review-queue.ts");
const bffRoute = read("src/app/api/bff/review-queue/route.ts");
const types = read("src/types/review-queue.ts");
const nav = read("src/lib/navigation.ts");

// 1. Page verification
assert.match(page, /getReviewQueueItemsAction/);
assert.match(page, /CubaReviewQueue/);
assert.match(page, /data-cuba-page="review-queue"/);
assert.match(page, /Portal Administrator/);
assert.match(page, /Reviewer/);

// 2. Component verification
for (const token of [
  'role="dialog"',
  'aria-modal="true"',
  "Catatan Peninjau",
  "Menunggu Peninjauan",
  "Siap Terbit",
  "Perlu Revisi",
  "Total Item Antrean",
  "Setujui",
  "Kembalikan ke Draf",
  "AdminDataTable",
  "AdminClientPagination",
]) {
  assert.ok(component.includes(token), `cuba-review-queue.tsx missing: ${token}`);
}

// 3. Action verification
assert.match(action, /getReviewQueueItemsAction/);
assert.match(action, /transitionReviewItemAction/);
assert.match(action, /canReview/);
assert.match(action, /transitionKnowledgeAction/);
assert.match(action, /transitionNewsAction/);
assert.match(action, /transitionAnnouncementAction/);
assert.match(action, /transitionFAQAction/);
assert.match(action, /transitionTrainingProgramAction/);
assert.match(action, /transitionMicrolearningAction/);
assert.match(action, /transitionLearningPathAction/);

// 4. BFF Route verification
assert.match(bffRoute, /export async function GET/);
assert.match(bffRoute, /export async function POST/);
assert.match(bffRoute, /transitionReviewItemAction/);

// 5. Types verification
assert.match(types, /ReviewQueueItem/);
assert.match(types, /ReviewModule/);
assert.match(types, /ReviewStatus/);
assert.match(types, /TransitionReviewPayload/);

// 6. Navigation verification
assert.match(nav, /\/dashboard\/review-queue/);
assert.match(nav, /icon: "check"/);
assert.match(nav, /"review-queue": "Antrean Peninjauan"/);

// 7. No-Orange verification on all review queue files
for (const [name, content] of [
  ["page.tsx", page],
  ["cuba-review-queue.tsx", component],
  ["review-queue.ts (action)", action],
  ["route.ts (bff)", bffRoute],
  ["review-queue.ts (types)", types],
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

console.log("Dedicated Review Queue (/dashboard/review-queue) contract PASS");

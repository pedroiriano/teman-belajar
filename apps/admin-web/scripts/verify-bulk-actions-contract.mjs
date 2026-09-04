import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const read = (relPath) => readFileSync(resolve(process.cwd(), relPath), "utf8");

console.log("Menjalankan verifikasi kontrak Bulk Actions & Batch Operations...");

// 1. Types Verification
const typesPath = "src/types/bulk-actions.ts";
assert.ok(existsSync(typesPath), `${typesPath} wajib ada`);
const types = read(typesPath);
assert.match(types, /export type BulkActionType/);
assert.match(types, /export type BulkActionModule/);
assert.match(types, /export interface BulkSelectedItem/);
assert.match(types, /export interface BulkOperationProgress/);
assert.match(types, /export interface BulkOperationResult/);
assert.match(types, /export const BULK_ACTION_CONFIGS/);
assert.ok(types.includes('"approve"'));
assert.ok(types.includes('"publish"'));
assert.ok(types.includes('"archive"'));
assert.ok(types.includes('"delete"'));

// 2. Server Actions Verification
const actionsPath = "src/app/actions/bulk-actions.ts";
assert.ok(existsSync(actionsPath), `${actionsPath} wajib ada`);
const actions = read(actionsPath);
assert.match(actions, /export async function executeBulkActionAction/);
assert.match(actions, /getServerSession/);
assert.match(actions, /getServerAccessToken/);
assert.match(actions, /broadcastEditorialUpdate/);
assert.match(actions, /revalidatePath/);
assert.match(actions, /transitionKnowledgeAction/);
assert.match(actions, /transitionNewsAction/);
assert.match(actions, /transitionAnnouncementAction/);
assert.match(actions, /transitionReviewItemAction/);

// 3. Components Verification
const actionBarPath = "src/components/bulk-actions/cuba-bulk-action-bar.tsx";
assert.ok(existsSync(actionBarPath), `${actionBarPath} wajib ada`);
const actionBar = read(actionBarPath);
assert.match(actionBar, /export function CubaBulkActionBar/);
assert.ok(actionBar.includes("item dipilih"));
assert.ok(actionBar.includes("Batalkan"));

const confirmModalPath = "src/components/bulk-actions/cuba-bulk-confirm-modal.tsx";
assert.ok(existsSync(confirmModalPath), `${confirmModalPath} wajib ada`);
const confirmModal = read(confirmModalPath);
assert.match(confirmModal, /export function CubaBulkConfirmModal/);
assert.ok(confirmModal.includes('role="dialog"'));
assert.ok(confirmModal.includes('aria-modal="true"'));
assert.ok(confirmModal.includes("Memproses item..."));

const knowledgeTablePath = "src/components/bulk-actions/cuba-knowledge-table.tsx";
assert.ok(existsSync(knowledgeTablePath), `${knowledgeTablePath} wajib ada`);
const knowledgeTable = read(knowledgeTablePath);
assert.match(knowledgeTable, /export function CubaKnowledgeTable/);
assert.match(knowledgeTable, /AdminDataTable/);
assert.match(knowledgeTable, /CubaBulkActionBar/);
assert.match(knowledgeTable, /CubaBulkConfirmModal/);
assert.match(knowledgeTable, /cuba-checkbox/);

const newsTablePath = "src/components/bulk-actions/cuba-news-table.tsx";
assert.ok(existsSync(newsTablePath), `${newsTablePath} wajib ada`);
const newsTable = read(newsTablePath);
assert.match(newsTable, /export function CubaNewsTable/);
assert.match(newsTable, /AdminDataTable/);
assert.match(newsTable, /CubaBulkActionBar/);
assert.match(newsTable, /CubaBulkConfirmModal/);
assert.match(newsTable, /cuba-checkbox/);

const annTablePath = "src/components/bulk-actions/cuba-announcements-table.tsx";
assert.ok(existsSync(annTablePath), `${annTablePath} wajib ada`);
const annTable = read(annTablePath);
assert.match(annTable, /export function CubaAnnouncementsTable/);
assert.match(annTable, /AdminDataTable/);
assert.match(annTable, /CubaBulkActionBar/);
assert.match(annTable, /CubaBulkConfirmModal/);
assert.match(annTable, /cuba-checkbox/);

const reviewQueuePath = "src/components/review-queue/cuba-review-queue.tsx";
assert.ok(existsSync(reviewQueuePath), `${reviewQueuePath} wajib ada`);
const reviewQueue = read(reviewQueuePath);
assert.match(reviewQueue, /CubaBulkActionBar/);
assert.match(reviewQueue, /CubaBulkConfirmModal/);
assert.match(reviewQueue, /cuba-checkbox/);

// 4. Content Pages Verification
const knowledgePage = read("src/app/dashboard/knowledge/page.tsx");
assert.match(knowledgePage, /CubaKnowledgeTable/);
assert.match(knowledgePage, /AdminDataTable/);

const newsPage = read("src/app/dashboard/news/page.tsx");
assert.match(newsPage, /CubaNewsTable/);
assert.match(newsPage, /AdminDataTable/);

const annPage = read("src/app/dashboard/announcements/page.tsx");
assert.match(annPage, /CubaAnnouncementsTable/);
assert.match(annPage, /AdminDataTable/);

// 5. AdminDataTable Integration
const dataTable = read("src/components/admin-data-table.tsx");
assert.match(dataTable, /selectable/);
assert.match(dataTable, /onToggleSelectAll/);
assert.match(dataTable, /bulkActionBar/);

// 6. No-Orange Rule Verification on all new bulk files
const forbiddenColors = /#f59e0b|#f97316|\borange\b|\bamber\b/i;
for (const file of [
  typesPath,
  actionsPath,
  actionBarPath,
  confirmModalPath,
  knowledgeTablePath,
  newsTablePath,
  annTablePath,
]) {
  const content = read(file);
  assert.ok(
    !forbiddenColors.test(content),
    `${file} melanggar No-Orange Rule: ditemukan warna terlarang`
  );
}

console.log("verify-bulk-actions-contract: PASS (all checks passed)");

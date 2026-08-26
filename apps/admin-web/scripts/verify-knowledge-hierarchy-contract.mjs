import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [actions, manager, selector, create, edit, shell] = await Promise.all([
  read("src/app/actions/knowledge.ts"),
  read("src/components/knowledge/KnowledgeHierarchyManager.tsx"),
  read("src/components/knowledge/KnowledgeNodeSelect.tsx"),
  read("src/app/dashboard/knowledge/create/page.tsx"),
  read("src/app/dashboard/knowledge/[id]/page.tsx"),
  read("src/components/admin-shell.tsx"),
]);

for (const operation of ["createKnowledgeNodeAction", "updateKnowledgeNodeAction", "moveKnowledgeNodeAction", "reorderKnowledgeNodesAction", "archiveKnowledgeNodeAction", "assignKnowledgeArticleNodeAction"]) assert.match(actions, new RegExp(operation));
assert.match(manager, /role=\{nested \? "group" : "tree"\}/);
assert.match(manager, /readOnly=\{readOnly\} nested \/>/);
assert.match(manager, /knowledge-hierarchy\.create/);
assert.match(manager, /knowledge-hierarchy\.edit/);
assert.match(manager, /window\.confirm/);
assert.match(manager, /Mode baca Peninjau/);
assert.match(selector, /getKnowledgeHierarchyAction\(false\)/);
for (const editor of [create, edit]) {
  assert.match(editor, /<KnowledgeNodeSelect/);
  assert.match(editor, /primary_node_id/);
}
assert.match(shell, /\/dashboard\/knowledge-hierarchy/);
console.log("Admin Knowledge hierarchy contract PASS");

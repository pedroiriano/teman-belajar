import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [index, detail, tree, markdown, search] = await Promise.all([
  read("src/app/knowledge/page.tsx"),
  read("src/app/knowledge/[slug]/page.tsx"),
  read("src/components/knowledge/knowledge-tree.tsx"),
  read("src/components/markdown-renderer.tsx"),
  read("src/app/search/page.tsx"),
]);

assert.match(index, /grid-cols-\[16rem_minmax\(0,1fr\)_14rem\]/);
assert.match(index, /\/api\/v1\/knowledge\/tree/);
assert.match(index, /nodeId/);
assert.match(detail, /generateMetadata/);
assert.match(detail, /metadataFromSEO/);
assert.match(detail, /Daftar isi/);
assert.match(detail, /<KnowledgeTree/);
assert.match(tree, /role=\{nested \? "group" : "tree"\}/);
assert.match(tree, /<NodeList nodes=\{node\.children\} activeNodeId=\{activeNodeId\} nested \/>/);
assert.match(tree, /portal-hierarchy-drawer/);
assert.match(markdown, /extractMarkdownHeadings/);
assert.match(markdown, /scroll-mt-28/);
assert.match(search, /hierarchy_path/);
console.log("Portal Knowledge explorer contract PASS");

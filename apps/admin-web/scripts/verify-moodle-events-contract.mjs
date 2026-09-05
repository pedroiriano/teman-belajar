import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = existsSync(resolve(process.cwd(), "apps/admin-web"))
  ? resolve(process.cwd(), "apps/admin-web")
  : process.cwd();

const read = (path) => readFileSync(resolve(root, path), "utf8");

const page = read("src/app/dashboard/moodle-events/page.tsx");
const component = read("src/components/moodle-events/cuba-moodle-events-workspace.tsx");
const action = read("src/app/actions/moodle-events.ts");
const types = read("src/types/moodle-event.ts");
const nav = read("src/lib/navigation.ts");

// 1. Page verification
assert.match(page, /getMoodleEventsSummaryAction/);
assert.match(page, /listMoodleEventsAction/);
assert.match(page, /CubaMoodleEventsWorkspace/);
assert.match(page, /data-cuba-page="moodle-events"/);
assert.match(page, /Portal Administrator/);

// 2. Component verification
for (const token of [
  'data-cuba-component="moodle-events-workspace"',
  "Moodle Event Inbox & Rekonsiliasi Integrasi",
  "Total Peristiwa",
  "Berhasil (Processed)",
  "Menunggu (Pending)",
  "Diproses (Processing)",
  "Gagal (Dead Letter)",
  "requeueMoodleEventAction",
  "Detail Peristiwa",
  "Fingerprint (SHA-256)",
  "Payload JSON",
]) {
  assert.ok(component.includes(token), `cuba-moodle-events-workspace.tsx missing: ${token}`);
}

// 3. Action verification
assert.match(action, /getMoodleEventsSummaryAction/);
assert.match(action, /listMoodleEventsAction/);
assert.match(action, /getMoodleEventDetailAction/);
assert.match(action, /requeueMoodleEventAction/);
assert.match(action, /\/api\/v1\/admin\/moodle\/events/);

// 4. Types verification
assert.match(types, /MoodleEventStatus/);
assert.match(types, /MoodleEventSummary/);
assert.match(types, /MoodleInboxEvent/);
assert.match(types, /MoodleEventFilter/);
assert.match(types, /MoodleEventListResponse/);

// 5. Navigation verification
assert.match(nav, /\/dashboard\/moodle-events/);
assert.match(nav, /id: "moodle-events"/);
assert.match(nav, /label: "Moodle Event Inbox"/);
assert.match(nav, /"moodle-events": "Moodle Event Inbox"/);

// 6. No-Orange verification on all Moodle Event files
for (const [name, content] of [
  ["page.tsx", page],
  ["cuba-moodle-events-workspace.tsx", component],
  ["moodle-events.ts (action)", action],
  ["moodle-event.ts (types)", types],
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

console.log("Moodle Event Inbox Monitoring Panel (TASK-011) contract PASS");

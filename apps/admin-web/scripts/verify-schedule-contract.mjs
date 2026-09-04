import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

const page = read("src/app/dashboard/schedule/page.tsx");
const component = read("src/components/schedule/cuba-schedule-calendar.tsx");
const action = read("src/app/actions/schedule.ts");
const nav = read("src/lib/navigation.ts");
const css = read("src/styles/cuba-foundation.css");

// 1. Page verification
assert.match(page, /getScheduleEventsAction/);
assert.match(page, /CubaScheduleCalendar/);
assert.match(page, /data-cuba-page="schedule"/);

// 2. Component verification
for (const token of [
  "month-calendar",
  "calendar-grid",
  "calendar-day",
  "calendar-head",
  "agenda-compact",
  "Konflik jadwal",
  "Jadwalkan Publikasi Konten",
  "Semua modul",
  "Asia/Jakarta",
]) {
  assert.ok(component.includes(token), `cuba-schedule-calendar.tsx missing: ${token}`);
}

// 3. Action verification
assert.match(action, /getScheduleEventsAction/);
assert.match(action, /createScheduleEventAction/);
assert.match(action, /hasConflict/);
assert.match(action, /conflictDetails/);

// 4. Navigation verification
assert.match(nav, /\/dashboard\/schedule/);
assert.match(nav, /icon: "calendar"/);
assert.match(nav, /schedule: "Jadwal Publikasi"/);

// 5. CSS verification
for (const selector of [
  ".schedule-layout",
  ".month-calendar",
  ".calendar-head",
  ".calendar-grid",
  ".calendar-day",
  ".agenda-compact",
]) {
  assert.ok(css.includes(selector), `cuba-foundation.css missing: ${selector}`);
}

// 6. No-Orange verification on new files
for (const [name, content] of [
  ["page.tsx", page],
  ["cuba-schedule-calendar.tsx", component],
  ["schedule.ts (action)", action],
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

console.log("Unified Publication Calendar (Schedule) contract PASS");

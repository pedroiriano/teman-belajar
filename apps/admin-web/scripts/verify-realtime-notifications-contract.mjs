import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

const hub = read("src/lib/notifications/stream-hub.ts");
const route = read("src/app/api/bff/notifications/stream/route.ts");
const component = read("src/components/notification-center.tsx");
const action = read("src/app/actions/review-queue.ts");
const css = read("src/styles/cuba-foundation.css");

// 1. NotificationStreamHub verification
for (const token of [
  "NotificationStreamHub",
  "broadcastEditorialUpdate",
  "broadcastSummary",
  "addClient",
  "removeClient",
  "EditorialNotificationEvent",
  "notificationStreamHub",
]) {
  assert.ok(hub.includes(token), `stream-hub.ts missing: ${token}`);
}

// 2. Stream Route Handler verification
for (const token of [
  "text/event-stream",
  "notificationStreamHub",
  "ReadableStream",
  "event: connected",
]) {
  assert.ok(route.includes(token), `stream/route.ts missing: ${token}`);
}

// 3. UI Component Real-Time Integration verification
for (const token of [
  "/api/bff/notifications/stream",
  "EventSource",
  "cuba-toast",
  "cuba-live-chip",
  "cuba-live-dot",
  "editorial",
  "connected",
]) {
  assert.ok(component.includes(token), `notification-center.tsx missing: ${token}`);
}

// 4. Review Queue Action Broadcast verification
assert.ok(
  action.includes("broadcastEditorialUpdate"),
  "review-queue.ts missing broadcastEditorialUpdate call"
);

// 5. CSS Foundation verification
for (const selector of [
  ".cuba-toast-container",
  ".cuba-toast",
  ".cuba-live-chip",
  ".cuba-live-dot",
]) {
  assert.ok(css.includes(selector), `cuba-foundation.css missing: ${selector}`);
}

// 6. No-Orange Rule verification
for (const [name, content] of [
  ["stream-hub.ts", hub],
  ["stream/route.ts", route],
  ["notification-center.tsx", component],
]) {
  assert.ok(
    !/\borange\b/i.test(content),
    `${name} violates No-Orange rule: contains 'orange'`
  );
  assert.ok(
    !/\bamber\b/i.test(content),
    `${name} violates No-Orange rule: contains 'amber'`
  );
  assert.ok(
    !/#(?:f59e0b|f97316)/i.test(content),
    `${name} violates No-Orange rule: contains orange hex`
  );
}

console.log("Real-time notifications & SSE contract PASS");

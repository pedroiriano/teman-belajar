import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

const palette = read("src/components/command-palette/cuba-command-palette.tsx");
const shell = read("src/components/admin-shell.tsx");
const css = read("src/styles/cuba-foundation.css");

// 1. CubaCommandPalette Component Verification
for (const token of [
  "CubaCommandPalette",
  "openCubaCommandPalette",
  "QUICK_ACTIONS",
  "cuba_recent_searches",
  "navigationGroups",
  "canAccessItem",
  "role=\"combobox\"",
  "role=\"listbox\"",
  "role=\"option\"",
  "ArrowDown",
  "ArrowUp",
  "Enter",
  "Escape",
]) {
  assert.ok(palette.includes(token), `cuba-command-palette.tsx missing token: ${token}`);
}

// 2. Quick Actions Coverage
for (const actionId of [
  "act-create-news",
  "act-create-knowledge",
  "act-create-announcement",
  "act-review-queue",
  "act-schedule",
  "act-statistics",
  "act-integration-health",
  "act-audit",
  "act-users",
  "act-media-gallery",
]) {
  assert.ok(palette.includes(actionId), `cuba-command-palette.tsx missing quick action: ${actionId}`);
}

// 3. Shell Topbar Integration
for (const token of [
  "CubaCommandPalette",
  "openCubaCommandPalette",
  "admin-module-search",
  "Ctrl",
]) {
  assert.ok(shell.includes(token), `admin-shell.tsx missing token: ${token}`);
}

// 4. CSS Classes
for (const selector of [
  ".cuba-command-palette-backdrop",
  ".cuba-command-palette-card",
  "cubaPaletteFadeIn",
  "cubaPaletteZoomIn",
]) {
  assert.ok(css.includes(selector), `cuba-foundation.css missing selector: ${selector}`);
}

console.log("verify-command-palette-contract: PASS (all checks passed)");

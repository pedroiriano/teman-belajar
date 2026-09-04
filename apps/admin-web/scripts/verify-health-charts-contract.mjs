import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

const charts = read("src/components/integration-health/cuba-health-charts.tsx");
const page = read("src/app/dashboard/integration-health/page.tsx");

// 1. CubaHealthCharts verification
for (const token of [
  "CubaApexChart",
  'type: "bar"',
  "stacked: true",
  'type: "radialBar"',
  "Distribusi Status per Kluster",
  "Skor Ketersediaan Sistem",
  "data-cuba-health-charts",
  "availabilityScore",
]) {
  assert.ok(charts.includes(token), `cuba-health-charts.tsx missing: ${token}`);
}

// 2. Integration Health Page integration verification
assert.ok(
  page.includes("CubaHealthCharts"),
  "integration-health/page.tsx missing CubaHealthCharts import"
);
assert.ok(
  page.includes("<CubaHealthCharts"),
  "integration-health/page.tsx missing <CubaHealthCharts JSX"
);

// 3. Retain existing integration health contract requirements
assert.ok(
  page.includes("Portal Administrator"),
  "integration-health/page.tsx missing Portal Administrator check"
);
assert.ok(
  page.includes("CORRELATION_PATH"),
  "integration-health/page.tsx missing CORRELATION_PATH"
);
assert.ok(
  page.includes("correlationPathSafe"),
  "integration-health/page.tsx missing correlationPathSafe"
);
assert.ok(
  page.includes("aria-labelledby"),
  "integration-health/page.tsx missing aria-labelledby"
);
assert.ok(
  page.includes("md:grid-cols-2"),
  "integration-health/page.tsx missing md:grid-cols-2"
);

// 4. No-Orange Rule verification
for (const [name, content] of [
  ["cuba-health-charts.tsx", charts],
  ["integration-health/page.tsx", page],
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

console.log("Cuba Integration Health ApexCharts contract PASS");

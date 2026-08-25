import { readFileSync } from "node:fs";

const help = readFileSync(new URL("../src/app/help/page.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const client = readFileSync(new URL("../src/lib/faqs.ts", import.meta.url), "utf8");

for (const token of ["FAQPage", "mainEntity", "acceptedAnswer", "indexable", "application/ld+json", "escapeJSONLD", "aria-"]) {
  if (!help.includes(token)) throw new Error(`Help Center contract missing ${token}`);
}
if (!client.includes("/api/v1/faqs") || !client.includes('cache:"no-store"')) throw new Error("Help Center does not use the canonical public FAQ API without cross-application cache staleness");
if (/const\s+faqs\s*=\s*\[/.test(home) || home.includes("Apa itu Teman Belajar?")) throw new Error("Hard-coded homepage FAQ returned");
if (!home.includes("getPublicFAQs")) throw new Error("Homepage FAQ teaser is not CMS-backed");
if (!help.includes('JSON.stringify(value).replace(/</g, "\\\\u003c")')) throw new Error("FAQ JSON-LD does not escape HTML-significant less-than characters");

console.log("FAQ Portal static contract verified");

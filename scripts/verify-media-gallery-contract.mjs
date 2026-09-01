import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const backend = [
  "services/portal-api/internal/domain/mediagallery/model.go",
  "services/portal-api/internal/domain/mediagallery/service.go",
  "services/portal-api/internal/repository/postgres/media_gallery_repository.go",
  "services/portal-api/internal/transport/http/handler/media_gallery_handler.go",
  "services/portal-api/internal/domain/media/policy.go",
  "services/portal-api/migrations/023_create_media_gallery.sql",
].map(read).join("\n");
const admin = [
  "apps/admin-web/src/components/media-gallery-editor.tsx",
  "apps/admin-web/src/components/media/MediaPicker.tsx",
  "apps/admin-web/src/components/admin-shell.tsx",
].map(read).join("\n");
const portal = [
  "apps/portal-web/src/app/media-gallery/page.tsx",
  "apps/portal-web/src/app/media-gallery/[slug]/page.tsx",
  "apps/portal-web/src/components/public-media-item.tsx",
].map(read).join("\n");

const assertions = [
  [backend.includes("status='published'") && backend.includes("asset.status='active'"), "public visibility predicates missing"],
  [backend.includes("ErrVersionConflict") && backend.includes("BeginTx"), "transaction/version protection missing"],
  [backend.includes("MaxPayloadBytes") && backend.includes("DisallowUnknownFields"), "bounded strict request contract missing"],
  [backend.includes("video/mp4") && backend.includes("video/webm"), "authoritative video policy missing"],
  [!/(json:\"(storage_key|bucket|checksum|raw_url))/.test(backend), "private storage field exposed in response model"],
  [admin.includes("MediaPicker") && admin.includes("Transkrip video") && admin.includes("Jadikan cover"), "Admin curation contract incomplete"],
  [admin.includes("const toInput=") && admin.includes("collection:input"), "Admin request allowlist projection missing"],
  [admin.includes("const effectiveKind = restrictedKind || kind") && admin.includes("kind: effectiveKind"), "MediaPicker kind synchronization missing"],
  [admin.includes('href: "/dashboard/media-gallery"') && !admin.includes('{ label: "Galeri Media", icon: "media", disabled: true }'), "Admin Gallery navigation activation missing"],
  [portal.includes("Media tidak lagi tersedia") && portal.includes("Paginasi koleksi"), "public fallback/pagination missing"],
  [read("apps/portal-web/src/components/portal-chrome.tsx").includes('href: "/media-gallery", label: "Media"'), "Portal Media navigation activation missing"],
  [portal.includes("index:false") && portal.includes("StructuredData"), "public SEO guard missing"],
];
const failures = assertions.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Media Gallery contract: PASS");

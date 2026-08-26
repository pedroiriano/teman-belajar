import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "services/portal-api/migrations/018_create_notification_center.sql",
  "services/portal-api/internal/application/notification/service.go",
  "services/portal-api/internal/application/notification/service_test.go",
  "services/portal-api/internal/transport/http/handler/notification.go",
  "services/portal-api/internal/transport/http/handler/notification_test.go",
  "apps/admin-web/src/components/notification-center.tsx",
  "apps/portal-web/src/components/notification-center.tsx",
  "apps/admin-web/src/app/api/bff/notifications/route.ts",
  "apps/portal-web/src/app/api/notifications/route.ts",
];
const failures = required.filter((file) => !fs.existsSync(path.join(root, file))).map((file) => `Berkas wajib hilang: ${file}`);
const adminShell = fs.readFileSync(path.join(root, "apps/admin-web/src/components/admin-shell.tsx"), "utf8");
if (!adminShell.includes("AdminNotificationCenter")) failures.push("Lonceng Admin belum aktif");
if (adminShell.includes("Notifikasi belum diaktifkan")) failures.push("Placeholder lonceng Admin kembali muncul");
for (const [file, prefix] of [["apps/admin-web/src/components/notification-center.tsx", "/api/bff/notifications"], ["apps/portal-web/src/components/notification-center.tsx", "/api/notifications"]]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const behavior of ["summary", "read-all", "preferences", "/read"]) {
    if (!source.includes(behavior)) failures.push(`${file}: perilaku ${behavior} hilang`);
  }
  if (!source.includes(prefix)) failures.push(`${file}: sumber inbox server tidak digunakan`);
  if (/mockNotifications|fakeUnread|hardcodedNotifications/i.test(source)) failures.push(`${file}: data notifikasi palsu terdeteksi`);
}
for (const [file, audience] of [["apps/admin-web/src/lib/notifications/proxy.ts", "admin"], ["apps/portal-web/src/lib/notifications/proxy.ts", "portal"]]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  if (!new RegExp(`audience\\s*:\\s*["']${audience}["']`).test(source)) failures.push(`${file}: audience BFF tidak terkunci`);
  if (source.includes("user_id")) failures.push(`${file}: subject browser tidak boleh dipercaya`);
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Kontrak pemulihan Notification Center lulus.");

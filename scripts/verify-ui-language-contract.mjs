import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roots = ["apps/admin-web/src", "apps/portal-web/src"];
const forbidden = [
  [/>\s*Admin Console\s*</, "Admin Console → Panel Administrasi"],
  [/>\s*Media Library\s*</, "Media Library → Pustaka Media"],
  [/>\s*Dashboard\s*</, "Dashboard → Dasbor"],
  [/>\s*Previous\s*</, "Previous → Sebelumnya"],
  [/>\s*Next\s*</, "Next → Berikutnya"],
  [/Status:\s*Draft/, "Draft → Draf"],
  [/>\s*Draft baru\s*</, "Draft → Draf"],
  [/"Draft (?:tersimpan|belum|server|dibuang|baru)/, "Draft → Draf"],
  [/Simpan draft/, "draft → draf"],
  [/Ajukan review/, "review → peninjauan"],
  [/Kembalikan ke draft/, "draft → draf"],
  [/workflow editorial/i, "workflow → alur kerja"],
  [/workflow review/i, "workflow review → alur kerja peninjauan"],
  [/Notifikasi belum diaktifkan/, "placeholder notifikasi tidak boleh aktif"],
  [/Knowledge on demand|Mobile-first|Experience terpisah|Enterprise Digital Learning Experience Platform/, "copy Portal harus menggunakan Bahasa Indonesia"],
];

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(candidate);
    return entry.isFile() && (candidate.endsWith(".tsx") || candidate.endsWith(".ts")) ? [candidate] : [];
  });
}

const failures = [];
for (const root of roots) {
  for (const file of filesUnder(path.join(repositoryRoot, root))) {
    const source = fs.readFileSync(file, "utf8");
    for (const [pattern, guidance] of forbidden) {
      if (pattern.test(source)) failures.push(`${path.relative(repositoryRoot, file)}: ${guidance}`);
    }
  }
}

if (failures.length) {
  console.error(`Kontrak bahasa UI gagal:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("Kontrak bahasa UI Portal dan Admin lulus.");

# TASK-006R: My Learning Contract Reconciliation, UX Hardening & Real Browser QA

## 1. Tujuan
Memastikan frontend Portal Web benar-benar mematuhi kontrak API yang terdefinisi di `openapi.yaml` untuk fitur *My Learning*, menangani *error* secara tangguh via lapisan BFF tanpa membocorkan kredensial atau *raw text*, memperkuat UI laci (*drawer*) dengan standar aksesibilitas dan pemuatan dinamis (`Promise.allSettled`), serta membereskan galat logout dan variabel lingkungan.

## 2. Checklist Pengerjaan

- [x] **Strict Contract Reconciliation**: 
  - [x] Membuat TypeScript interface strict untuk `EnrolledCourse`, `CourseCompletion`, dan `GradeItem`.
  - [x] Menyesuaikan atribut rendering di UI (contoh: `fullname` menjadi `full_name`, pengecekan kelulusan menggunakan boolean `completed`).
- [x] **BFF Error Handling**: 
  - [x] Mengimplementasikan helper sentral `proxyLearningRequest` di `apps/portal-web/src/lib/learning/proxy.ts`.
  - [x] Memvalidasi parameter *course ID* dan membungkus respon non-JSON menjadi 502 Bad Gateway format `application/problem+json` untuk menghindari *text leakage*.
- [x] **UX Drawer & Accessibility**:
  - [x] Menggunakan `Promise.allSettled` agar laci informasi bisa memuat data *Grade* walau *Completion* gagal (atau sebaliknya).
  - [x] Menambahkan `AbortController` untuk mencegah penumpukan antrean pemanggilan bila *course ID* berganti cepat.
  - [x] Implementasi semantik `role="dialog"` dan penangkapan tombol `Escape` untuk kemudahan navigasi.
  - [x] Mendukung secara penuh kelas-kelas utilitas Dark Mode.
- [x] **Koreksi Link & Config**: 
  - [x] Menyuntikkan `MOODLE_PUBLIC_BASE_URL` dari env lokal ke dalam kontainer Web via Docker Compose, bukan *fallback* `localhost:8080`.
- [x] **Federated Logout**: 
  - [x] Mengubah `client_id` *fallback* pada `/api/auth/federated-logout` di sisi portal menjadi `teman-belajar-web` (bukan Moodle) untuk memutus siklus loop logout.
- [x] **QA & Verification**:
  - [x] Menjalankan dan meloloskan `npm run typecheck`, `npm run lint`, dan `npm run build`.

## 3. Bukti Verifikasi

1. Linter dan Typecheck Lolos Bersih:
```
> portal-web@0.1.0 lint
> eslint . --max-warnings=0

> portal-web@0.1.0 typecheck
> tsc --noEmit
```

2. Next.js Build Berhasil:
```
✓ Compiled successfully in 6.8s
  Running TypeScript ...
  Finished TypeScript in 3.0s ...
  Collecting page data using 7 workers ...
✓ Generating static pages using 7 workers (10/10) in 291ms
```

3. Docker Compose Web Container Rebuild:
```
 Image teman-belajar-web:local Built
```

4. BFF Proxy Berjalan Semantis:
Request ke endpoint grades kini tertutup oleh pengecekan format dan menghasilkan JSON `{"type": "https://temanbelajar.com/errors/bad-gateway"...}` bila Moodle bermasalah, diatur di `/lib/learning/proxy.ts`.

## 4. Langkah Selanjutnya (Handoff)
Sistem sekarang berada dalam keadaan stabil, patuh kontrak OpenAPI, dan sangat aman dari kebocoran log. Agen berikutnya siap memproses TASK-007 (apabila ada jadwal rilis) atau fitur lainnya, dijamin dengan base foundation frontend yang kuat.

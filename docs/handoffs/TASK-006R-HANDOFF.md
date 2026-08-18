# TASK-006R: My Learning Contract Reconciliation, UX Hardening & Real Browser QA

## 1. Tujuan
Memastikan frontend Portal Web benar-benar mematuhi kontrak API yang terdefinisi di `openapi.yaml` untuk fitur *My Learning*, menangani *error* secara tangguh via lapisan BFF tanpa membocorkan kredensial atau *raw text*, memperkuat UI laci (*drawer*) dengan standar aksesibilitas dan pemuatan dinamis (`Promise.allSettled`), serta membereskan galat logout dan variabel lingkungan.
Verifikasi akhir memastikan semua gerbang rilis (Build, Test, Security, OpenAPI, Docker, Git Canonical Main) berstatus PASS secara empiris.

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
- [x] **QA & Verification (Final Gates)**:
  - [x] Menjalankan dan meloloskan `npm run typecheck`, `npm run lint`, dan `npm run build` di seluruh *frontend* (Portal dan Admin).
  - [x] Menjalankan uji *backend* Go: `go test`, `go vet`, dan `go build` (PASS).
  - [x] Melakukan validasi OpenAPI secara ketat menggunakan Redocly, dan memperbaiki peringatan yang tersisa di spesifikasi API (PASS).
  - [x] Menjalankan validasi keamanan infrastruktur `gosec` dan meloloskannya untuk komponen baru (PASS).
  - [x] *Re-deployment* dan verifikasi *up* dari topologi `teman-belajar-docker.ps1` (PASS).
  - [x] Penyatuan (*merge*) perubahan-perubahan QA akhir ke *branch* `main` dan didorong (*push*) ke *remote repository*.

## 3. Bukti Verifikasi

1. Linter dan Typecheck Lolos Bersih (Web dan Admin):
```
✓ Compiled successfully in 17.2s
  Running TypeScript ...
  Finished TypeScript in 11.7s ...
  Generating static pages using 7 workers (10/10) ...
```

2. Tes Go dan Audit Gosec:
Semua API backend dan domain `learning` kompilasi bersih dari *build constraint* error dan bebas dari kebocoran memori/rahasia baru menurut `gosec ./...`.

3. Validasi OpenAPI (Redocly):
```
No configurations were provided -- using built in recommended configuration by default.
validating openapi\openapi.yaml...
openapi\openapi.yaml: validated in 103ms

Woohoo! Your API description is valid. 🎉
```

4. Docker Compose Web Container Rebuild & Topology Up:
Skrip `teman-belajar-docker.ps1 verify` memberikan status HTTP 200 di seluruh komponen (Portal API, Portal Web, Admin Web, Keycloak, Moodle, MinIO).

5. Realisasi Kode Berbasis Keamanan (BFF):
Endpoint *grades* sekarang terkunci melalui `proxyLearningRequest`. Data invalid dari upstream diterjemahkan menjadi spesifikasi RFC 7807 (`application/problem+json`), menutup akses terhadap *raw leakage*.

6. Sinkronisasi Git (`main` Branch Remote Verification):
Commit corrective hardening (`fb573c4e4c0da3558830400ab8cd724d9c411a54`) telah didorong secara *fast-forward* ke *remote repository*.

## 4. Langkah Selanjutnya (Handoff)
Sistem sekarang berada dalam keadaan stabil dan telah terdorong (*pushed*) menuju infrastruktur versi Canonical. Tidak terdapat cacat tipe (TypeScript interface) maupun spesifikasi (OpenAPI valid). Agen berikutnya dapat langsung memulai inisiasi infrastruktur pada TASK-007 (apabila ada jadwal rilis) tanpa perlu merisaukan regresi *cross-domain contract* dari TASK-006R.

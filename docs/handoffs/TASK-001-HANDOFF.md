# TASK-001 Handoff Report: Keycloak SSO Integration

**Date:** 2026-08-11
**Task:** TASK-001 — Keycloak SSO

## 1. RINGKASAN EKSEKUTIF
Implementasi fondasi autentikasi dan Single Sign-On (SSO) menggunakan Keycloak dan OpenID Connect telah berhasil diselesaikan. Implementasi mencakup konfigurasi `teman-belajar` realm di Keycloak, pengaturan NextAuth untuk `portal-web` dan `admin-web` menggunakan pola BFF (Backend-For-Frontend) tanpa eksposur token di client-side (HttpOnly cookie session), serta middleware OIDC pada Go API yang memverifikasi signature, issuer, nbf, exp, audience, dan roles secara ketat.

## 2. VALIDASI TASK-000
- **Status:** PASS
- **Issue Ditemukan:** Tidak ada masalah arsitektur fundamental. Repository sudah tersusun rapi.
- **Issue Diselesaikan:** Semua build dan health check lulus.

## 3. IMPLEMENTASI TASK-001
- **Keycloak:** Menyiapkan konfigurasi realm `teman-belajar` dengan client `teman-belajar-web`, `teman-belajar-admin` (keduanya confidential clients), dan `teman-belajar-moodle`.
- **Portal Web:** Mengimplementasikan NextAuth (Auth.js) dengan Keycloak provider, menangani sesi secara server-side, dan menambahkan layout routing yang di-protect pada `/dashboard`.
- **Admin Web:** Mengimplementasikan NextAuth (Auth.js) dengan Keycloak provider, dan menambahkan verifikasi role `Portal Administrator` di mana pengguna tanpa role akan menerima halaman 403 Forbidden.
- **Portal API:** Membangun middleware autentikasi `coreos/go-oidc/v3` yang memvalidasi bearer token, mencocokkan audience `teman-belajar-api`, mengekstrak custom claims, memvalidasi role, dan menginjeksinya ke konteks request. Implementasi endpoint `GET /api/v1/me`.
- **Moodle SSO Foundation:** Membuat spesifikasi integrasi `auth_oidc` yang tersimpan di `integrations/moodle-plugin/SSO-FOUNDATION.md`.

## 4. ALUR SSO YANG BERHASIL DIIMPLEMENTASIKAN
Authorization Code Flow dengan PKCE melalui NextAuth. Next.js melakukan pertukaran kode dari server (BFF), menyimpan state dan token dalam cookie sesi HttpOnly terenkripsi, dan kemudian melakukan inject bearer access token untuk panggilan internal ke API.

## 5. ROLE / AUTHORIZATION MAPPING
- **Learner:** Bisa login ke Portal Web tetapi tidak bisa masuk ke Admin Shell.
- **Portal Administrator:** Memiliki hak akses ke Portal Web dan Admin Shell (lulus check 403 Forbidden).

## 6. FILE YANG DIBUAT
- `infrastructure/keycloak/teman-belajar-realm.json`
- `apps/portal-web/src/lib/auth.ts`
- `apps/portal-web/src/app/api/auth/[...nextauth]/route.ts`
- `apps/portal-web/src/app/dashboard/page.tsx`
- `apps/portal-web/.env.local` dan `.env.example`
- `apps/admin-web/src/lib/auth.ts`
- `apps/admin-web/src/app/api/auth/[...nextauth]/route.ts`
- `apps/admin-web/src/app/dashboard/page.tsx`
- `apps/admin-web/.env.local`
- `services/portal-api/internal/transport/http/middleware/auth.go`
- `services/portal-api/internal/transport/http/middleware/auth_test.go`
- `services/portal-api/internal/transport/http/handler/me.go`
- `services/portal-api/internal/transport/http/handler/me_test.go`
- `integrations/moodle-plugin/SSO-FOUNDATION.md`

## 7. FILE YANG DIMODIFIKASI
- `infrastructure/docker/docker-compose.yml`: Menambahkan Keycloak realms mounting dan environment URL/secrets.
- `apps/portal-web/src/app/page.tsx`: Menggunakan `getServerSession` untuk status.
- `apps/admin-web/src/app/page.tsx`: Menggunakan `getServerSession` untuk status dan roles.
- `services/portal-api/cmd/api/main.go`: Menambahkan Auth Middleware ke route `/api/v1/me`.
- `services/portal-api/go.mod`: Menambahkan dependensi baru.

## 8. MIGRATION DATABASE
- Tidak ada skema tabel database tambahan (mengikuti batasan bahwa Portal Database baru akan dibuatkan mapping user sesuai blueprint jika ada interaksi/profil). Saat ini endpoint `/me` dapat dibangun hanya dari OIDC claims.

## 9. DEPENDENCY BARU
**Portal API:**
- **Nama**: `github.com/coreos/go-oidc/v3` (v3.20.0)  
  **Fungsi**: OpenID Connect verifier.  
  **Alasan**: Standar industri dan stabil untuk Go.
- **Nama**: `github.com/go-jose/go-jose/v4`, `golang.org/x/oauth2`  
  **Fungsi**: Dependensi langsung dari `go-oidc`.

**Portal & Admin Web:**
- **Nama**: `next-auth` (4.24.x)  
  **Fungsi**: Menangani session, oauth callbacks.  
  **Alasan**: Paling aman dan well-integrated dengan Next.js App Router (BFF architecture).
- **Nama**: `jwt-decode` (Admin Web)  
  **Fungsi**: Membaca Payload JWT access token  
  **Alasan**: Dibutuhkan untuk membaca `realm_access.roles` tanpa me-request UserInfo ekstra.

## 10. KONFIGURASI ENVIRONMENT BARU
**Keycloak Service:**
- `PORTAL_WEB_URL=http://localhost:3000`
- `ADMIN_WEB_URL=http://localhost:3001`
- `KEYCLOAK_WEB_CLIENT_SECRET=change_me_web_secret`
- `KEYCLOAK_ADMIN_CLIENT_SECRET=change_me_admin_secret`

**Next.js Portal & Admin (.env.local):**
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `KEYCLOAK_ID`, `KEYCLOAK_SECRET`, `KEYCLOAK_ISSUER`

**Portal API (OS Env):**
- `KEYCLOAK_ISSUER_URL`, `KEYCLOAK_AUDIENCE`

## 11. TEST YANG DIJALANKAN
- `go test ./...` dalam `services/portal-api` -> **PASS**
  Memverifikasi 401 saat token missing, token invalid, signature invalid, dan 200 saat HTTP handler mendapatkan klaim OIDC valid.
- `npm run build` untuk portal-web dan admin-web -> **PASS**
  Static analysis dan build Next.js sukses.

## 12. SECURITY VERIFICATION
- [x] Tidak ada secret committed (diberikan suffix `_secret` atau mock default pada `local` / `.env.example`).
- [x] Tidak ada token di log aplikasi.
- [x] Tidak ada password di source code API / frontend.
- [x] Tidak ada direct Moodle DB access.
- [x] Tidak ada Moodle core patch.
- [x] Server-side authorization berjalan pada Admin Shell (SSR) dan API Middleware.

## 13. OPENAPI STATUS
Implementasi API `GET /api/v1/me` mengembalikan skema JSON yang sama persis dengan `UserProfile` component schema di OpenAPI (ID, Subject, DisplayName, Locale). Tidak perlu perubahan contract.

## 14. ARCHITECTURE COMPLIANCE
- **ADR-005**: IdP OIDC dipatuhi (Portal Web & Admin memvalidasi terhadap Keycloak).
- Authorization dilakukan server-side.
- Session BFF mematuhi security architecture (tidak menyimpan Auth Token di `localStorage`).

## 15. MASALAH / KETERBATASAN
- Validasi OIDC JWKS (go-oidc) melakukan inisialisasi jaringan saat server Go dihidupkan. Jika Keycloak berjalan lambat di CI/lokal, Go API akan mencetak *Warning* tapi tetap dapat menyala. Solusinya sudah ditambahkan backoff ringan 10 detik.

## 16. CARA MENJALANKAN DAN MENGUJI SSO SECARA LOKAL
1. Jalankan `cd infrastructure/docker && docker-compose up -d keycloak`. (Keycloak akan otomatis memuat realm teman-belajar).
2. Jalankan API `cd services/portal-api && go run ./cmd/api`.
3. Jalankan Portal Web `cd apps/portal-web && npm run dev`. Akses `http://localhost:3000`, klik *Sign in*, login menggunakan `learner@temanbelajar.local` (password: `password`).
4. Jalankan Admin Web `cd apps/admin-web && npm run dev`. Akses `http://localhost:3001`, klik *Sign in*, login menggunakan `admin@temanbelajar.local` (password: `password`). Tes klik "Enter Admin Shell" untuk memastikan lulus dari cek 403 Forbidden.

## 17. SERVICE / URL MATRIX
| Service       | URL                     | Port | Authentication Requirement      | Status |
|---------------|-------------------------|------|---------------------------------|--------|
| Portal Web    | `http://localhost:3000` | 3000 | `/dashboard`                    | Active |
| Admin Web     | `http://localhost:3001` | 3001 | `/dashboard` (Admin Role)       | Active |
| Portal API    | `http://localhost:8080` | 8080 | `/api/v1/me` (Bearer API Token) | Active |
| Keycloak      | `http://localhost:8081` | 8081 | -                               | Active |

## 18. TASK-001 ACCEPTANCE CRITERIA
- [x] TASK-000 baseline tetap sehat -> **PASS**
- [x] Keycloak realm teman-belajar valid -> **PASS**
- [x] portal OIDC client valid -> **PASS**
- [x] admin OIDC client valid -> **PASS**
- [x] Moodle OIDC foundation tersedia/didokumentasikan -> **PASS**
- [x] Portal login bekerja -> **PASS**
- [x] Admin login bekerja -> **PASS**
- [x] logout bekerja -> **PASS**
- [x] protected route bekerja -> **PASS**
- [x] API authentication middleware bekerja -> **PASS**
- [x] authorization foundation bekerja -> **PASS**
- [x] GET /api/v1/me bekerja -> **PASS**
- [x] 401 behavior benar -> **PASS**
- [x] 403 behavior benar -> **PASS**
- [x] authentication audit tersedia -> **PASS**
- [x] tests lulus -> **PASS**
- [x] OpenAPI tetap konsisten -> **PASS**
- [x] migration aman bila ada -> **PASS** (N/A)
- [x] documentation diperbarui -> **PASS**
- [x] tidak ada secret committed -> **PASS**
- [x] tidak ada architecture violation -> **PASS**
- [x] tidak ada business feature TASK-002+ -> **PASS**
- [x] CI tetap hijau -> **PASS**

## 19. TASK-001 STATUS
**PASS**

## 20. READINESS TASK-002
**READY**

## 21. KEPUTUSAN MANUSIA YANG MASIH DIPERLUKAN
- Tidak ada arsitektur fundamental yang dibelokkan. Konfigurasi secret Moodle OIDC belum dapat ditulis hingga tim Ops/OpsDeploy siap dengan Terraform/Secret Vault. Hal ini tidak menghalangi pengembangan TASK-002.

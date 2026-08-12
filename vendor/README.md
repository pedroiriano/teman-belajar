# Third-Party Vendor Assets — Teman Belajar

Folder ini menampung **referensi source komersial pihak ketiga** yang dipakai sebagai sumber UI/UX.

## Registered UI Vendors

### Techwind
- Purpose: Public Portal + authenticated Learner Experience
- Technology: Tailwind CSS
- Local reference path: `vendor/ui-templates/techwind/ORIGINAL/`
- Target implementation: `apps/portal-web/`

### Cuba
- Purpose: Admin / Backoffice Experience
- Technology: Tailwind CSS
- Local reference path: `vendor/ui-templates/cuba/ORIGINAL/`
- Target implementation: `apps/admin-web/`

## Important Rules

1. Vendor source bukan source of truth produk.
2. Vendor source diperlakukan sebagai **read-only reference**.
3. Jangan mengedit file vendor sebagai cara utama membangun Teman Belajar.
4. Jangan mencampur global CSS Techwind dan Cuba.
5. Jangan memasukkan purchase code, invoice, credential, atau license key ke repository.
6. Pastikan penggunaan dan distribusi internal mengikuti lisensi yang Anda miliki.
7. Secara default folder `ORIGINAL/` diabaikan Git untuk mengurangi risiko source komersial ikut terpublikasi.
8. Implementasi produk harus berada di `apps/portal-web/` dan `apps/admin-web/`.

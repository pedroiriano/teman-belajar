# ADR-005 — Keycloak + OpenID Connect
**Status:** Accepted

## Decision
Gunakan central IdP Keycloak; portal dan Moodle menjadi client terpisah.

Portal Web, Admin Web, dan Moodle memakai tiga confidential client terpisah,
tetapi berbagi sesi browser pada realm `teman-belajar`. Aplikasi tidak berbagi
cookie, secret, atau token. Saat aplikasi belum mempunyai sesi lokal, aplikasi
memulai Authorization Code Flow; sesi Keycloak yang masih aktif menyelesaikan
flow tanpa meminta kredensial lagi.

Logout interaktif wajib memakai RP-Initiated Logout ke Keycloak. Ketiga client
mendaftarkan front-channel logout URI dan mewajibkan parameter `iss` serta
`sid`. Portal/Admin hanya menghapus cookie lokal bila issuer dan OIDC session ID
cocok dengan JWT session HttpOnly milik aplikasi. Moodle memvalidasi issuer lalu
mengakhiri session Moodle melalui API core. Logout lokal saja bukan implementasi
logout Teman Belajar yang lengkap.

Front-channel dipilih untuk baseline browser karena Portal/Admin memakai JWT
cookie tanpa server-side session store. Production lintas-site harus menguji
kebijakan third-party cookie/CSP; bila tidak reliabel, back-channel logout dan
revocable server-side session store membutuhkan ADR lanjutan.

## Security
Authorization tetap divalidasi pada masing-masing application/backend.
SSO tidak menyatukan authorization: role Portal, role Admin, dan capability
Moodle tetap diverifikasi oleh pemilik resource masing-masing.

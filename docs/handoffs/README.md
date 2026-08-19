# Engineering Handoffs

This directory contains the engineering handoff reports for each completed task in the Teman Belajar project.
A handoff report provides a summary of what was accomplished, verification results, and technical notes for developers picking up the next task.

## Directory Structure
- `TASK-XXX-HANDOFF.md`: The handoff report for a specific bounded task.

## Authority Rule

Handoff adalah catatan historis, bukan source of truth yang berdiri sendiri. Untuk Docker lokal, selalu baca `docs/governance/DOCKER-LOCAL-ENVIRONMENT.md` dan handoff terbaru. Nama/perintah Docker pada handoff lama dianggap superseded bila berbeda dari registry kanonis.

Untuk perubahan UI, `docs/design-system/*` adalah source of truth. Mulai
`TASK-003E`, kontrak tema terang/gelap di
`docs/design-system/THEME-INTEGRATION-RULES.md` wajib dibaca sebelum menyentuh
shell, warna, token, atau komponen Portal/Admin.

Untuk frontend runtime, `TASK-003F` menggantikan catatan dependency lama:
Portal dan Admin wajib memakai Next.js `16.3.0`, React/React DOM `19.2.8`, Node
`22`, ESLint flat config, dan async request APIs. Jangan menyalin perintah
`next lint` atau tipe synchronous `params/searchParams/cookies` dari handoff lama.

Untuk baseline UI terbaru, baca `TASK-007R-UI-APPENDIX.md`. Appendix tersebut
menggantikan asumsi bahwa tema terang/gelap saja sudah cukup untuk menyatakan
Portal sesuai Techwind atau Admin sesuai Cuba. Gunakan matriks implementasi di
`docs/design-system/COMPONENT-INVENTORY.md` sebagai daftar pemeriksaan wajib.

Untuk Unified Search, `TASK-007R-HANDOFF.md` dan ADR-014 menggantikan klaim
kelengkapan pada `TASK-007-HANDOFF.md`. Worker kanonis berada di
`services/portal-api/cmd/search-worker`; kontrak API bertipe dan source
isolation tidak boleh diturunkan ke implementasi TASK-007 lama.

Untuk Engagement Platform dan aturan lintas-agent terbaru, baca
`TASK-008-HANDOFF.md`, ADR-015, root `GEMINI.md`, dan
`docs/governance/AI-AGENT-ALIGNMENT.md`. TASK-008 mengaktifkan engagement hanya
untuk Knowledge, menggunakan OIDC `sub`, dan melarang Gemini/Codex/Antigravity
membuat struktur, service, konfigurasi, atau aturan keamanan alternatif.

Untuk cross-Portal SSO/SLO dan Portal navigation, `TASK-008A-HANDOFF.md` adalah authoritative completion record. TASK-008A is complete only for the environment actually verified; production cross-site/global SLO remains subject to its documented production readiness limitations.

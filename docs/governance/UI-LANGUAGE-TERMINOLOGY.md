# UI Language Terminology & Glossary

This is the single canonical glossary for application-controlled presentation
copy in the Teman Belajar Portal and Admin Web.

## Rules

1. Human-facing navigation, headings, labels, actions, validation, empty/error
   states, tooltips, and accessibility names use natural Indonesian.
2. Technical contracts remain English: routes, query parameters, JSON/database
   fields, functions, classes, event names, role identifiers, and vendor/product
   proper nouns are not translated.
3. User-generated and editorial content is displayed as authored.
4. Admin tables and pagination follow the Cuba-derived pattern; Portal remains
   Techwind-derived. The two theme foundations must not cross-import.
5. Run `node scripts/verify-ui-language-contract.mjs` after changing UI copy.

## Core Terms

| Technical/source term | Indonesian display | Internal exemption |
| --- | --- | --- |
| Admin Console | Panel Administrasi | `/dashboard` unchanged |
| Dashboard | Dasbor | component/route identifiers unchanged |
| Workspace | Ruang Kerja | internal identifiers unchanged |
| Media Library | Pustaka Media | `/dashboard/media` unchanged |
| Taxonomy | Taksonomi | API/schema identifiers unchanged |
| Learning Experience | Pengalaman Belajar | product architecture terms may remain technical in docs |
| Workflow | Alur Kerja | event `content.workflow` unchanged |
| Preview | Pratinjau | source identifiers unchanged |
| Draft | Draf | status `draft` unchanged |
| Review | Tinjau / Peninjauan | status `in_review` unchanged |
| Published | Terbit | status `published` unchanged |
| Upload / Download | Unggah / Unduh | HTTP and function identifiers unchanged |
| Save / Cancel | Simpan / Batal | function identifiers unchanged |
| Active / Disabled | Aktif / Nonaktif | status identifiers unchanged |
| Caption | Keterangan | database field `caption` unchanged |

## Notification Terms

| Technical/source term | Indonesian display | Internal exemption |
| --- | --- | --- |
| Notification | Notifikasi | package/table/JSON identifiers unchanged |
| Notification Center | Pusat Notifikasi | route identifiers unchanged |
| Unread / Read | Belum Dibaca / Sudah Dibaca | `read_at` unchanged |
| Mark as read | Tandai sebagai sudah dibaca | function/API identifiers unchanged |
| Mark all as read | Tandai semua sudah dibaca | function/API identifiers unchanged |
| Preferences | Pengaturan Notifikasi | event types unchanged |

## Tables and Pagination

| Source term | Indonesian display |
| --- | --- |
| Previous / Next | Sebelumnya / Berikutnya |
| Loading | Memuat data… |
| No data available | Belum ada data. |
| No results found | Tidak ada data yang sesuai dengan pencarian. |
| Showing X–Y of Z entries | Menampilkan X–Y dari Z data |
| Rows per page | Data per halaman |

Technical standards and product names such as API, URL, HTTP, JSON, JSON-LD,
SEO, Open Graph, OAuth, OIDC, SSO, OpenAPI, Next.js, React, PostgreSQL, Redis,
MinIO, Meilisearch, Keycloak, Moodle, Docker, Prometheus, Grafana, Loki, Tempo,
Webhook, WebSocket, UUID, and SHA-256 remain unchanged.

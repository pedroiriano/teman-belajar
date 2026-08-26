# UI Language Terminology & Glossary

This document governs the official Indonesian translation terms used across Teman Belajar (Portal and Admin Web) to maintain consistency and enforce a professional, human-facing UI.

## General Principles
1. **Human-Facing UI = Bahasa Indonesia**: All presentation copy (navigation, buttons, modals, empty states) must be in standard Indonesian.
2. **Technical Identifiers = Unchanged**: Do not translate variables, API routes, JSON keys, CSS classes, roles (e.g. `Portal Administrator`), or technical metrics.
3. **Admin Tables = Cuba Aligned**: Admin Data Tables and Pagination must follow the Cuba layout and behavior.

## Core Terminology Mapping

| Source Term (English) | Target Display (Indonesian) | Context / Component | Exemption / Unchanged Internal |
| --- | --- | --- | --- |
| Admin Console | Panel Administrasi | Branding, header, navigation | Route `/dashboard` unchanged |
| Workspace | Ruang Kerja | Shell group title | - |
| Media Library | Pustaka Media | Sidebar, page title | Route `/dashboard/media` unchanged |
| Dashboard | Dasbor | Main landing | Route `/dashboard` unchanged |
| Learning Experience | Pengalaman Belajar | Portal slogan/brand | - |
| Workflow editorial | Alur Kerja Editorial | Admin instructions | - |
| Search | Cari | Input placeholders | Query param `?search=` unchanged |
| Taxonomy & SEO | Taksonomi & SEO | Navigation | Route `/dashboard/taxonomy` unchanged |

## Actions & Status

| Source Term | Target Display | Context / Component |
| --- | --- | --- |
| Preview | Pratinjau | Link, Button |
| Draft | Draf | Status badge |
| Review | Tinjau / Peninjauan | Button, Status |
| Published | Terbit | Status badge |
| Archive | Arsipkan | Action Button |
| Create | Tambah / Buat | Button |
| Edit | Ubah / Sunting | Action Link |
| Save | Simpan | Button |
| Cancel | Batal | Button |
| Delete | Hapus | Button |

## Admin Data Tables & Pagination Terminology

| Source Term | Target Display | Context / Component |
| --- | --- | --- |
| Previous | Sebelumnya | Pagination control |
| Next | Berikutnya | Pagination control |
| Loading... | Memuat data... | Table state |
| No data available | Belum ada data. | Table empty state |
| No results found | Tidak ada data yang sesuai dengan pencarian. | Search empty state |
| Showing X to Y of Z entries | Menampilkan X–Y dari Z data | Pagination info |

## Technical Exemptions
The following terms remain in English because they are recognized technical standards or have no clear, natural Indonesian equivalent that preserves their technical meaning:
- API, URL, HTTP/HTTPS, JSON, JSON-LD
- SEO, Open Graph, OAuth, OIDC, SSO, OpenAPI
- Next.js, React, PostgreSQL, Redis, MinIO, Meilisearch, Keycloak, Moodle, Docker, Prometheus, Grafana, Loki, Tempo
- Webhook, WebSocket, UUID, SHA-256

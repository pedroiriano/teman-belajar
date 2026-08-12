# 03 — Software Requirements Specification

**Product:** Teman Belajar  
**Repository:** `teman-belajar`  
**Product Type:** Enterprise Digital Learning Experience Platform (LXP + LMS)

**Status:** Canonical  
**Version:** 1.0

## 1. Functional Requirements

### Authentication & Identity
FR-AUTH-001 Sistem menggunakan OIDC Authorization Code Flow + PKCE.
FR-AUTH-002 User dapat login/logout terpusat.
FR-AUTH-003 Session expiry dan re-authentication mengikuti policy IdP.
FR-AUTH-004 Role/scopes divalidasi server-side.
FR-AUTH-005 Login, logout, failure dan privilege change diaudit.

### CMS
FR-CMS-001 CRUD page, news, announcement.
FR-CMS-002 Mendukung draft/review/published/archived.
FR-CMS-003 Mendukung scheduled publish.
FR-CMS-004 Mendukung category/tag.
FR-CMS-005 Mendukung SEO metadata.
FR-CMS-006 Semua perubahan penting menyimpan actor dan timestamp.

### Knowledge
FR-KNW-001 CRUD knowledge article.
FR-KNW-002 Revision history wajib.
FR-KNW-003 Reviewer/approval workflow.
FR-KNW-004 Related content.
FR-KNW-005 Bookmark/rating.
FR-KNW-006 Last reviewed date.

### Media
FR-MED-001 Upload asset melalui object storage.
FR-MED-002 Metadata disimpan di portal DB.
FR-MED-003 File type/size validation.
FR-MED-004 Gallery mengelompokkan asset.
FR-MED-005 Video dapat menggunakan hosted asset atau approved external URL.

### Moodle Integration
FR-LMS-001 Portal menampilkan course catalogue dari adapter.
FR-LMS-002 Portal menampilkan enrollment/progress.
FR-LMS-003 User mapping immutable dan auditable.
FR-LMS-004 Moodle outage tidak mematikan portal publik.
FR-LMS-005 Semua request ke Moodle memiliki timeout.
FR-LMS-006 Retry hanya untuk operasi aman/idempotent.
FR-LMS-007 Integration events deduplicated.

### Search
FR-SRC-001 Search mencakup course, knowledge, news, FAQ, page, video.
FR-SRC-002 Mendukung filter content type/category/tag.
FR-SRC-003 Query dan zero-result dapat dicatat dengan privacy control.
FR-SRC-004 Index update melalui event/job.

### Admin
FR-ADM-001 Admin UI tunduk pada RBAC.
FR-ADM-002 Privileged action diaudit.
FR-ADM-003 Role mapping tidak dapat diubah user non-authorized.
FR-ADM-004 Admin dapat melihat sync health tanpa melihat secret.

## 2. Non-Functional Requirements

### Security
NFR-SEC-001 TLS wajib pada non-local.
NFR-SEC-002 Secret tidak disimpan di Git.
NFR-SEC-003 OWASP-aligned input/output control.
NFR-SEC-004 Rate limit endpoint sensitif.
NFR-SEC-005 Audit log append-oriented dan protected.
NFR-SEC-006 SAST, dependency, secret dan container scanning ada di CI.

### Performance
NFR-PERF-001 Target API P95 untuk endpoint portal non-integrasi: <500 ms pada baseline load.
NFR-PERF-002 Endpoint agregasi Moodle memiliki budget terpisah dan caching.
NFR-PERF-003 Image responsive/lazy-loaded.
NFR-PERF-004 Search P95 target <750 ms pada baseline dataset.

Angka wajib divalidasi melalui performance test sebelum production.

### Availability & Resilience
NFR-AVL-001 Portal public plane independen dari Moodle availability.
NFR-AVL-002 Health/readiness endpoint tersedia.
NFR-AVL-003 External calls memiliki timeout.
NFR-AVL-004 Background jobs retry dengan backoff dan dead-letter handling.
NFR-AVL-005 Critical integration menggunakan idempotency/deduplication.

### Maintainability
NFR-MNT-001 Boundary module jelas.
NFR-MNT-002 Business logic tidak berada di transport handler.
NFR-MNT-003 Public contract didokumentasikan OpenAPI.
NFR-MNT-004 Architecture change tercatat ADR.
NFR-MNT-005 Coverage difokuskan ke critical domain behavior, bukan angka coverage semata.

### Accessibility
NFR-A11Y-001 Target WCAG 2.2 AA untuk portal custom.
NFR-A11Y-002 Keyboard navigation.
NFR-A11Y-003 Visible focus.
NFR-A11Y-004 Semantic landmark.
NFR-A11Y-005 Alt text/label.
NFR-A11Y-006 Reduced-motion preference.

### Observability
NFR-OBS-001 Structured logs.
NFR-OBS-002 Trace/correlation ID.
NFR-OBS-003 Metrics untuk latency, error, throughput.
NFR-OBS-004 Moodle adapter metrics.
NFR-OBS-005 Alert pada threshold yang disepakati.

## 3. Data Requirements

DR-001 Portal dan Moodle menggunakan database ownership terpisah.
DR-002 Foreign key digunakan bila sesuai.
DR-003 Schema change melalui migration.
DR-004 Public entity ID tidak mengandalkan sequential ID yang mudah ditebak.
DR-005 PII minimal dan purpose-bound.
DR-006 Retention policy ditetapkan per kategori data sebelum production.

## 4. External Interface Requirements

- OIDC IdP
- Moodle Web Services / plugin endpoints
- SMTP/email provider
- Object storage
- Search engine
- Observability collector
- Optional external notification gateway

## 5. System Constraints

- Deployment containerized.
- Stateless web/API where practical.
- Database/stateful service dikelola terpisah.
- Semua environment memiliki konfigurasi dan secret terisolasi.

### Vendor UI Integration

NFR-UI-001 Techwind hanya digunakan untuk Public/Learner experience.  
NFR-UI-002 Cuba hanya digunakan untuk Admin/Backoffice.  
NFR-UI-003 Tidak boleh cross-import global theme kedua vendor.  
NFR-UI-004 Implementasi final harus menghapus demo/vendor branding.  
NFR-UI-005 Vendor dependency yang dipakai harus inventory dan security-reviewed.  
NFR-UI-006 Shared UI hanya semantic/neutral primitive yang tidak mengikat dua theme.

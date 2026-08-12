# Product Identity & Naming Convention — Teman Belajar

**Status:** Canonical Governance  
**Version:** 2.0

## 1. Product Definition

**Teman Belajar** adalah **Enterprise Digital Learning Experience Platform (LXP + LMS)** yang menghadirkan portal pembelajaran modern, Knowledge Hub, informasi dan media edukasi, pengalaman belajar personal, serta Moodle sebagai Learning Management Engine yang terintegrasi melalui Single Sign-On dan API.

Nama resmi produk adalah **Teman Belajar**.

## 2. Naming Registry

| Scope | Canonical Name |
|---|---|
| Product | `Teman Belajar` |
| Repository | `teman-belajar` |
| Technical slug | `teman-belajar` |
| Portal web service | `teman-belajar-web` |
| Admin web service | `teman-belajar-admin` |
| API service | `teman-belajar-api` |
| Worker service | `teman-belajar-worker` |
| Portal database | `teman_belajar` |
| Keycloak realm | `teman-belajar` |
| Portal OIDC client | `teman-belajar-web` |
| Admin OIDC client | `teman-belajar-admin` |
| Moodle OIDC client | `teman-belajar-moodle` |
| Moodle plugin component | `local_temanbelajar` |
| OpenAPI title | `Teman Belajar API` |
| Docker Compose project | `teman-belajar` |
| Default telemetry service prefix | `teman-belajar-` |

## 3. Naming Rules

1. Jangan mengganti nama produk menjadi `Learning Platform`, `Learning Buddy`, `Portal Belajar`, atau nama generik lain.
2. Nama generik boleh dipakai sebagai **deskripsi**, bukan identitas produk.
3. Source code menggunakan slug ASCII/lowercase.
4. Database menggunakan snake_case bila diperlukan.
5. Service menggunakan kebab-case.
6. Moodle component mengikuti Moodle plugin naming convention.
7. Environment suffix diperbolehkan: `teman-belajar-api-staging`, `teman-belajar-api-prod`.
8. Jangan hard-code hostname/domain production sebelum domain resmi ditetapkan.

## 4. Product Copy

### Formal
**Teman Belajar — Enterprise Digital Learning Experience Platform**

### Short
**Teman Belajar**

### Internal Technical Description
**Composable LXP + Moodle LMS**

## 5. Naming Change Governance

Perubahan nama produk adalah product-level breaking decision dan wajib:
- human approval;
- impact analysis;
- ADR atau governance record;
- update semua client/service/database/telemetry naming yang terdampak.

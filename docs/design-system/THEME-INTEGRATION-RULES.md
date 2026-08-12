# Theme Integration Rules — Teman Belajar

**Status:** Canonical UI Governance  
**Version:** 3.0

## 1. Techwind Boundary

Techwind hanya menjadi visual foundation untuk:
- `apps/portal-web/`
- public pages;
- authenticated learner experience.

Jangan import stylesheet/theme Techwind ke `apps/admin-web`.

## 2. Cuba Boundary

Cuba hanya menjadi visual foundation untuk:
- `apps/admin-web/`
- backoffice/admin experience.

Jangan import stylesheet/theme Cuba ke `apps/portal-web`.

## 3. Shared UI

`packages/ui/` hanya menampung primitive netral yang benar-benar aman dipakai lintas experience, misalnya:
- product logo wrapper;
- accessibility utilities;
- status badge semantic;
- loading;
- error/empty state;
- shared icon abstraction;
- progress semantic component.

## 4. Tailwind Governance

- Portal dan Admin boleh memiliki Tailwind preset/config berbeda.
- Jangan merge seluruh vendor Tailwind config secara buta.
- Audit plugin/dependency vendor sebelum dipakai.
- Gunakan product semantic tokens untuk branding.
- Purge/content paths harus hanya mencakup source yang diperlukan.

## 5. shadcn/ui Policy

`shadcn/ui` **bukan visual foundation utama**.

Boleh digunakan secara selektif bila:
- vendor tidak menyediakan primitive yang diperlukan;
- accessibility/behavior lebih baik;
- style dapat diselaraskan dengan Teman Belajar;
- tidak menyebabkan third visual language.

Penambahan komponen shadcn yang material harus dijelaskan di PR.

## 6. Vendor Copy Policy

Dilarang:
- copy semua vendor demo;
- mempertahankan lorem ipsum/demo credentials;
- mempertahankan vendor logo/branding;
- menyalin page yang tidak masuk feature catalogue.

Wajib:
- adapt only what is used;
- rename berdasarkan domain Teman Belajar;
- test responsive/accessibility;
- remove unused dependency/assets.

## 7. Upgradeability

Vendor source tetap read-only agar:
- dapat dibandingkan dengan implementasi;
- upgrade vendor dapat dinilai;
- customization produk tidak hilang saat vendor update.

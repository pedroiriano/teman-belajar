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

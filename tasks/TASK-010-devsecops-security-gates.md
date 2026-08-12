# TASK-010 — DevSecOps Security Gates
**Owner Agent:** Security/DevOps Agent  
**Dependencies:** TASK-000

## Objective
Menambahkan automated security gates ke CI.

## Acceptance Criteria
- AC-01 Secret scanning berjalan pada PR.
- AC-02 Dependency scanning berjalan.
- AC-03 SAST berjalan.
- AC-04 Container image scanning berjalan bila image dibangun.
- AC-05 Critical finding memblokir merge.
- AC-06 High finding memblokir kecuali accepted risk process.
- AC-07 Scan result tidak membocorkan secret.

## Definition of Done
Policy, exception process dan ownership documented.

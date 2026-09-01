# TASK-022 Threat Model — Media Gallery & Video Hub

| Threat | Control | Verification |
|---|---|---|
| Draft/unpublished disclosure | Public repository predicates collection `published` and asset `active` | public visibility tests |
| Storage metadata leak | Response DTO and fixed SQL projection omit bucket, key, checksum, raw URL | contract/raw-key negative test |
| Unauthorized curation | Existing-role, deny-by-default server authorization plus workflow-specific service checks | handler/service negative tests |
| HTML/script injection | Bounded plain-text fields reject markup/control characters; React escapes output | validation/security tests |
| Malicious or mismatched upload | Authoritative Media policy validates extension, magic MIME, and actual length | policy tests |
| Lost update/race | Optimistic version predicate and transactional item replacement | conflict/integration tests |
| Broken archived reference | Public eligibility checks owner lifecycle and UI renders deterministic fallback | archive/fallback tests |
| Enumeration/resource exhaustion | UUID/slug bounds, 128 KiB writes, page size 50, items 100, fixed queries | handler/domain tests |

Residual operational risk is limited to direct object delivery of bounded MP4
and WebM files. Adaptive streaming and transcoding remain explicitly out of scope.

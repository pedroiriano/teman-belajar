# TASK-011A Threat Model — Authoring Drafts

| Threat | Control | Residual risk |
|---|---|---|
| Another user reads a draft on a shared browser/API | PostgreSQL queries bind validated OIDC `sub`; IndexedDB keys include session `actorId`; 404 hides existence | Browser profile compromise remains outside application isolation |
| Reviewer bypasses hidden UI | Go handler independently requires Content Editor or Portal Administrator; direct-API regression test | Realm role administration remains governed by finalized Identity boundary |
| Stale tab silently overwrites newer work | Expected draft revision and canonical base version; 409 plus explicit recovery choice | Human may choose the older version deliberately |
| Create drafts collapse into one | Random stable UUID per intentional draft; multiple create rows allowed | Authors must label/recognize drafts by content/time until a future draft index UI |
| Edit drafts fork ambiguously | Unique owner + entity type + entity ID and API conflict response | Reassigning content ownership is not part of this task |
| Secret/token/raw file enters payload | Explicit form/field registry, sensitive-key scan, type/length bounds, private credential URL detection; Media IDs only | Secrets pasted into ordinary prose without a recognizable marker require human incident handling |
| Oversized or binary payload exhausts resources | BFF byte cap, API MaxBytesReader, 256 KiB domain/database cap, string/UUID-list-only fields | Many valid writes can still consume capacity; retention and rate-limit readiness remain relevant |
| Draft body leaks through logs/audit | Logs/audit store lifecycle IDs/revisions only; problems do not echo invalid payload | Database operators with direct privileged access remain trusted operators |
| Server outage loses work | IndexedDB written before server attempt; visible local-only state and retry | Private/incognito storage eviction cannot be prevented |
| IndexedDB copy survives logout for a different user | Per-sub storage namespace and session-bound lookup | Old encrypted browser profile data remains until recovery/finalization/retention cleanup by that user |
| Expired data accumulates | Indexed expiry filter plus bounded lazy cleanup and expiry index | No background scheduler means cleanup rate follows draft traffic |
| Final save succeeds but draft cleanup fails | Explicit finalized delete and retry-safe 404 handling; stale copy remains non-canonical | Cleanup is not in the same database transaction as every existing content service |
| XSS reads form content | Existing CSP/output controls; React escaping; no token stored with draft | A same-origin XSS can access IndexedDB and current form state; security gates remain mandatory |

## Explicit residual decisions

TASK-011A does not add a scheduler, queue, service worker background sync,
collaborative editor, CRDT/OT engine, encryption dependency, or new Compose
service. Drafts remain working copies, never publication records. Final CMS and
Knowledge workflow authorization remains authoritative.

# TASK-004E Threat Model — Integrated Media Management

| Threat | Control | Residual risk |
|---|---|---|
| Executable/SVG/unknown upload | Extension allowlist plus server magic allowlist | Novel parser/polyglot behavior requires future malware scanning review |
| `photo.jpg` containing PDF | Extension↔magic MIME equality | Magic checks identify format signatures, not malicious document content |
| Oversized request/object | 32 MiB request cap, type-specific limited stream, post-write stat and compensation | Reverse proxy must retain an equal or lower request limit in production |
| Decompression/pixel bomb | Server never decodes/transcodes images; client compression is bounded | A permitted small compressed file can still have extreme dimensions; browser preview remains a client resource risk |
| Path traversal/header injection | Random object key; reject separators/control/CRLF; encoded Content-Disposition | Unicode spoofing remains possible in a display label |
| MIME sniff/XSS | Exact Content-Type, `nosniff`, images-only inline, PDF attachment | PDF viewer/application security is outside this service |
| Private media disclosure | Public endpoint checks status, usage, and published owner; Admin endpoint requires OIDC | Incorrect owner publication data could grant eligibility |
| Reviewer privilege escalation | Server claims-context role gate on every mutation; bypass regression test | Realm role administration remains governed by finalized Identity boundary |
| Storage/DB split brain | Random key, streaming checksum, post-write stat, deterministic delete on DB failure | Delete compensation can fail during storage outage and requires reconciliation tooling later |
| Rename moves/replaces bytes | Metadata-only `display_filename`; immutable storage interface has no move operation | Operators with direct MinIO access are outside application controls |
| SQL injection/search abuse | Static SQL, parameters, bounded query/page size, enum filter | Broad search can still consume DB resources; observe latency |
| Usage tampering | Bounded entity/role allowlist, UUIDs, idempotent unique identity, editor authorization | Polymorphic entity existence is not enforced by a foreign key |

## Explicit residual decisions

TASK-004E does not add ClamAV, content-disarm, server-side image transcoding, a new service, or new dependency. These require a future accepted architecture/security task. Until then, allowed files are treated as untrusted content, PDF is downloaded as attachment, and public access remains publication-gated.

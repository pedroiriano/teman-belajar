# mod_zoom Schema Recovery Plan

**Status:** RECOVERY PASS — OAUTH NOT CONFIGURED
**Audit date:** 2026-08-27
**Scope:** Local Docker Moodle only; `mod_zoom` v5.5.0
**Owner:** TASK-015 / Moodle Integration / Security / Operations

Owner memberi persetujuan eksekusi recovery lokal pada 2026-08-27. Prosedur
selesai tanpa penghapusan volume, perubahan Moodle core, atau perubahan
Keycloak/SSO. Bagian audit awal dipertahankan sebagai baseline historis.

## Execution Record — 2026-08-27

- Preflight mengonfirmasi `mod_zoom` v5.5.0, disk/database version
  `2026041600`, nol activity, dan OAuth Account ID/Client ID/Client Secret tidak
  dikonfigurasi; nilai secret tidak dibaca atau dicetak.
- Backup database serta dua volume Moodle dibuat di direktori lokal di luar
  repository, dienkripsi dengan Windows EFS AES-256, memiliki checksum/size
  manifest, dan terverifikasi melalui `pg_restore --list` serta `tar --list`.
  Retention berakhir 2026-09-26.
- Artifact resmi tag `v5.5.0` commit
  `2f1e5a88cd1e5f1d8cc9b9300990887764801821` memakai SHA-256
  `6d9d094d1b4eb8c295de2395b153d5096b718ba3a9dba4fb725fca7ff5580445`.
- Maintenance mode aktif dan `moodle-cron` berhenti selama official
  `uninstall_plugins.php --plugins=mod_zoom --run` serta install/upgrade.
- Moodle schema check setelah recovery tidak lagi melaporkan salah satu dari
  sepuluh tabel `zoom*`. Dua tabel `enrol_apply` tetap missing dan tidak disentuh.
- Enam scheduled task `mod_zoom` enabled dengan `fail_delay=0`; targeted task
  `send_ical_notifications` selesai dalam kondisi feature disabled.
- Kebijakan akhir `viewrecordings=0`, `recordingoption=0`, dan
  `allowrecordingchangeoption=1` mempertahankan recording opt-in.
- Moodle dan `moodle-cron` kembali sehat setelah maintenance dinonaktifkan.
- Source plugin kini dipasang reproducibly oleh Dockerfile dengan checksum
  artifact resmi yang sama.

Recovery data/schema adalah PASS. Koneksi provider dan live lifecycle masih
`BLOCKED_CREDENTIALS` sampai OAuth Server-to-Server dan prasyarat komersial/
compliance tersedia.

## 1. Audit Result

Audit memakai Moodle/plugin APIs, official read-only CLI, Compose wrapper
helper, serta filtered cron logs. Tidak ada query langsung ke Moodle database.

| Check | Current evidence | Result |
|---|---|---|
| Runtime | Moodle 5.2.2 build `20260810`; Moodle/moodle-db healthy | PASS baseline |
| Plugin ledger | `mod_zoom` release v5.5.0; disk/database version `2026041600`; status `uptodate` | PASS ledger, misleading for schema |
| Plugin source | Present at `/var/www/html/public/mod/zoom`; aggregate source fingerprint `6ad705dfb5d1379b026eedc0a1c1be352a701725d45f8f240df7b2b5f674a4a9` | PASS current volume only |
| Reproducibility | `mod_zoom` source/archive/version lock is not tracked by the repository or Moodle Dockerfile | FAIL |
| Schema | All ten tables declared by `mod_zoom/db/install.xml` are missing | FAIL critical |
| Zoom credential presence | Account ID, Client ID, and Client Secret all unconfigured; values were not read or printed | BLOCKED configuration |
| Feature settings | `showwebinars=2`, `defaultregistration=2`, `viewrecordings=0` | Informational; not proof of connection |
| Existing activities | Moodle API reports `zoom_course_module_count=0` | PASS recovery precondition |
| Scheduled tasks | Six `mod_zoom` tasks exist, enabled, and report `fail_delay=0` | PARTIAL; tasks can no-op without schema/credential |
| Recent cron | `send_ical_notifications` completed; no recent Zoom failure in filtered tail | PARTIAL; not an end-to-end test |
| External functions | Only `mod_zoom_get_state` and `mod_zoom_grade_item_update`, both assigned to `moodle_mobile_app` | FAIL TASK-015 contract |
| Official uninstall dry-run | `Will be uninstalled: mod_zoom Zoom meeting`; `--run` was not used | PASS target resolution |

Missing `mod_zoom` tables:

1. `zoom`
2. `zoom_meeting_details`
3. `zoom_meeting_participants`
4. `zoom_meeting_tracking_fields`
5. `zoom_meeting_recordings`
6. `zoom_meeting_recordings_view`
7. `zoom_meeting_breakout_rooms`
8. `zoom_breakout_participants`
9. `zoom_breakout_groups`
10. `zoom_ical_notifications`

The same schema check also reports missing `enrol_apply_applicationinfo` and
`enrol_apply_groups`. That is a separate plugin drift. It is explicitly out of
scope and must not be repaired, uninstalled, recreated, or hidden by this plan.

## 2. Root Cause Assessment

Moodle believes `mod_zoom` is fully installed because disk version and database
ledger version are equal. The physical tables expected by the same plugin
version are absent. Consequently, a normal `admin/cli/upgrade.php` sees no
version transition and is not expected to recreate `install.xml` tables.

The exact historical action that removed or failed to create the tables is not
proven. Do not attribute the drift to a user, migration, image rebuild, or
plugin bug without additional evidence.

Secondary readiness gaps:

- Zoom Server-to-Server OAuth is not configured;
- current plugin source survives only in `teman-belajar-moodle-app-data` and is
  not reproducibly installed by the Docker build;
- existing `mod_zoom` Web Services do not expose the TASK-015 server contract;
- enabled scheduled tasks and successful no-op cron runs do not prove report,
  registration, attendance, or recording behavior.

## 3. Recommended Recovery Strategy

For this empty and unconfigured local plugin state, use Moodle's official
plugin uninstall followed by install from the same approved, pinned v5.5.0
source. This resets plugin ledger/config/task metadata and lets Moodle create
the complete schema from `install.xml`.

This strategy is recommended only because all of these invariants currently
hold:

- zero Zoom course-module references;
- zero configured Zoom credentials;
- no recoverable `mod_zoom` table data exists because every declared table is
  absent;
- dry-run resolves the exact component `mod_zoom` only.

### Rejected alternatives

- **Manual `CREATE TABLE` or direct Moodle SQL:** forbidden; bypasses Moodle's
  plugin lifecycle and can diverge from keys, indexes, and future upgrades.
- **Edit plugin version/ledger to force upgrade:** falsifies version history and
  can execute non-install upgrade steps against an unknown schema.
- **Downgrade then upgrade:** unsupported and can introduce incompatible data or
  code paths.
- **Delete/recreate Moodle volumes:** overly destructive and outside scope.
- **Run `moodle-reconcile` or `upgrade.php` alone:** equal disk/database versions
  do not trigger a fresh plugin install.
- **Ignore schema check because container is healthy:** HTTP health does not
  exercise activity CRUD, reports, registration, or recording.

## 4. Approval Gate Outcome

- [x] explicit approval to execute the scoped local `mod_zoom` recovery;
- [x] recovery owner and local maintenance window recorded;
- [x] approved backup directory outside source-controlled paths, sufficient
  free space, encryption/access owner, and retention/deletion date;
- [x] verified backup and restore commands for exact database and volumes;
- [x] approved immutable v5.5.0 source artifact, upstream URL, SHA-256, license,
  and reproducible Docker installation approach;
- [x] confirmation that `zoom_course_module_count` remains zero immediately
  before uninstall;
- [ ] Zoom tenant/plan, account owner, cost cap, data region/DPA, peak capacity,
  recording storage, and granular OAuth scopes;
- [x] `moodle-reconcile` explicitly excluded because it can repair Moodle
  administrator/account state governed by the finalized Identity boundary;
- [x] unrelated `enrol_apply` drift remained excluded.

If course-module count becomes nonzero, credentials become configured, or any
plugin table reappears before execution, stop and redesign the plan around data
export/preservation. Do not continue with uninstall/reinstall assumptions.

## 5. Backup Plan

All targets must be resolved by exact name before capture:

- PostgreSQL database owned by `teman-belajar-moodle-db-data`;
- `teman-belajar-moodle-app-data` containing Moodle/plugin source and config;
- `teman-belajar-moodle-data` containing Moodle dataroot.

Approved execution must:

1. record current Git SHA, image ID, Moodle/plugin versions, plugin fingerprint,
   schema output, task state, credential-presence booleans, and zero activity
   invariant;
2. enable Moodle maintenance mode and stop `moodle-cron` to stop scheduled
   writers;
3. create a PostgreSQL custom-format dump with PostgreSQL 16.14 `pg_dump`;
4. archive both exact Moodle volumes while writers are stopped;
5. calculate SHA-256 and record byte size for every backup artifact;
6. verify the database archive with `pg_restore --list` and both tar archives
   with `tar --list` before any uninstall;
7. keep secrets out of command output, filenames, logs, and the repository.

No volume deletion, prune, wildcard target, or database overwrite is part of
backup creation.

## 6. Recovery Procedure — Executed Locally; Re-approval Required for Re-run

Run every Docker action through
`infrastructure/docker/teman-belajar-docker.ps1` or its loaded
`Invoke-Compose` helper. Do not use legacy `docker-compose`.

1. Re-run the complete read-only audit and compare all invariants.
2. Complete and validate the backup plan above.
3. Keep Moodle in maintenance mode and `moodle-cron` stopped.
4. Re-run the official dry-run:

   ```text
   php admin/cli/uninstall_plugins.php --plugins=mod_zoom
   ```

5. Only after an explicit final go/no-go approval, execute the same exact target
   with `--run`. Do not include another plugin:

   ```text
   php admin/cli/uninstall_plugins.php --plugins=mod_zoom --run
   ```

6. Confirm the source directory still matches the approved v5.5.0 artifact and
   fingerprint. If it is missing or changed, stop; do not download an unpinned
   replacement during recovery.
7. Run Moodle's official non-interactive upgrade to install `mod_zoom` from its
   source and create `install.xml` schema.
8. Run `check_database_schema.php`; all ten `zoom*` findings must disappear.
   Report the unrelated `enrol_apply` findings separately rather than masking
   them.
9. Confirm plugin status/version, all ten tables, six scheduled tasks, and zero
   unexpected course-module references.
10. Configure Zoom Server-to-Server OAuth through the approved secret path.
    Never commit or print Account ID, Client ID, or Client Secret.
11. Grant only the approved granular scopes required for meeting/webinar CRUD,
    participant reports, registrations, and opt-in recordings.
12. Run the plugin connection check and targeted scheduled tasks. Validate that
    failures are observable and secrets are redacted.
13. Run a disposable Moodle course/activity test: create meeting, authorized
    learner registration/join, cancellation boundary, report synchronization,
    attendance derivation, recording opt-in visibility, and cleanup.
14. Disable maintenance mode and restart `moodle-cron` only after every gate
    passes.

Portal APIs, migrations, dan UI bukan bagian dari recovery; semuanya
diimplementasikan kemudian pada branch TASK-015 terpisah.

## 7. Verification Gates

Recovery PASS requires:

- plugin release v5.5.0 and disk/database version `2026041600` match;
- no missing or unexpected `zoom*` table/index/key finding;
- source artifact is reproducible and checksum-verified;
- scheduled tasks are enabled, run with `fail_delay=0`, and have current
  successful evidence after real fixture activity;
- Server-to-Server OAuth connection succeeds with least scopes;
- no credential/passcode appears in logs, URL, repository, or browser payload;
- Moodle capability denies unauthorized join/report/recording access;
- meeting/report/attendance/recording fixture lifecycle passes;
- full data backup remains restorable until the agreed retention date;
- unrelated `enrol_apply` drift is reported unchanged.

TASK-015 implementation remains blocked even after schema recovery until the
narrow `local_temanbelajar` Web Service contract is designed, reviewed, and
tested.

## 8. Rollback

If uninstall, install, schema verification, OAuth configuration, or fixture
test fails:

1. keep maintenance mode enabled and keep `moodle-cron` stopped;
2. capture sanitized failure evidence;
3. stop all Moodle writers;
4. restore the verified PostgreSQL dump and both exact volume archives;
5. recreate only the normal project services without deleting volumes;
6. verify plugin/version/schema/task/activity invariants against the pre-change
   record;
7. disable maintenance only after the restored baseline is confirmed;
8. record `BLOCKED_RECOVERY_FAILED` and do not attempt manual SQL repair,
   version-ledger edits, force reinstall loops, or volume reset.

## 9. Current Go/No-Go

**GO untuk schema lokal; NO-GO untuk aktivasi provider.** Backup, official
reinstall, schema, task, dan reproducible source telah lulus. OAuth credentials,
tenant/license/capacity, cost cap, DPA/data region, serta live fixture belum
tersedia. `moodle-reconcile` tidak dijalankan karena berada di luar scope dan
menyentuh Identity boundary.

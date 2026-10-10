# Required contract test matrix

This matrix defines required scenarios and contract traceability. Execution status and evidence are maintained in the [implementation roadmap](implementation-roadmap.md) and each owning closure report. Local API/PostgreSQL/worker and selected browser checks have run in the documented increments; they do not imply complete AWS, image, restore or production acceptance. AC-31/30 still require their application/image drills.

Phase 02 case IDs below are public-contract traceability, not assertions of executed tests. OpenAPI `x-cases` resolves to these IDs. Policy owners are [product](product-specification.md), [security/permissions](security-and-permissions.md), [HTTP/events](contracts/README.md) and [SLO/workload](slo-and-workload.md).

| Case ID | Owner / scenario | Required outcome | Implementation/evidence phase |
| --- | --- | --- | --- |
| AC-01 | Catalog/Assessment scoring/type/option validation | Exact set, integer points, clear/unanswered, section sum/rounding; reject duplicate/foreign/invalid keys | CAT-03/ATT scoring; pure helper partial coverage only |
| AC-02 | Catalog publish/edit/unpublish/start race | One complete frozen version; future edits never change attempt/release; archival preserves referenced snapshot | CAT-06/07/10 + ATT-10, PostgreSQL |
| AC-03 | Start duplicate/key reuse/concurrent limit | One receipt/effect; no two active attempts or limit violation; other payload conflicts | ATT-01/10, PostgreSQL + API |
| AC-04 | Resume/limit/FAILED/EXPIRED/republish | No reset clock/version/quota; replay same attempt consumes no extra slot | ATT-01/03/10, PostgreSQL + API |
| AC-05 | UTC/open/close/deadline/long lock wait | Start inside window; clipped late-entry duration; DB time after lock; exact deadline rejects save | CAT/ATT-10, PostgreSQL |
| AC-06 | Save batch/clear/mark/versions/reordered retry | All-or-nothing; mark not scoring input; original receipt cannot overwrite later answer | ATT-04/10, PostgreSQL + API |
| AC-07 | Two tabs, stale expected versions | One accepted mutation, 409/refetch/reconcile; no silent lost update | ATT-04/10 + browser |
| AC-08 | Receipt pruning/UUIDv7 clock/key conflict | Retry in window same durable outcome; old pruned key cannot become fresh mutation | [ATT-09](assessment-retention-2026-10-09.md) actual bounded Assessment prune/retry + shared receipt PostgreSQL fixtures; full other-capability/HTTP fault matrix remains open |
| AC-09 | Submit/autosave/manual/expiry races | Save committed before submit included or rejected; one stable submission/outbox | ATT-06/07/10, PostgreSQL |
| AC-10 | Commit then HTTP timeout/API restart | Same acknowledgement and durable answers; no memory-only accepted write | ATT-10/11 local26-case compiled HTTP socket/timeout/crash matrix accepted: [evidence](evidence/assessment-http-faults-2026-10-09/README.md); managed AWS/load task crash remains open |
| AC-11 | Deadline sweep/duplicate submit | Overdue attempts safely submitted/scored; expired provenance retained, one outbox | ATT-07/10 + ASYNC |
| AC-12 | Outbox broker ACK then publisher crash | Recoverable claim; same event redelivered safely | ASYNC publisher, PostgreSQL + SQS |
| AC-13 | Publisher stale lease owner/fencing | Stale owner cannot mark another claim complete; bounded retries/parked records visible | ASYNC publisher + fault injection |
| AC-14 | Duplicate events/same eventId different payload | One business effect; inconsistent identity/content quarantined | ASYNC-11, PostgreSQL + SQS |
| AC-15 | Inbox insert then result/statistic failure | All effects roll back; redelivery can complete | ASYNC-11, PostgreSQL + SQS |
| AC-16 | Poison/DLQ/FAILED/audited replay | Bounded retry, durable quarantine, replay stable submission identity, no new quota/effect | ASYNC-11 + admin/API |
| AC-17 | Commit then ACK loss/result projection atomicity | Durable result/leaderboard/statistics/inbox; duplicate ACK retry no-op; status shows durable state | ASYNC-06/07/11 + ATT-08 |
| AC-18 | Ownership/permission/path/cursor tampering | Foreign attempts/results/history 404, missing action 403, no userId/body override | ID-06/09 + CAT/ATT E2E |
| AC-19 | Frozen explanation release/redaction | No keys in candidate questions/early result/log/trace; admin access requires explicit permission/audit | CAT/ATT/browser/observability |
| AC-20 | Register/login enumeration/duplicate/password bounds | Generic outcomes, no overwrite/escalation, bounded hashing/rate-limit resources | ID-01/02/09, API + DB |
| AC-21 | Refresh rotation/race/reuse/logout/CSRF | Atomic token consumption; reused family revoked; cross-origin/forged CSRF denied; no token leak | ID-03/04/07/09 + browser |
| AC-22 | Admin bootstrap/action permissions | No public self-grant or candidate impersonation; operator grant audited | ID-08/09 + admin E2E |
| AC-23 | Import dry-run/invalid/partial failure/retry | ≤100 valid entries atomic; invalid report writes no bank rows; same key same IDs/report | CAT-05/10, PostgreSQL + API |
| AC-24 | Audit transaction/read access/failure/redaction | Admin effect and audit commit together; sensitive read fails closed if audit fails; no secret/body logging | CAT/Reporting/Security integration |
| AC-25 | Best attempt/tied score/version rankings | Version-scoped deterministic best/order/rank; duplicate/replay no second effect | ASYNC/Reporting PostgreSQL |
| AC-26 | Leaderboard opt-in/opt-out/PII/restore | Opt-out suppressed in subsequent reads; pseudonym only; restore never revives deleted opt-in | browser/Reporting + restore |
| AC-27 | Cursor/page bound/filter/watermark/payload | No OFFSET/hidden total; signed bounded cursor; byte-limited pages, no leaked rows/duplicates | CAT/ATT/Reporting integration + performance |
| AC-28 | SLO/query/pool/CPU/memory/cost populations | Measured route budgets/latencies and achieved load; valid throttling counted; no invented capacity/cost | LOAD/DB/OBS/COST experiments |
| AC-29 | Retention/backup/PITR/failover/privacy ledger | No purge of unresolved work; recovery meets measured RPO/RTO and deletion/opt-out consistency | OPS/FAIL/SEC experiments |
| AC-30 | Health/migration/old-new compatibility/drain | Minimal health, critical readiness; versioned schema migration compatible; drain recovers uncommitted work | BOOT/DB/CI/ECS failure runs |
| AC-31 | UoW joined failure/lock isolation/pool timeout | Caught joined failure remains rollback-only; no client leak/partial commit or unbounded acquire wait | DB-11 technical fixtures then ATT/ASYNC flows |
| AC-32 | Redis if evidence adds it later | Versioned key/stale bound/invalidation/stampede/fallback; no invariant authority in cache | Optional CACHE/FAIL experiments; currently absent |
| AC-33 | Email verification/activation/resend races and pre-registration | No unverified session;30min single-use token, GET inert, final email-owner password, duplicate outcome without credential rewrite, generic resend with bounds | ID-01/02/09/10, PostgreSQL + API + HTTPS browser |
| AC-34 | Asymmetric JWT substitution/key lifecycle | Wrong key/alg/kid/issuer/type/audience/use/claims rejected; refresh not access; DB revocation/current permissions; overlapping normal rotation and compromise deny | ID-03/05/09, crypto + two API instances + operational drill |
| AC-35 | Verification email intent/crash/retry/privacy | Account/challenge/intent atomic, fenced lease, no transaction during sends, duplicate mail safe, expiry/consume ciphertext cleanup, no credential leaks; SES failure/backlog visible | ID-11, PostgreSQL + loopback mailbox, AWS SES operations later |
| AC-36 | Admin best/latest selection and stable candidate pages | Exact frozen version; retained best COMPLETED by score/submit/UUID, latest submitted including pending/FAILED with null scores; current permission/version audit; grading/replay/purge and cursor preserve semantics | [REP-04 Admin subset](admin-candidate-results-2026-10-10.md), restricted PostgreSQL + compiled HTTP; AWS/privacy ledger remain separate |
| AC-37 | Admin business cohort and global durable backlog | Started-at [from,to) current state, compact purged completion counts, replay-pending/global oldest age, explicit null empty backlog; current permission/audit and atomic grading/replay/purge visibility; no fabricated SQS/HTTP telemetry | [REP-05](admin-business-metrics-2026-10-10.md), restricted PostgreSQL + compiled HTTP; load/AWS remain separate |

The older scenario-oriented matrix below remains an evidence-environment map; IDs above supply operation traceability. Treat each scenario as pending unless the owning phase records its executed checks and evidence; local and AWS acceptance remain separate.

| Capability | Failure/concurrency scenario | Required durable outcome | Evidence environment |
| --- | --- | --- | --- |
| UnitOfWork | joined write fails; caller catches it | rollback-only, neither write committed | PostgreSQL |
| Catalog | edit/publish/start concurrently | attempt binds one immutable complete version | PostgreSQL + API |
| Start | duplicate keys, key reused for another exam, concurrent starts/limit | one durable receipt/active attempt; no limit violation | PostgreSQL + API |
| Save | duplicate/reordered mutation and two tabs using same expected version | original receipt; old retry cannot revert a newer answer | PostgreSQL + API |
| Deadline | lock acquisition waits beyond deadline | no save authorized using earlier timestamp | PostgreSQL + API |
| Submit | submit and autosave concurrent; multiple submit keys | saved-before-submit included or save rejected; one accepted submission/outbox | PostgreSQL + API |
| Restart | commit then HTTP timeout/API crash/retry | same durable result; no memory-only acknowledgement | PostgreSQL + API restart |
| Publisher | broker ACK then crash before delivery mark | duplicate publish safe; recoverable lease; stable identity | PostgreSQL + SQS |
| Publisher | lease expires and stale owner marks delivery | fencing blocks stale completion | PostgreSQL + SQS |
| Inbox | concurrent duplicate deliveries | one business effect and durable duplicate confirmation | PostgreSQL + SQS |
| Grading | result write fails after inbox insert | inbox/result/projections all roll back; redelivery succeeds | PostgreSQL + SQS |
| Consumer | commit succeeds then ACK lost | retry is no-op after confirming durable result | PostgreSQL + SQS |
| Poison/DLQ | malformed/permanent failure; bounded transient retries | durable quarantine/DLQ, visible FAILED/parked and audited replay | SQS + API/admin |
| Projection | result/statistic/leaderboard update fails | no partial completed state; explicit async freshness if separate | PostgreSQL |
| Auth | refresh race/replay, revoke/logout, owner mismatch/admin escalation | agreed rotate/revoke policy; no unauthorized data | API + PostgreSQL |
| Redaction | candidate question/result before explanation release | no keys/explanations/token/SQL leaks | API/browser/log/trace |
| Migration | source schema changes and rollback prior image | report/old-new runtime compatible; checksums enforced | PostgreSQL + CI images |
| Redis, if added | failed post-commit invalidation/stale refill/cache outage | declared freshness bound, correct invariants, bounded DB fallback | PostgreSQL + Redis |
| Scaling/shutdown | task interrupted while serving/receiving | defined drain; uncommitted work recoverable | staging ECS |
| Recovery | failover/PITR/new endpoint | measured RPO/RTO, verified acknowledged outcomes | isolated AWS |

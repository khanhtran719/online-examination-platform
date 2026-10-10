# REP-01 Admin active candidate monitor

Status: **COMPLETE locally** (AM-01–06 / REP-01). Production remains NOT ACCEPTED.
[Evidence](evidence/admin-monitor-2026-10-10/README.md),
[runbook](runbooks/admin-monitor.md),
[index experiment](../experiments/admin-monitor/README.md).

## Scope and decisions before implementation

- Owner: Reporting. READ projection with mandatory transactional access audit;
  it never changes Assessment/Catalog state. Reporting's private query adapter
  declares `catalog.exams` existence and `assessment.attempts` dependencies.
- Route: `GET /v1/admin/exams/{examId}/active-candidates`, current verified/enabled
  Identity session and `reporting.read`. v1 Admin scope is all exams, including
  archived/unpublished exams and all their frozen versions. No candidate impersonation.
- Active means retained `IN_PROGRESS`, `started_at <= asOf`, `deadline > asOf`.
  CREATED is not started; overdue IN_PROGRESS is excluded even before expiry sweep.
  Disabled participants still have an active attempt: this is lifecycle monitoring,
  not presence/eligibility. No email/name/answers/keys/result/session fields.
- Primary PostgreSQL statement snapshot, database `statement_timestamp()` exposed
  as `metadata.asOf`. Fresh per page; no cache/replica/eventual projection. A later
  submit/deadline can remove a row. Pagination is a bounded live view, not a frozen
  transaction across requests or a write/authorization authority.
- Keyset order `started_at DESC, id DESC`, initial DB watermark excludes later
  starts. Opaque authenticated cursor binds actor/exam/pageSize/watermark/position,
  expires 60 seconds from first page. Domain-separated key derived from existing
  CSRF root; no new secret/AWS service. The shared cursor parameter's generic
  15-minute description needs an operation-specific override.
- Short UnitOfWork: Identity public `revalidate` (locks current actor, current
  principal), one projection statement, one safe append-only audit, COMMIT before
  response. Fail closed on permission/revocation/audit/pool/statement/lock errors;
  no HTTP/network within transaction, no attempt locks, retries may produce another
  access audit. Existing Identity locking protects administrative revocation;
  concurrent reads by one admin can serialize on that actor and must be measured.
- Budget expected 8 SQL calls including authentication/rate/BEGIN/COMMIT;
  fixed query count regardless of page size, max 100 rows (+1 lookahead), no COUNT,
  OFFSET, aggregate hydration or N+1. Measure natural plans on a larger fixture
  before accepting an index; any new migration follows immutable 0018.

## Checklist and evidence gates

- [x] AM-01 Inspect contract/ownership/current permission/audit and state semantics;
  preserve all 18 migration files and prior evidence hashes before edits.
- [x] AM-02 Fail-first Application/cursor and restricted PostgreSQL/HTTP tests.
- [x] AM-03 Reporting query/service/DTO/controller and actual API composition.
- [x] AM-04 Verify live deadline/status/version scope, bounded cursor, auth/privacy,
  audit rollback/failure, lock/back-pressure and fixed statement budget.
- [x] AM-05 Natural before/after query plans and local diagnostic samples; accept
  only a justified index, retain null AWS cost/capacity/allocation values.
- [x] AM-06 Relevant regression checks, self-review, immutable bundle/evidence and
  owned fixture cleanup; update REP-01 status with actual results.

Out of scope: REP-02 submissions/scores, REP-03 question statistics, remaining
REP-04 Admin rankings/privacy restore ledger, REP-05/06 metrics/audit browsing,
Web Admin integration, AWS deployment/load/cost/failover. No new queue/cache/ORM.

## Delivered behavior and architecture review

Thin Reporting HTTP controller authenticates current session, requires
`reporting.read`, admits read rate, validates only exam/pageSize/cursor and invokes
a plain Application service. Private query/cursor ports and SQL/AES-GCM adapters
stay inside Reporting. Existing ReportingModule registers this controller/service
and continues exporting only RANKING_PROJECTION to Assessment; actual compiled TCP
and AppModule/HTTPS composition pass. No new public private-service import or
global technical→business dependency is needed. Domain errors use stable transport
categories, global HTTP envelope/redaction/no-store and correlation IDs.

The technical access audit joins Identity revalidation and projection through the
existing UnitOfWork. Failed audit/actor lock returns503/data:null, releases the
connection and commits no access record; valid retry recovers. Permission revocation
between initial authentication and revalidation fails403 with no report/audit.
Unauthenticated/unverified/disabled sessions fail401; Candidate without permission
fails403. Unknown exam fails404; malformed/tampered/expired/other-actor/other-exam/
other-size cursor fails400. No request-supplied actor or email/body scope is accepted.

Restricted PostgreSQL cases verify all versions and archive/unpublish handling,
CREATED/SUBMITTED/FAILED/EXPIRED/overdue/future starts exclusion, disabled/opt-out
participants' retained live attempts, deterministic time/UUID ties, initial start
watermark and current-page freshness. An uncommitted submit can hold its attempt
lock while the monitor reads the previous committed state; after submit commit the
next page removes that row. No read locks an attempt or mutates lifecycle/results.

One SQL projection returns bounded rows plus existence/server time; no COUNT,
OFFSET, replica/cache, aggregate hydration or N+1. Auth-inclusive statement order is
identity.read, security.rate, BEGIN, actor lock, identity.read, reporting.read,
audit.write, COMMIT:8 calls and3 pool acquisitions, one retained transaction client.
Rows/map/cursor allocation are O(pageSize), capped100 (+1 lookahead). Existing
partial indexes bound eligible active scans in this fixture; query can still scan
many active entries outside the target exam, so large-skew saturation remains open.

## Measured local diagnostics

100k users/attempts over20 exams,2000 active/100 per exam; real guards/grants,
restricted pool2. A/B/A uses the same query/dataset,5 warmups and40 sequential
samples per first/deep page. Trial partial index is created/dropped only in this
disposable DB. Natural planner uses one_active_attempt without it and the trial
index while present. No optimizer hint is applied.

| Population | Initial p95 ms first/deep | Full-regression p95 ms first/deep |
| --- | --- | --- |
| Existing indexes |2.048 /2.233 |1.669 /1.748 |
| Trial exam/start/ID index |1.967 /2.184 |2.144 /1.481 |
| Trial removed |2.152 /1.992 |3.020 /1.654 |

No consistent tail gain or unmet SLO justifies an additional runtime index from
these warm samples. **Keep all18 migrations/indexes; no new migration.** Storage/
write overhead is unmeasured, so no quantitative cost reduction is asserted.
Post-format focused regression retains another raw sample instead of overwriting
these populations. Variation is visible in the append-only diagnostics.

Full-regression HTTP sample (Fastify inject, actual Identity/PG,30 measured after5
warmups): p50/p95/p99=25.015/36.729/40.519ms;0 unexpected errors; achieved≈7.511 RPS
over≈3.994s including110ms polling sleeps. This rate is paced sequential throughput,
not maximum sustainable capacity. Page20=4626bytes; actual page100=20,730bytes.
Transaction p95≈16.132ms, acquisition p95≈0.112ms. Combined Jest/harness CPU≈9.530
ms/request; RSS is process RSS, not allocated bytes/request or isolated API/container
memory. TCP/TLS/ALB, DB CPU/IOPS/WAL, utilization/headroom, contention/capacity and
AWS cost remain unmeasured/null. No production SLO/cost curve is implied.

## Validation and closure

| Check | Actual result |
| --- | --- |
| Root unit/tooling/Web |419 PASS:281 API/37 suites,42 tooling,96 Web |
| Full restricted PG/HTTP/SMTP |299 PASS/18 suites,0 skipped |
| Added coverage |23 Application/crypto units;18 PG/HTTP/diagnostic cases; existing compiled TCP composition extended with Admin route |
| Post-SQL-format focused regression |18 PASS; tokens/bindings and runtime SQL unchanged |
| Browser HTTPS |10 PASS, real AppModule/live static client/SMTP/18 built migrations; no public PKI or Admin Web integration claim |
| Lint/typecheck/build/quality/contracts |PASS;46 operations/425 examples |
| Preservation |451 protected files unchanged:18 migration files +433 prior evidence;18 source/built SQL bundles match |
| Cleanup |0 extra databases/LOGIN roles/client connections after all fixture runs; test containers stopped with volumes retained; development55432 untouched |

Self-review: no business state writes, cross-module private calls, framework/pg
imports in Domain/Application, keys/answers/PII in DTO/logs or new unnecessary
resource/abstraction. GET may create another access audit after ACK loss, as intended.
No unresolved REP-01 defect found in this scope. Core audit browsing/retention,
independent privacy deletion/restore and other Reporting capabilities remain open.

Next bounded increment: **REP-02 Admin submissions/scores**, with explicit filters,
current permission/audit, frozen-version scope, stable cursor and read/query budgets.
REP-04 remains SUBSET; REP-06/08 and production acceptance are not closed here.

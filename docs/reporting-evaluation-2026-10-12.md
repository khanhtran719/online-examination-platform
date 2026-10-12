# REP-08 — report scope, committed freshness and audit rollback

Active scope2026-10-12: **COMPLETE locally**, production NOT ACCEPTED.

Reporting owns primary READ projections through its private query ports. Identity
owns current session/action permissions; Catalog frozen scope and Assessment
atomic grading/retention remain write authorities. Admin response release requires
revalidation, projection and safe audit COMMIT in the existing UoW. Public ranking
uses the existing Assessment permission/admission and Reporting public facade.
Reports remain live statement snapshots, not a common multi-request snapshot.

- [x] RE-01 Review source/contracts/existing tests and historical protection; record
  scope/freshness matrix and this bounded plan before implementation.
- [x] RE-02 Cross-report exact-exam/version test on one shared real grading dataset:
  no foreign row/counter, pending null scores, deliberate Admin/public visibility.
- [x] RE-03 Block a real grading transaction after its writes at deferred COMMIT;
  prove old committed reports remain readable, then fresh atomic completion.
- [x] RE-04 Deferred access-audit failure at COMMIT on all7 Admin reads: no response,
  no durable access audit; remove fault and prove recovery without weakening controls.
- [x] RE-05 Capture fresh natural plans/diagnostics for every query and a small
  target among a foreign-exam-heavy dataset; retain raw plans, query budgets and
  payload limits. Review existing indexes; add none without matched evidence.
- [x] RE-06 Relevant/full verification, self-review, source/history integrity,
  fixture cleanup and evidence-backed roadmap closure.

Test work belongs to integration; production changes require a demonstrated bug
and regression before correction. No new endpoint, resource, abstraction, migration,
cache, ORM or business write flow is planned. Native constraints/permissions and
real graders remain enabled. Fault functions/triggers exist only in disposable
fixtures and are removed in finally. Current contract/source-review gate remains
unchanged. No Web/browser or AWS/production performance acceptance is in scope.

Freshness by contract: active candidates use primary live deadline and60s cursor;
submissions use retained attempt status/nullable score and15min start watermark;
best/latest use retained submitted identities with deterministic version-specific
selection; statistics are retained-completed counters updated atomically by grading
and purge; business metrics count current states of a start-time cohort, include
compact purged identities and global durable backlog; audit live browse excludes
its own pending access audit; ranking suppresses current opt-out/disabled/unverified/
privacy-requested/purged rows and uses version-scoped aliases. Existing schemas,
primary connection and SQL projection ownership implement these meanings.

Measured query plans are local cardinality diagnostics. Do not infer sustainable
RPS, concurrency, DB saturation/headroom, AWS savings, production p95/p99 or a new
index winner. No read report becomes a write invariant or authorization authority.
REP-04 privacy deletion/restore and Web/AWS gates stay open.

## Reviewed scope and freshness

| Projection | Deliberate scope | Freshness and exclusions | Fixed statement budget |
| --- | --- | --- | --- |
| Active candidates | Exact exam; all its frozen versions | Unpurged IN_PROGRESS with primary deadline after serverNow; no browser presence claim;60s scoped keyset |1 projection,8 including HTTP auth/admission/UoW/audit |
| Submissions | Exact exam, optional exact frozen version | Retained attempts with live status; incomplete scores stay null;15min start watermark bounds newcomers, not later status changes |1 projection,8 total |
| Admin result | Exact retained attempt ID under reporting.read | COMPLETED durable score/section summaries, forced review:null; pending409; no answer/explanation join |1 projection,8 total for successful reads |
| Question statistics | Exact exam/frozen-version pair | All retained COMPLETED producer counters, including disabled/opted-out candidates; includes zero-count frozen questions/options; grading and purge own atomic writes |1 projection,8 total |
| Candidate results | Exact exam/frozen-version pair | Retained submitted identities; best COMPLETED score/submit/UUID; latest submit/UUID can be pending/FAILED with null score; Admin consent-independent |1 projection,8 total |
| Business metrics | Global current state of a start-time cohort | Default last24h, explicit paired past max7day window; compact purged COMPLETED identities count; pending/replay backlog is global, not SQS depth |1 projection,8 total |
| Audit | Global redacted administrative ledger | Live keyset; its own pending access audit is absent, other committed events may be visible;365day retention can remove old rows |1 projection,8 total |
| Public ranking | Exact exam/frozen-version pair and frozen enablement | Fresh primary current verification/enabled/consent/privacy/retention filters; version aliases and destructive-change epoch; best producer result only |1 projection,3 total |

All7 private adapters/8 projections remain behind Reporting Application query
ports. Reporting may join declared foreign sources read-only; no foreign private
repository owns a reporting write. Existing cross-module public factories/facades
compose the test fixture. No production import, DTO, SQL, grant, migration or
transaction boundary was changed. The REP-07 gate still fingerprints15 tables/
134 physical columns and19 reviewed migration receipts.

Statement snapshots are internally coherent on the primary. Several HTTP report
requests can legitimately observe different committed instants, even when fired
together; serverNow/asOf and cursors are not a shared export snapshot. Audit and
current permission checks share the existing active transaction connection. The
actor row lock serializes revalidation with permission/session changes, and the
result is released only after a successful audit COMMIT. A response timeout after
COMMIT can still leave an access audit without a received report; clients must not
infer a data mutation or reverse an audit from that ambiguity.

## Added verification and initial fixture corrections

The expanded disposable candidate-results suite mounts all Reporting routes and
the existing Assessment leaderboard route, with actual Identity sessions, current
permissions/admission, restricted PostgreSQL roles and the real grading consumer.
No limiter, deadline, lock timeout or native completion guard is weakened.

Nine new cases exercise one candidate across two frozen versions and a foreign
exam, conflicting scores, active/pending/completed states and immediate opt-out/
disable visibility. A test-only deferred result trigger holds the real grader at
COMMIT after its result/statistic/leaderboard/status writes. All relevant primary
reports read the old committed state; after release they read completion, score,
statistics/ranking and the global pending decrement. The grader's500ms lock bound
remains active. Concurrent report probes fit that bound; this is a controlled
commit-boundary test, not a load or autoscaling experiment.

Seven parameterized cases fail an already inserted report access audit at deferred
COMMIT. Each route returns the safe503/no-store/null-data envelope, leaves no
durable access audit, releases the pool, and succeeds with one new audit after
fault removal. The recorded operation order includes projection, audit INSERT,
failed COMMIT and ROLLBACK. No report body crosses the transport on that failure.

The first new fixture incorrectly paced six blocked-COMMIT probes serially at110ms,
exceeding the real500ms lock deadline. The second used a start just outside the
business metrics default24h cohort. Both were test assumptions, not runtime bugs;
parallel independent probes and an in-cohort start fixed them. Initial failures
are retained with their scope. The focused final selection passed9 and deliberately
skipped the existing18; the complete suite subsequently passed all27 with0 skipped.
Production source was unchanged.

## Query and index review

Every adapter is rerun against its existing cardinality diagnostic, with fresh
natural EXPLAIN(ANALYZE,BUFFERS,FORMAT JSON) artifacts. The extended candidate test
also reuses its own constrained100k foreign-attempt fixture, independent of test
order: a separate target exam has one completed, one submitted and one active
attempt for one verified candidate. Its completion is produced by the real grader;
the large foreign population is synthetic cardinality and does not seed producer
inbox/statistics/ranking projections. This distinction is explicit in the artifacts.

The eight mixed-scope probes capture the exact executed SQL hash, parameter count,
one-statement count, projection byte size and unforced plan under the restricted
API role. Dataset table counts, existing index definitions, PostgreSQL version and
planner settings are recorded. The new probes do not serialize binding arrays or
credentials; native plan conditions contain disposable synthetic fixture IDs.
Small dimension tables can correctly use sequential scans; a scan
alone is not evidence of a missing index. Global metrics/audit intentionally span
exams and are not evaluated as exact-exam queries.

Final mixed-scope natural plans, one EXPLAIN execution each (ms, not percentiles):

| Projection | Execution ms | Observed access and decision |
| --- | --- | --- |
| Active candidates |0.081 | attempts_deadline for the single active row; small exams dimension scan. Retain existing indexes. |
| Submissions |0.143 | attempts_admin + result unique index for3 target rows. Retain existing version-filtered query. |
| Admin result |0.168 | Attempt/result/section/question unique indexes; small frozen dimensions scan. Retain existing query. |
| Question statistics |0.190 | Small dimension/counter scans; section uniqueness index. Larger10k/100k fixture separately verifies natural access. |
| Candidate results |0.744 | attempts_limit/attempts_admin + result unique index; one target pair. Retain existing query. |
| Business metrics |63.344 | Sequential scan of100,027 attempts, intentional global scope. Requires concurrent-load/cost study before any replacement. |
| Audit |0.114 | Scan of64 fixture audit rows, not100k foreign attempts. The separate100k audit fixture uses the existing retention index. |
| Ranking |0.308 | Small producer entry/epoch scan, indexed attempt/result/current-user checks. Foreign fixture does not seed100k ranking entries. |

Fresh full/affected-suite HTTP injection diagnostics below are **independent local
populations**, one paced actor, no TCP/TLS/ALB. They are not throughput, SLO or
before/after optimization evidence. Admin budgets include real permission/admission/
audit and transaction statements. Rounded values are for reading; exact samples,
plans, payloads, CPU/RSS and query timings remain in
[query review](evidence/reporting-evaluation-2026-10-12/query-review.json) and its
referenced artifacts. Nearest-rank p99 is the maximum for these20–40 observations.

| Route/population | n | p50 ms | p95 ms | p99 ms | SQL/read |
| --- | --- | --- | --- | --- | --- |
| Active candidates20-row page,100k attempts |30 |18.129 |37.376 |37.398 |8 |
| Submissions20-row page,100k attempts |30 |45.385 |54.010 |65.688 |8 |
| One completed Admin score alongside100k attempts |30 |30.016 |43.678 |50.507 |8 |
| Question statistics100-row/10-option page,10k questions/100k options |30 |37.724 |46.702 |51.698 |8 |
| Best/latest100-candidate page,100k attempts/10k candidates |30 |23.072 |38.763 |153.326 |8 |
| Business metrics,100k attempts |20 |74.166 |83.890 |92.278 |8 |
| Business metrics,1M attempts |20 |636.783 |899.825 |978.318 |8 |
| Audit100-row first page,100k records |20 |26.123 |37.352 |37.498 |8 |
| Audit100-row deep keyset page,100k records |20 |32.966 |40.251 |52.320 |8 |
| Ranking20-row page,100k tied candidates/results/entries |40 |264.107 |332.357 |350.602 |3 |

Monitor initially persisted summaries without individual samples. The follow-up
adds raw query/HTTP/payload/SQL-count/transaction/acquire arrays only to the test
artifact; all18 monitor tests pass again. Recomputing all7 latency summaries from
the final raw arrays matches exactly. Both the original full-suite summary and
the final monitor artifact are retained; they are separate runs, not an optimization
comparison. No old evidence is edited to insert missing samples.

Review outcome: no runtime correctness defect found in this bounded scope; retain
the existing pg/read ports/indexes/UoW. A selective version read avoids foreign
attempt scans in the mixed fixture, but the unversioned submissions diagnostic
still scans its100k attempt population (~21.856–22.328ms natural execution). Global
metrics scale with scanned attempt population and ranking visibility can scan a
large tied set. These are query risks to investigate with real concurrent primary
write/read traffic, realistic skew and DB/pool telemetry; they are not a measured
first bottleneck. One SQL statement can still contain repeated per-row lateral
work, so a fixed statement count does not prove constant CPU or index cost.
No index/cache/RDS growth/resource/optimization/capacity/cost winner is selected.

## Closure and next scope

[Evidence](evidence/reporting-evaluation-2026-10-12/README.md):644 root tests
(492 API/53 tooling/99 Web),427 full integration/24 suites,27 complete candidate
tests and18 final monitor tests PASS,0 skipped in complete runs. Lint/typecheck/
API build/quality/contracts48 operations/445 examples PASS. The full run precedes
the monitor artifact-only addition; its affected suite and static checks were
rerun afterward. No Web source changed; fresh browser/HTTPS/Web build was not rerun.

All633 protected migration/historical evidence files remain byte-identical;
19 source/build migration files match. All production API source,7 Reporting SQL
adapters and query dependency receipts are unchanged against3d8022b. Disposable
databases/logins/connections0; test PostgreSQL55435 and Mailpit11025 stopped with
volumes retained; dev PostgreSQL55432 untouched. No deploy/commit/PR or background
work remains.

R-58/R-59 and workflow §§47–48 self-review: owning primary read ports/public
composition, frozen source scope, current authorization, atomic producer reads,
safe audit/error release, idempotent grading and bounded output are preserved.
Test-only fault DDL never reaches migrations or runtime grants. No new abstraction,
production log fields or external integration is introduced. REP-08 is checked
for this named local evaluation: roadmap88/216 checked,128 pending. Production
NOT ACCEPTED; REP-04 independent privacy ledger/deletion/restore stays SUBSET,
and live Web/AWS/load/saturation/FinOps/RDS recovery gates stay open.

Next proposed bounded increment: WEB-03, wire the existing exam browse/detail
views to real Catalog APIs with typed contracts, loading/error/empty states and
authenticated HTTPS checks. Start/save/submit/result/Admin/privacy operations
keep their own later acceptance scope.

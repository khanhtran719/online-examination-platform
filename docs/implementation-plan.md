# Implementation plan

## Active increment — Assessment HTTP faults, 2026-10-09 (COMPLETE locally)

Scope: close the missing local ATT-10/11 start/save/submit HTTP timeout,
lost-acknowledgement and compiled API crash/restart matrix. Assessment owns the
write invariants; genuine Identity session/permission/CSRF admission remains in
every request. Existing row/version/receipt/outbox transactions stay authoritative.
No AWS, new resource/dependency, migration, Web, Reporting or commit.

Plan: a disposable fully migrated database and restricted API login; compiled
`dist/main.js` processes with ephemeral signing secrets; loopback socket faults
outside runtime code. A fixture-only receipt trigger blocks the transaction after
business writes but before COMMIT. Observe the actual blocked PostgreSQL backend,
then kill the API or terminate that backend; assert complete rollback. Test lock
and statement timeout separately. Drop a successful upstream response before the
client receives any bytes, restart the API and require exact durable replay.
Exercise duplicate keys/stale tabs across two independent API processes and
SIGTERM with admitted writes. Record counts/timing without tokens, bodies or SQL
parameters; preserve all applied migrations and historical evidence.

- [x] HF-01: Inspect coverage/contracts, preservation and explicit fault matrix.
- [x] HF-02: Real HTTP lost ACK/restart and pre-COMMIT crash for all three writes.
- [x] HF-03: Bounded lock/statement/acquire timeout/backend-loss recovery,
  maxWaiting back-pressure, two-task duplicate/stale-tab controls and SIGTERM drain.
- [x] HF-04:26 focused/268 full integration PASS,375 root PASS, lint/typecheck/
  build/contracts46/425. Self-review found incorrect fixture expectations,
  corrected without any runtime change; original failed logs preserved.
- [x] HF-05: [Report](assessment-http-faults-2026-10-09.md)/
  [evidence](evidence/assessment-http-faults-2026-10-09/README.md)/
  [runbook](runbooks/assessment-http-recovery.md);364 prior files unchanged,
  17 migration bundles match,0 temporary DBs/logins/connections/processes/keys.

ATT-10/11 close locally with this matrix and existing observed publication,
deadline/version/quota/save-submit/scheduler regressions. Roadmap81/216,135 pending.
Prior ATT-01–09/ASYNC-01–07/10 acceptance remains; production/network/AWS recovery
and capacity gates remain open. No commit/deploy. Next scope: REP-04 public
leaderboard/privacy reads, with Reporting/Admin projections kept separately scoped.

## Active increment — Assessment retention,2026-10-09 (COMPLETE locally)

Scope: ATT-09 receipt/answer lifecycle, including withdrawal of expired completed
answer/result payloads and their Assessment projections. Assessment owns WRITE
use case/retention policy/maintenance port. No Identity/Catalog privacy purge,
FAILED incident resolution, public leaderboard/Admin HTTP, AWS or commit.

Receipt pruning is Assessment-operation-only, bounded and at least7days after
acceptance; active/pending/FAILED records remain protected. Expired completed
payloads require365days from submit plus a7day completion/receipt grace, durable
successful inbox, no pending/leased/parked delivery or unresolved failure. Keep
compact attempt/submission/inbox identity for quota and duplicate fencing; hide
purged attempts from Candidate content/result/history. Withdraw result/answers,
decrement retained-result statistics and recalculate best surviving leaderboard
entry atomically with audit. No anonymous zero-score/result reconstruction.

Plan: pure Domain eligibility; plain Application UoW per attempt; private pg
adapter plus bounded, fixed-policy SECURITY DEFINER maintenance functions. New
NOLOGIN maintenance authority has EXECUTE only, no direct table purge/key/Identity
access. SQL uses secure search_path, owned row locks, post-lock DB facts and
consistent statistic→option→leaderboard order. New forward0017 adds purge marker,
query-driven indexes and completion guard; applied0001–0016/evidence immutable.
An opt-in one-shot scheduler entry point handles stop/drain and bounded work,
avoiding a permanently provisioned maintenance service. Readers and source/DLQ
consumers must understand compact purged COMPLETED identity before enabling jobs;
rollback must retain that ability after the first purge.

- [x] RT-01: Preserve history; fail-first Domain/Application/restricted-PG tests
  for grace/gates/pruned UUIDv7 retries, races, rollback and projection consistency.
- [x] RT-02: Implement maintenance policy/use case/ports/private adapter, forward
  migration/least privilege, atomic payload withdrawal and duplicate fencing.
- [x] RT-03: Normalize read/grading/recovery paths for purged identity; preserve
  existing query ceilings/contracts, current permissions and attempt quota.
- [x] RT-04: Opt-in compiled one-shot worker, bounded config/stop/drain, safe
  counts/logs; natural index plans/local bounded timing and SQL observations.
- [x] RT-05: Full checks/self-review/preservation/cleanup, ADR/runbook/evidence;
  close ATT-09 only with local evidence; all broader production gates stay open.

Closure: [ATT-09 report](assessment-retention-2026-10-09.md)/
[evidence](evidence/assessment-retention-2026-10-09/README.md),375 root/242 integration
PASS,0 skipped; lint/typecheck/build/contracts46/425 PASS.18 new real-PG cases
include observed contention, rollback, SIGTERM, finite-time/DST direct-RPC probes.
17 migration bundles match;322 prior files unchanged; cleanup0 DB/login/connections,
PG55435/Mailpit stopped with volumes preserved. Roadmap79/216,137 pending.
Only ATT-09 closes; ATT-10/11 and REP-04 broader scopes remain open. No commit/deploy.

## Active increment — Candidate result/history/review, 2026-10-09 (COMPLETE locally)

Scope: ATT-08 Candidate result/history/review projections and durable status
semantics after grading/recovery. READ owner: Assessment. No Admin replay HTTP,
leaderboard/Reporting, Web, AWS, retention maintenance or commit. Existing
Assessment start/save/submit, worker and source/SQL contracts remain unchanged.

Plan: controller authenticates current session/permission and rate admission;
plain CandidateResultsService invokes its query/cursor/page-size ports. Private
optimized SQL reads Assessment attempt/result/detail/answer sources and declared
immutable Catalog version/section/question/option/key snapshots. It never invokes
Catalog repositories or changes those sources. One statement owns each result,
review or history projection, with current ownership, frozen release and DB time.
No aggregate hydration, OFFSET, hidden COUNT, cache or extra resource/migration.

Invariants: foreign/nonexistent attempt404; action permission403; only COMPLETED
with durable result returns a score. Pending/FAILED returns202 status without
fabricated score/internal failure details. NEVER denies review; AFTER_COMPLETION
requires completed result; AFTER_EXAM_CLOSE additionally uses frozen close and DB
time. Review gate precedes content/key projection; no keys in result/history or
denied output. History is actor-scoped keyset DESC(startedAt,id), first-page
watermark,15min actor/kind/pageSize/filter-bound HMAC cursor; review binds frozen
attempt/version and section/question order. Review pages are20 default/100 max
and256KiB complete encoded response, with no continuation skips. No-store on all.

- [x] CR-01: Preserve16 applied migrations/history; fail-first release/pending/
  cursor/payload tests plus real PG/HTTP contract/security regressions.
- [x] CR-02: Plain read use case/DTO/query port and optimized owned projections;
  frozen policies, null scores and bounded deterministic pagination.
- [x] CR-03: HTTP/module wiring, exact schemas/permission/no-store/safe failures;
  pending Retry-After without changing mutation contracts.
- [x] CR-04: Query ceilings3/request including auth/rate; natural history index
  plan, bounded no-N+1 review, local percentile/CPU/payload/query diagnostic with
  explicit capacity/AWS limitations.
- [x] CR-05: Full relevant checks/self-review/preservation/cleanup and evidence,
  update ATT-08 only after local acceptance; production gates remain open.

Closure: [report](assessment-results-2026-10-09.md)/
[evidence](evidence/assessment-results-2026-10-09/README.md)/
[ADR-010](adr/010-candidate-frozen-read-projections.md)/
[runbook](runbooks/candidate-results.md).344 root(207 API/30 suites,41 tooling,
96 Web),224 integration/14 suites/0 skipped; lint/typecheck/build/contracts46/425
PASS.289 protected files unchanged,16 source/built migrations match; no new SQL,
grant, runtime dependency, event or AWS resource. Unit-test technical imports were
replaced with port fakes without weakening architecture guards. Cleanup observed0
temporary DBs/logins/other-DB connections and stopped only PG55435/Mailpit, keeping
volumes. ATT-08 checked; roadmap78/216,138 pending. ATT-09 retention and REP-04
leaderboard/privacy remain separate increments; AWS/production gates stay open.

## Active increment — terminal grading recovery, 2026-10-09 (COMPLETE locally)

Scope: ASYNC-10 local terminal FAILED/quarantine/audit and operator-authorized
replay; generation fencing subsets of ASYNC-11. No Admin replay HTTP, Web,
Terraform, live AWS, capacity/cost benchmark or commit. Assessment owns this WRITE
workflow. Plain Application coordinates attempt locks, lifecycle and repository/
UoW ports. Global SQS adapters transport metadata; worker/operator roots invoke
public Assessment factories only.

Invariant: a failed grading transaction rolls back first. A separate root UoW
persists FAILED + generation-specific quarantine + unsampled audit, without a
successful inbox or partial result. Schema/identity poison never fails a foreign
attempt. Transient errors retry through bounded source redrive; a verified DLQ
delivery settles exhausted work. Permanent scoring validation may settle early.
COMPLETED remains terminal. Replay commits audit + replayPending + a fresh outbox
delivery generation with unchanged event/submission/answers/version. Old source/
DLQ generations cannot clear or execute new replay; duplicate settlement/replay
cannot repeat effects. Broker calls remain outside transactions.

- [x] GR-01: Preserve applied migrations/evidence; write fail-first lifecycle,
  generation, restricted-PG atomicity/authority and SDK metadata regressions.
- [x] GR-02: Implement terminal recovery use case/private adapter; forward0016,
  least-privilege recovery group, generation-specific evidence and audit.
- [x] GR-03: Implement audited operator-only replay + CLI; preserve original
  envelope/event identity, guard revision/concurrent replay, never delete success.
- [x] GR-04: Carry generation outside immutable event body; verified DLQ source,
  bounded recovery worker mode, heartbeat/commit-before-ACK/shutdown.
- [x] GR-05: Full relevant checks, self-review, immutable history/cleanup and
  runbooks/status evidence. AWS effective IAM/DLQ/saturation gates remain open.

Outcome:327 root +214 full integration/14 suites PASS,0 skipped;
lint/typecheck/build/contracts46/425 PASS. Real restricted-PG dispatch confirms
replay generation propagation outside the claim transaction.15 applied migration
and239 historical evidence hashes unchanged;16 source/built migration assets match.
Self-review/documentation checks PASS; disposable DBs/logins/connections0,
owned PostgreSQL/Mailpit stopped with volumes preserved. ASYNC-10 closed locally:
77/216 checked,139 pending. No stage/commit/deploy or unrelated Web edit. See
[report](grading-recovery-2026-10-09.md)/
[evidence](evidence/grading-recovery-2026-10-09/README.md).

## Active increment — grading consumer, 2026-10-09 (COMPLETE locally)

Scope: ASYNC-05–07, local transport/rollback subsets of ASYNC-09/11 and a
bounded scoring diagnostic for ASYNC-08. Assessment owns grading/results and
projection writes. Catalog exposes a trusted frozen scoring capability through
public composition. Plain Application takes repository, Catalog facade and UoW
ports; private SQL adapters share the ambient transaction. No new HTTP routes,
Web work, AWS deployment or production capacity claim.

Invariant: compare submission identity with the locked authoritative attempt;
only SUBMITTED/EXPIRED or explicitly authorized FAILED replay may grade. A unique
result per attempt and inbox per event prevent duplicate effects. Exact-match
integer scoring, section totals, question/option counters and best-attempt
ranking commit together with COMPLETED before DeleteMessage. Rank by earned
points DESC, submitted time ASC, attempt UUID ASC. Persist all completed attempts
in statistics; privacy/visibility is enforced by future public read projections.
Malformed/forged messages enter digest-only durable quarantine without changing
an attempt. Transient failures roll everything back and remain unacknowledged;
SQS bounded redrive/DLQ and authorized terminal failure/replay remain ASYNC-10.

Plan/checks:

- [x] GC-01: Preserve all applied migrations and historical evidence; fail-first
  domain/use-case, architecture and restricted-PG regressions.
- [x] GC-02: Frozen option snapshot, deterministic breakdown and atomic inbox,
  result, statistics, ranking SQL with a dedicated least-privilege grading role.
- [x] GC-03: Validated bounded SQS consumer transport and inbound composition;
  ACK loss/redelivery, poison quarantine, shutdown and transport failure checks.
- [x] GC-04: Scoped local scoring/transaction diagnostic; record limits without
  closing AWS capacity, pool tuning or jobs/USD acceptance.
- [x] GC-05: Full relevant checks, self-review, preservation/cleanup evidence,
  runbook and checklist updates. Full lifecycle/FAILED/replay/AWS gates stay open.

Outcome: [closure](grading-consumer-2026-10-09.md)/
[evidence](evidence/grading-consumer-2026-10-09/README.md),316 root +200 full
integration PASS,0 skipped; lint/typecheck/build/contracts46/425 PASS. Independent
ambient-UoW RED reproduced premature ACK; factory guard yields3 GREEN regressions.
15 source/built migrations match and217 prior files remain immutable. Disposable
fixtures/services cleaned with volumes preserved. ASYNC-05–07 accepted locally:
76/216. ASYNC-08/09/11 retain named subsets; terminal FAILED/DLQ replay, results
HTTP/Reporting, full tracing and AWS/capacity/cost/production gates remain open.
No stage/commit/deploy or unrelated Web edit.

## Active increment — Assessment outbox dispatch, 2026-10-08

Scope: ASYNC-02–04 and publisher crash/lease subset of ASYNC-11. No scoring, inbox,
Reporting, AWS provisioning or production acceptance. Assessment owns submission
publication; its plain Application service takes a dispatch repository and shared
queue delivery port. Module-private PostgreSQL adapter owns claim/fencing SQL;
global SQS adapter owns SDK/serialization transport. Worker calls a public
Assessment factory, without private module imports. This specializes existing
architecture §79/ADR-001 and adds no new business module or broker.

Invariant: preserve original event identity/body, publish outside any DB
transaction, mark only after successful broker acknowledgement and a live matching
lease. At-least-once publication requires the later grading inbox. Claim at most
the configured concurrency slots; all sends start immediately, with bounded
request deadlines shorter than lease. PostgreSQL time owns eligibility, lease,
retry and age. Crash on the last try must recover into parking. Separate replay
window permits audited retries of aged records without rewriting created_at/body.

Plan/checks:

- [x] Fail-first use-case tests: send/ACK ordering, retry bounds, poison/aged/final
  claims, telemetry isolation, shutdown admission.
- [x] Real restricted-PG tests: competing workers, SKIP LOCKED, stale token/expired
  ACK, restart/crash after ACK, retry eligibility, rollback and least privilege.
- [x] SQS SDK local HTTP contract tests: exact body, timeout, transient/permanent
  rejection, missing/invalid ACK, no hidden SDK retry. Live SQS remains unmeasured.
- [x] Forward migration 0014, dedicated worker role, operator-only audited replay
  with unchanged event identity and atomic audit rollback.
- [x] Isolated typed config, public composition, health/backoff/drain entry point,
  bounded logs/backlog metrics and deployment/replay runbook.
- [x] Full repository checks, preserved prior migrations/evidence, clean disposable
  fixtures and checklist update with new evidence. No performance/cost win claimed.

Outcome2026-10-09: [closure](outbox-dispatch-2026-10-08.md)/[evidence](evidence/outbox-dispatch-2026-10-08/README.md),280 root +173 integration PASS; ASYNC-02–04 accepted locally,73/216 checked. Independent lock-wait RED led to post-lock ACK/failure recheck. Consumer/AWS gates remain open.

## Active scope — ATT-07 review fixes COMPLETE locally, 2026-10-08

User authorizes finishing the review check and fixing ER-01–04. The review is complete; its4 RED probes and checks are recorded. Owner: Assessment; WRITE scheduler workflow plus diagnostic measurement. Preserve all11 applied migration bytes and historical evidence; no scoring/SQS/Web/AWS/deploy/commit.

Design: persist bounded per-attempt expiry retry count/time in PostgreSQL after a failed acceptance rollback; claim ignores cooling rows and always rechecks post-lock time. Retry metadata is workflow data behind an Application port, not business FAILED or local authoritative memory. One short UoW for acceptance+outbox; a separate bounded row-locked retry scheduling transaction must recheck IN_PROGRESS so a concurrent winner is never overwritten. No lease is needed for atomic claim+effect. Forward migrations enforce accepted kind non-null without inventing provenance, and add only the retry fields/grants needed. Stable statement-time discovery enables deadline index ranges; authoritative acceptance remains clock_timestamp after lock. Measurement separates deadline-to-acceptance from calibrated client commit-ack observation; telemetry cannot affect commit semantics. Original raw files stay immutable.

- [x] EF-01: Confirm review complete; capture source/migration/evidence baseline and agree concrete fix scope.
- [x] EF-02: Independent restricted-PG regression suite plus measurement/unit cases RED; capture comparable scheduler baseline separately.
- [x] EF-03: Implement durable bounded retry fairness, forward provenance guard and indexable discovery/backlog; preserve HTTP query ceilings.
- [x] EF-04: Correct measurement labels; add commit-ack observer and clock calibration, fresh diagnostics and historical correction.
- [x] EF-05: Run affected/new unit/real-PG/HTTP/process checks, root/lint/typecheck/build/contracts; self-review and verify immutable history.
- [x] EF-06: Publish evidence and closure report, clean fixtures, restore ATT-07 only after all four findings close locally.

Outcome: [Closure](assessment-expiry-fixes-2026-10-08.md)/[evidence](evidence/assessment-expiry-fixes-2026-10-08/README.md): ER-01–04 CLOSED locally;254 root/144 full integration PASS,0 skipped, contracts46/425.21 new PG regressions include corrupt0011 migration rollback and delayed pre-commit witness. Final source/config hashes,13 built migrations,75 unchanged historical files and cleanup verified; ATT-07 restored70/216. Broader ATT-10/11, scoring/SQS/retention/Reporting/ID-11/Phase04/AWS remain open. No stage/commit/deploy or unrelated Web edit.

## Prior scope — independent ATT-07 review COMPLETE, 2026-10-08

User requested review of Grok's finished deadline sweep. [Report](assessment-expiry-review-2026-10-08.md)/[evidence](evidence/assessment-expiry-review-2026-10-08/README.md):4 findings,4 RED assertions/3 PASS controls. Runtime remains unchanged. ATT-07 is `[ ] — IN PROGRESS`;69/216 checked,147 pending. Prior CAT-09/10 and ATT-01–06 acceptance remains. No fixes, scoring/SQS/AWS/Web work, stage/commit or deploy included.

- [x] Inspect owner/boundaries/transactions/locks/provenance/grants/config/lifecycle and original evidence.
- [x] Fresh root249 and restricted PG/HTTP/SMTP122 PASS/1 diagnostic deselected; lint/quality/contracts/typecheck/build PASS. Existing compiled worker lifecycle checks pass; HTTPS not rerun.
- [x] Independently reproduce failed-prefix starvation, NULL accepted provenance, volatile unindexed discovery and mislabeled commit lag; verify two-worker idempotency and rollback recovery controls.
- [x] Record separate raw evidence, preserve protected source/migrations/history, clean fixtures, reopen affected delivery status.

Next authorized implementation would fix ER-02/01/04/03 and rerun RED→GREEN checks before restoring ATT-07 acceptance. This review does not itself implement those fixes. Full ATT-10/11 and production gates remain open.

## Prior implementation — ATT-07 deadline sweep (reopened), 2026-10-08

Owner: Assessment. Flow: WRITE. One short transaction per attempt. Claim and effect commit together, so this increment does not add a lease or fencing table. ATT-01–06 and CAT-09–10 stay accepted. Scoring, dispatcher/SQS, result/history, retention, Web and AWS stay out.

Invariants: only `IN_PROGRESS` rows whose deadline has arrived move to `EXPIRED` with `expired=true`, `submission_kind=DEADLINE` and one `attempt.submitted.v1` outbox row. Revision increases once. Committed answers stay. A sweep before the post-lock clock is a no-op. A late manual submit stays `MANUAL`. Repeat sweep, two workers and a manual race keep the winner's submission id, event id, time and kind.

Lock: scheduler takes `assessment.attempts` only, `ORDER BY deadline, id LIMIT 1 FOR UPDATE SKIP LOCKED`, then reads `clock_timestamp()` after `LockRows`. It does not take the Identity user lock, so it cannot invert the HTTP order (user, receipt, attempt). Discovery is not a claim. A list of ids is not ownership. A locked oldest row is skipped; younger due rows proceed; the skipped row is retried on a later claim. Ids whose persist failed are excluded only for the rest of that tick.

Transaction: one attempt, not a batch. One outbox failure rolls back only that attempt and leaves it `IN_PROGRESS`. A transient error does not set `FAILED`. Success counters move only after commit. The sweep does not write an actor-scoped HTTP receipt. Durable attempt identity protects the internal retry. Correlation and causation are server UUIDs.

Provenance: `assessment.attempts.submission_kind` in forward migration `0011`, because the attempt row is the acceptance authority and `0006` does not store kind. Accepted rows backfill to `MANUAL`. Unsubmitted rows stay null. A check and a new immutable trigger protect the value after acceptance. `0001`–`0010` are not edited. The event schema already allows `MANUAL` and `DEADLINE` and is not changed. `DEADLINE` requires `expired=true`. `occurredAt` is the post-lock `acceptedAt`.

Privilege: `examination_expiry_worker` may select, lock and update the submission columns on `assessment.attempts` and insert `platform.outbox`. It cannot read session secrets, answer keys, answer rows or email ciphertext. Grants are proved with that role.

Runtime: `createExpiryWorker` composes private adapters. `workers/scheduler/expiry.main.ts` is lifecycle only. Config is separate and does not load JWT or email keys. Idle poll is 5 seconds plus jitter, with no overlapping loop. A full batch continues immediately. Connection failure backs off and clears `/ready`. `/live` stays the process. `SIGTERM` stops a new attempt transaction, drains the current one, then closes the pool.

Checks: unit policy and core, real PostgreSQL lock/commit/race/crash/grant tests, manual hot-path query ceilings unchanged, compiled scheduler health and restart, and a separate measurement database. Baseline scheduler throughput is unmeasured. Tick ATT-07 only after that evidence. Do not commit or deploy.

Originally closed locally on 2026-10-08. [Evidence](evidence/assessment-expiry-2026-10-08/README.md) is historical. Independent review reopened ATT-07; current status follows [review](assessment-expiry-review-2026-10-08.md). ATT-10 and ATT-11 stay open with a deadline-sweep subset only. ATT-08, ATT-09, scoring, SQS, Reporting, Web and production stay open.

- [x] Shared `acceptAttemptSubmission` for manual `MANUAL` and sweep `DEADLINE`, without a second copy of the acceptance rules.
- [x] One short transaction per attempt: `FOR UPDATE SKIP LOCKED`, post-lock `clock_timestamp()`, outbox in the same commit. No lease table.
- [ ] **IN PROGRESS — ER-01** Forward `0011_submission_kind.sql` and `examination_expiry_worker` exist, but the CHECK permits accepted NULL provenance. `0001`–`0010` bytes match the baseline hashes.
- [ ] **IN PROGRESS — ER-02/04** Existing PostgreSQL/HTTP cases pass, but full failed-batch fairness and natural deadline range plans fail independent probes. Existing cases cover deadline boundaries, offline and revoked sessions, duplicate ticks, two workers, both race winners, locked oldest row, poison row, outbox rollback, connection death, lost acknowledgement, quota/frozen version, grants, query ceilings, compiled SIGTERM/restart and `/live` versus `/ready`.
- [ ] **IN PROGRESS — ER-03** First measured scheduler runs exist, but acceptance lag was labeled commit lag. Need correction/new measurement; one repeated batch-50 run, plus batch 10. Manual statement counts stay 11/11/10 and 4/4/3. No before-scheduler throughput was invented.

## Prior scope — Grok deadline auto-submit handoff COMPLETE, 2026-10-08

User requests the next API implementation prompt. Deliver the [ATT-07 handoff](grok-assessment-expiry-implementation-prompt.md), grounded in the current accepted Assessment source, product/event contracts, role grants and expiry index. This increment edits documentation only; no scheduler runtime, migration, test execution against PostgreSQL, AWS or product acceptance is included. Preserve unrelated Web work and all historical evidence.

- [x] Inspect submission/UoW/worker composition, event MANUAL/DEADLINE gap, existing deadline index and migration/grant constraints.
- [x] Write a998-word prompt with11 ordered steps: shared submission core, trusted worker boundary, bounded discovery/locking, immutable acceptance, minimal privileges, process lifecycle, fail-first correctness/race/crash tests and measurements.
- [x] Validate document links/contracts, prompt word count, unchanged69/216 product status and documentation diff; report handoff with implementation still pending. Quality/contracts/diff PASS;998 words/11 steps;46 operations/425 examples. Runtime tests were not rerun for this documentation-only handoff.

The proposed implementation owns Assessment deadline submission, with scheduler-specific ATT-10/11 subsets. ATT-07 remains unchecked until implementation and evidence exist. ATT-08/09, full ATT-10/11, grading/SQS/Reporting/Web, ID-11/Phase04 and production gates remain open. Baseline scheduler throughput is unmeasured; manual-path regression comparison and first scheduler measurements are separate.

## Active scope — Assessment review fixes COMPLETE locally, 2026-10-08

User authorizes AR-01–05 fixes from the independent review. Preserve unrelated Web work, applied migrations and archived evidence. No scheduler, grading, SQS, AWS, production acceptance or commit is included.

- [x] AF-01: Capture current source/migration/evidence hashes; run supported regression tests RED and comparable 25-actor diagnostic before changing runtime.
- [x] AF-02: Catalog locks the exam in one statement and reads the current frozen publication in a fresh statement; hold the shared lock through Assessment commit. Add post-lock server time to the public result.
- [x] AF-03: Normalize UUIDs and only set-valued option IDs before fingerprint and validation; bound the full encoded HTTP question page through an outer-layer measurement callback. Preserve cursor continuation without skips.
- [x] AF-04: Optimize measured writes: one authenticated admission query preserves access/refresh/CSRF/permission/rate controls; transactional revalidation stays fresh after the user lock. Materialized attempt lock supplies post-lock clock. Bounded answer UPSERT/selection replacement/revision CTE removes four round trips without relaxing invariants or grants. Keep ceilings start12/save11/submit10.
- [x] AF-05: Prove correctness/security/races and query ceilings on restricted PostgreSQL; rerun comparable diagnostics, unit/architecture/contract/build and Identity HTTPS checks; self-review boundaries and immutable evidence.
- [x] AF-06: Write closure evidence/report and update only proven roadmap items. Local measurements do not establish AWS capacity, cost savings or SLO acceptance.

Outcome: [Closure report](assessment-fixes-2026-10-08.md)/[evidence](evidence/assessment-fixes-2026-10-08/README.md): AR-01–05 CLOSED locally;234 root/105 integration/10 HTTPS PASS, start11/save11/submit10 queries. CAT-09/10 and ATT-01–04 restored:69/216. Ten migrations/archived evidence preserved; scheduler/restart/retention/production remain open.

Owners: Identity owns authenticated admission and public guard; Catalog owns publication locking/snapshot; Assessment owns attempt/answer invariants and UoW; Presentation owns HTTP encoding. All SQL remains Infrastructure, business writes join the same UoW, receipts/outbox remain atomic and response follows commit. No new resource or schema migration is proposed.

## Prior independent Assessment API review COMPLETE, 2026-10-08

User yêu cầu review code API mới của Grok. Phạm vi: Assessment, public capabilities Catalog mới, migration0010 và composition/database liên quan. [Report](assessment-review-2026-10-07.md)/[evidence](evidence/assessment-review-2026-10-07/README.md) ghi5 findings,6 RED assertions và3 PASS controls. Không sửa runtime, triển khai worker/Web/AWS hay stage/commit. Mọi source/migration/evidence cũ giữ nguyên.

- [x] Đối chiếu architecture/rules, prompt, product, ADR-003, HTTP/events/query budgets và source/tests.
- [x] Kiểm tra ownership, UoW/locks/time/receipts/outbox/grants/DTO/cursor và actual HTTP responses.
- [x] Run quality/contracts/lint/typecheck/build/root217; restrictedPG/SMTP90 (3 diagnostic writers deselected); actual HTTPS10.
- [x] Reproduce độc lập option-set retry, whole-page bytes, publish/republish lock race, UUID spelling và query ceilings. RED có safe evidence; concurrent saves/submit controls PASS.
- [x] Bảo toàn source/10 migrations/archived evidence, cập nhật status và dọn fixture/services.
- [x] **Fix follow-up** AR-01–05 CLOSED locally theo [closure2026-10-08](assessment-fixes-2026-10-08.md). Trạng thái63/216 của review là lịch sử; sau fix69/216. Ceilings không đổi.

## Prior implementation — Assessment core local, 2026-10-07

User yêu cầu thí sinh bắt đầu, tiếp tục, lưu và nộp bài bền vững trên PostgreSQL local. Increment này làm ATT-01–06, race start/publish của ATT-10 và CAT-10, subset trạng thái bền của ATT-08, subset lỗi backend/ownership của ATT-11, và ASYNC-01 ở phía transaction. Không làm ATT-07 scheduler, ATT-09 retention, chấm điểm, SQS, Reporting, Web, AWS, magic link hay GitHub. ID-11 và Phase04 giữ mở: Assessment local không gửi mail và không phụ thuộc SES.

Ngoại lệ đã đối chiếu trên source: `getPublishedPolicy` không giữ lock; HTTP yêu cầu `revision` nhưng `assessment.attempts` chưa có cột; runtime không được UPDATE toàn bộ attempt/answer selection; `platform.outbox` đã có và không được dùng lại email outbox của Identity. Không bịa route result/review. Baseline 199/83/10 là lịch sử, không phải evidence của increment này.

| Use case | Owner | Contract |
| --- | --- | --- |
| ATT-01 start | Assessment application + domain write repository; Catalog `sharePublication` | In: examId path, session, Idempotency-Key UUIDv7, Origin/CSRF. Out: Attempt 201. Permission `assessment.take`. Invariant: một active attempt mỗi user/exam; deadline = min(startedAt+duration, frozen close); EXPIRED/FAILED vẫn tính quota; active cũ giữ nguyên deadline kể cả unpublish/quá hạn. UoW một transaction. Lock: `identity.users` FOR UPDATE trong revalidate, receipt, active attempt FOR UPDATE, chỉ path tạo mới mới `FOR SHARE` exam. Không khóa mọi thí sinh của exam nóng. Receipt actor/key, fingerprint method/path/`{}`, lookup trước effect. Budget OpenAPI 12 gồm auth, CSRF family, rate, BEGIN/COMMIT; vượt thì ghi số đo và lý do, không nâng ceiling. |
| ATT-02 resume/questions/answers | Assessment query + Catalog `frozenQuestionSlice` | In: attemptId, cursor, pageSize 1–100 mặc định 20. Out: Attempt hoặc page. Owner trước khi gọi Catalog. Foreign id là 404. Frozen version của attempt, không theo republish/archive. Questions một projection Catalog sau ownership; answers một statement assessment vì budget 4 không còn lượt cho capability thứ hai, chỉ lấy position/option id, không prompt/key/explanation. Cursor `assessment.cursor.v1` gắn actor, attempt, version, page size, 15 phút theo DB clock. Page cắt 256KiB giữ cursor tại item cuối thực trả. Budget resume/status 3, questions/answers 4. |
| ATT-03/05 save, clear, mark | Assessment | In: 1–20 mutation, full `selectedOptionIds`, marked, expectedVersion. Out: SaveReceipt 200, không chứa nội dung đáp án. Một UoW: user lock, receipt, attempt lock, DB clock sau lock, validate mọi version, choices bounded, ghi batch, tăng `attempts.revision` một lần. Một conflict rollback cả batch. Untouched không có row và đọc là version 0. Mutation được chấp nhận tăng version kể cả cùng giá trị. Empty selection xóa lựa chọn. Single/true-false tối đa một option. Mark không ghi score. |
| ATT-04 retry | Assessment + `platform.idempotency_receipts` | Fingerprint actor/key trên mọi operation, method, path, canonical validated payload phải sort object keys và set-valued IDs theo ADR-003; implementation hiện giữ mọi thứ tự mảng, là defect AR-01 cần sửa. Receipt trước version/deadline. Cùng payload trả ACK cũ và không ghi đè đáp án mới. Payload khác 409. Key v7 cũ hơn 24 giờ theo DB time, khi không còn receipt, 409 và không thành mutation mới. Không triển khai ATT-09. |
| ATT-06 + ASYNC-01 submit | Assessment + outbox port của Assessment | In: không body đáp án. Out: SubmitReceipt 202, Retry-After 2. Trước deadline SUBMITTED; tại/sau deadline EXPIRED và expired=true. Commit state, submissionId, eventId, outbox `attempt.submitted.v1`, receipt. Event không có answers/keys/token. Insert outbox hoặc receipt lỗi thì rollback. Key khác sau khi đã nộp trả acceptance cũ, không thêm event. Không SQS, không fire-and-forget, không PROCESSING/COMPLETED/score giả. Publisher để phase sau; intent đã ACK nằm chờ dispatcher. |
| ATT-08/11 subset | Assessment read + HTTP | Status đọc trạng thái bền, serverNow, canSave, replayPending, pollAfterSeconds. Result chỉ available khi COMPLETED thật. Proved: lost ACK/retry, resume connection khác, session revoke 401, foreign 404, outbox failure rollback. Không đóng full ATT-08/10/11. |
| CAT-10 start race | Catalog lock + Assessment start | Chứng minh request bị block bằng `pg_stat_activity`, không sleep rồi giả định. CAT-10 bị mở lại: locking JOIN sau publish/republish commit còn đọc version từ snapshot cũ (AR-03). |

Evidence local: [raw run 32982df5-10c4-4e5d-aecc-fb0e3cde5938](evidence/assessment-2026-10-07/32982df5-10c4-4e5d-aecc-fb0e3cde5938.json) và [summary](evidence/assessment-2026-10-07/summary.md) sinh từ raw đó. Hai JSON trước đó cùng ngày là sample tuần tự khác, không bị ghi đè. Query thực tế: start 13/12, questions 4/4, answers 4/4, save 18/11, submit 13/10, status 3/3. Vượt trần vì CSRF family lookup, authenticate ngoài transaction, revalidate trong transaction, và save cần năm statement selection/answer. Không nâng `x-query-budget`.

- [ ] **ATT-01 — IN PROGRESS after independent review** Start atomic, quota, active attempt, receipt.
- [ ] **ATT-02 — IN PROGRESS after independent review** Resume, questions, answers, frozen version, byte cursor.
- [ ] **ATT-03 — IN PROGRESS after independent review** Save batch all-or-nothing và optimistic version.
- [ ] **ATT-04 — IN PROGRESS after independent review** Receipt/fingerprint và key cũ đã prune.
- [x] **ATT-05** Clear và mark.
- [x] **ATT-06** Manual submit trước/sau deadline.
- [ ] **ATT-08 — SUBSET** Status bền đã chứng minh. Result/history không đóng.
- [ ] **ATT-10 — SUBSET** Lock qua deadline, duplicate start, republish freeze đã chứng minh. Review mới bổ sung hai save và observed save/submit race PASS; publication/start còn AR-03. Không đóng toàn bộ.
- [ ] **ATT-11 — SUBSET** Replay, resume connection khác, revoke, foreign owner, outbox rollback đã chứng minh. Process restart sau commit mất ACK chưa có. Không đóng toàn bộ.
- [x] **ASYNC-01** Outbox trong transaction submit. Không có dispatcher.
- [ ] **CAT-10 — IN PROGRESS after independent review** Unpublish/start control PASS; first-publish và republish/start races RED (AR-03).

## Active scope — Grok Assessment core handoff, 2026-10-07

User requests the prompt for the next increment. Deliver [993-word handoff](grok-assessment-core-implementation-prompt.md), grounded in current source/schema/OpenAPI and Catalog fix closure. This increment edits documentation only; it does not implement or accept Assessment runtime, migrate a database or deploy AWS.

Proposed Grok scope: ATT-01–06; actual start/publication concurrency from ATT-10/CAT-10; durable status subset ATT-08 and backend fault/ownership subset ATT-11. Include transaction-side outbox ASYNC-01 because submit durability requires it. Keep scheduler/retention, full result/review acceptance, grading/SQS/Reporting/Web/AWS and ID-11/Phase04 pending. Do not tick wider items from a partial subset. Record independent local scope before Grok code starts; SES is not waived or marked complete.

Inspected gaps included explicitly: getPublishedPolicy is a nonlocking projection; item-limited frozen questions need decoded-byte pagination for the Assessment HTTP contract; attempts lacks the required revision column. Public capability extensions and forward migrations must remain owned, tested and bounded; no Catalog-private access or contract relaxation.

- [x] Inspect current roadmap, pure Assessment helper, Catalog public capabilities/SQL, persisted attempts/answers/outbox and HTTP/event contracts.
- [x] Write ordered prompt with boundaries, transactions/retry, RED concurrency/security/fault tests, diagnostics and honest status/evidence rules.
- [x] Validate links/contracts/import guards, prompt word count/scope and documentation diff; quality/contracts/diff PASS,993 words/12 steps, product count61/216 unchanged. No runtime tests rerun for this documentation-only handoff.

## Active scope — Catalog fixes and architecture conformance COMPLETE locally, 2026-10-07

User authorizes fixing GR-01–06 from the independent review while following the existing Architecture Contract. Preserve all prior RED/diagnostic evidence, migrations0001–0009, public OpenAPI behavior, pg decision, worktree UI edits and Phase04/production gates.

| Work | Owner / boundary | Invariant / checks |
| --- | --- | --- |
| GR-01 publication | Catalog Application + Domain / repository DB clock and locks | Resolve close eligibility after exam + bank serialization locks; same UoW for version/pointer/audit/receipt. Preserve receipt replay. Real PG lock-close, timeout rollback and republish regressions first. |
| GR-02 HTTP limits | Catalog Presentation declares bounded limits; reusable global HTTP adapter applies generic route metadata | No Catalog URL/policy table in global infrastructure; POST/PUT exam128KiB, question512KiB, import1MiB cover declared limits plus UTF-8/escaped surrogate-pair JSON. Domain/Presentation/import use Unicode code-point limits. Identity default16KiB unchanged. Actual HTTP valid/oversized/security cases. |
| GR-03 read DTO | Catalog query adapter maps exact PublicExam | Cursor sorting field stays inside BrowseRow, never leaks into detail. Validate real response with existing OpenAPI schema. |
| GR-04 calendar | Catalog Domain pure validation | Round-trip UTC components at supported millisecond precision; reject normalized invalid dates, accept valid leap days/fractional precision. Unit and real HTTP cases. |
| GR-05 test discovery | Root Jest configuration/package tooling | Backend Jest, Node scripts and Web Vitest all run in root verification; no removed/disabled tests. |
| GR-06 evidence | Integration-only diagnostic instrumentation / module SQL adapters | EXPLAIN actual captured adapter SQL, separate publish window with real transaction/lock/pool observations, null for absent samples. Unique ignored run output, source/config/migration hashes and summary generated from that run. No raw SQL/parameters/credentials in exported diagnostic. |

Plan: preserve baseline hashes → write/run RED regressions → minimal behavioral/boundary corrections → focused GREEN → complete unit/integration and shared HTTP HTTPS checks → capture fresh diagnostic/evidence → self-review/update status. TDD skill delegates independent publication reproduction tests to a subagent; main agent owns runtime fixes and remaining regression/evidence work. No module/ORM/framework migration or Assessment implementation is required by these fixes.

- [x] F-01: RED regressions for publication/body/schema/calendar and runner scope; Unicode mismatch also reproduced before fix.
- [x] F-02: Fix behavior and keep Presentation → Application → Domain/Ports; pg stays Infrastructure.
- [x] F-03: Diagnostic exact SQL/publish observations, unique output/provenance and metadata correction; new generated summary frozen separately.
- [x] F-04:199 root cases,83 real-PG/SMTP and10 HTTPS PASS; full validation/self-review and evidence restore BOOT-01/CAT-01/03/04/06/08 only. CAT-10/ID-11/production remain open.

[Fix report](catalog-fixes-2026-10-07.md) and [evidence](evidence/catalog-fixes-2026-10-07/README.md) are current closure. Roadmap61/216 checked,155 pending. The prior sections below record historical states before these fixes; they do not override current acceptance.

## Historical scope — Independent Catalog review before fixes, 2026-10-07

User yêu cầu review phần Grok đã chạy. Đối chiếu prompt, source/contract/PG behavior và changes ở shared HTTP/Identity; giữ UI work nguyên. Lượt này chỉ thêm reproduction/evidence/report và sửa status, không triển khai runtime fixes hoặc Assessment.

[Review report](catalog-review-2026-10-07.md) ghi GR-01–06. Bộ review riêng: 5 RED / 1 PASS; 63 integration PASS với diagnostic cũ deselected; 71 API Jest PASS nhưng root runner FAIL, 34 Node và73 Web PASS riêng; 10 HTTPS PASS. Migration0001–0008 giữ bytes,0009 built đúng. Root runner issue tồn tại trước Catalog, vẫn mở lại BOOT-01 để sửa discovery. CAT-01/03/04/06/08 mở lại; roadmap55/216 checked. [Evidence](evidence/catalog-review-2026-10-07/README.md).

- [x] Inspect diff và canonical architecture/product/OpenAPI; xác định review scope/owners.
- [x] Tái hiện trên restricted PostgreSQL/HTTP, kiểm chứng cursor control và shared Identity HTTPS regression.
- [x] Báo cáo findings theo priority, lưu provenance và cập nhật checklist đúng trạng thái.
- [ ] Sửa GR-01–04 với regression tests thật; không tick Catalog vì existing happy-path tests PASS.
- [ ] Sửa GR-05 test discovery và GR-06 diagnostic/provenance; chạy lại review/regressions rồi mới nghiệm thu.

## Prior implementation — Catalog local, 2026-10-07

Phase04 chưa đóng vì ID-11 live SES còn PARTIAL. Increment này chỉ làm Catalog độc lập trên PostgreSQL local: draft/bank, publication bất biến, projection và import v1. Không đóng Phase04, không bỏ gate SES, không làm Assessment lifecycle, scoring/SQS, Reporting, Terraform, magic link, GitHub hay redesign Web. Worktree Web UI chưa commit được giữ nguyên.

Ngoại lệ phạm vi: Catalog không chờ live SES vì không gửi mail và không đọc private repository của Identity. Auth dùng public facade `identity/application/facades/identity.facade` (authenticate, requirePermission, revalidate trong transaction) và request guard bọc HttpSession hiện có. Gap đã đối chiếu, không bịa endpoint: sections/membership chỉ nằm trong `ExamWriteRequest`; không có route section riêng. `QuestionWriteRequest.points` không có cột trên `catalog.questions` (points chỉ ở membership) nên cần migration forward `0009`. Example replace question ghi `expectedRevision: 0` trong khi create mới là revision zero; replace thực thi expectedRevision > 0. Body limit toàn cục 16384 byte không đủ import 1MiB; chỉ route POST import được nâng giới hạn. CAT-10 không tick đủ vì chưa có Assessment start thật.

| Task | Owner | Contract |
| --- | --- | --- |
| CAT-01/02/04 draft | Catalog application + domain write repository | In: `ExamWriteRequest`, session cookie, Idempotency-Key UUIDv7, Origin/CSRF. Out: `MutationReceipt` 201/200. Permission `catalog.manage`. Invariant: revision create = 0 rồi lưu 1; replace khớp revision rồi tăng; section/position/bank question không trùng; draft được rỗng nội dung nhưng schedule bắt buộc. Transaction: exam + sections + membership + audit + receipt. Lock: user → exam → bank question id tăng dần. Idempotency: fingerprint SHA-256, receipt trước revision check, retry cùng payload trả receipt cũ. Query: một statement ghi. Tests: revision race, lost ACK, audit rollback. |
| CAT-03 bank | Catalog | In: `QuestionWriteRequest`. Out: receipt hoặc `AdminQuestion`. Create/replace/archive `catalog.manage`; đọc `catalog.keys.read` và audit-read. Invariant: single một key, multiple tập key thuộc options, true/false đúng hai options và một key; points 1–1000 sau migration; text limits; không HTML trusted. Transaction: question + options + audit + receipt. Lock: user → question. Archive giữ row để draft/snapshot còn tham chiếu. |
| CAT-05 import | Catalog | In: `ImportRequest` schemaVersion 1, ≤100 câu, ≤1MiB, không CSV/URL. Out: `ImportReport`. Permission `catalog.import`. Malformed 400 và không ghi report. Semantic invalid 200 valid=false committed=false. Dry-run và import thật đều có report/audit/receipt; chỉ import thật insert bank, all-or-nothing. Retry trả cùng report/IDs. Report không chứa prompt/key. |
| CAT-06/07 publish | Catalog | In: `RevisionRequest`. Permission `catalog.manage`. Invariant: 1–500 câu, 1–20 section không rỗng, duration/attempt limit, open < close, chưa closed theo DB time, timezone IANA, default explanation có thể NEVER. Một transaction: version tăng, snapshot id mới, policy, current pointer, audit, receipt. Không UPDATE snapshot. Unpublish chỉ chặn policy hiện hành. Republish tạo version mới. Bank edit không đổi snapshot. |
| CAT-08/09 read | Catalog query port + `CatalogFacade` | Browse/detail `catalog.read`: metadata, cursor `(publishedAt, examId)`, filter/watermark/page size, không OFFSET, không question/key. Budget OpenAPI 3 query/request gồm auth + admission + một projection. Facade: `getPublishedPolicy`, `getFrozenQuestionPage`, `getScoringSnapshot` dùng transaction hiện có, không phải HTTP anonymous. Scoring snapshot tách DTO thí sinh. |
| CAT-10 evidence | tests + diagnostic | Real PG restricted role. Start-race của Assessment giữ PARTIAL. Diagnostic browse/detail/publish ghi query, EXPLAIN, pool, payload, p50/p95/p99; không phải SLO/RPS/AWS. |

- [ ] **CAT-01 — IN PROGRESS** CRUD exam draft với expectedRevision, receipt, audit.
- [x] **CAT-02** Section và ordering nằm trong replace draft, không route riêng.
- [ ] **CAT-03 — IN PROGRESS** Question bank single/multiple/true-false và archive giữ reference.
- [ ] **CAT-04 — IN PROGRESS** Gán bank question, points, không lặp, FK.
- [x] **CAT-05** Import JSON v1, dry-run, all-or-nothing, retry.
- [ ] **CAT-06 — IN PROGRESS** Publish atomic snapshot.
- [x] **CAT-07** Unpublish/republish, không sửa snapshot.
- [ ] **CAT-08 — IN PROGRESS** Browse/detail/admin projections, không lộ key.
- [x] **CAT-09** Public facade cho Assessment.
- [ ] **CAT-10 — PARTIAL** Publish/update concurrency, invalid import key, explanation leak và revoke đã có integration PostgreSQL. Start race của Assessment chưa có nên mục này không được tick. Review bổ sung post-lock clock/body/date/response gaps và exact-query/publish diagnostic pending.

Kết quả local 2026-10-07: migration forward `0009_catalog_question_points.sql` áp trên database disposable; 0001–0008 không đổi byte. Một lần chạy integration 64/64 PASS (database 31, Identity 22, Catalog 11) khi Mailpit local đang chạy. Diagnostic không chứng minh capacity. Phase04 và ID-11 giữ mở.

## Prior scope — Identity browser HTTPS COMPLETE locally, 2026-10-07

User authorizes the next increment after retaining pg and SQL normalization. Finish local ID-07/browser evidence with the existing live SPA, real AppModule/HTTP server, restricted PostgreSQL roles, immutable migrations and actual verification worker/SMTP delivery. Catalog, SES/AWS deployment, public certificates and general frontend acceptance remain separate work.

Owners: Identity application/infrastructure/presentation for durable auth; Web auth transport/session and forms for browser behavior; isolated test tooling for TLS/proxy/fault injection. Preserve final-owner password activation, single-use challenge, signed family-bound CSRF, exact Origin, Secure/HttpOnly cookies and database authority. Test fixtures may expire/revoke disposable records; no runtime test endpoints or relaxed production controls.

- [x] H-01: Dedicated HTTPS harness, ephemeral restricted keys/certificate, disposable database/roles, live build and actual Mailpit worker delivery. Normal teardown drains resources/removes DB/logins/temp keys; runner stops containers. Browser leaf SPKI exception and Node CA/SAN checks are scoped to the run, no OS trust changes.
- [x] H-02: Real browser register/duplicate202, actual mail, suppressed resend/cooldown, inert/scrubbed landing and reload, final password, invalid/expired/replayed link/login PASS. Replay does not replace the first activation password or create a session.
- [x] H-03: Secure cookie/Origin/CSRF/header proof; two shared-cookie tabs refresh once, profile200/409, restart/revocation/logout, commit-lost ACK and body timeout PASS. Fixed unknown-recovery reset, fresh-CSRF logout retry, body I/O/timeout, anonymous verification enforcement and direct profile reauth action after RED reproduction.
- [x] H-04: 10 real Chromium HTTPS cases,73 web unit cases (64 auth/existing +9 concurrent public-experience cases),100 backend unit/tooling and53 real-PG/SMTP integration PASS. Lint/quality/contracts/typecheck/build/diff and migration preservation checked. [Evidence](evidence/identity-https-2026-10-07/README.md)/[runbook](runbooks/identity-https.md); ID-07/WEB-02 local, FE-07–10 closed. Public PKI/SES/AWS and broader Web gates remain pending.

Execution: inspect latest UI fixes → build harness/tests → capture failing behavioral evidence → repair only reproduced defects → rerun focused checks → broader regressions → review diff and update roadmap/acceptance. Do not overwrite historical frontend or persistence evidence.

Self-review: no new business dependency, runtime test endpoint, ORM/cache/service, schema/migration, JWT/public JSON change or transaction/event rewrite. Security contract is enforced at the HTTP port/controller; logout anonymous retry cannot authorize a live family. Browser recovery resets only after explicit confirmed login, with stale-generation protection. Receipt retry keeps one durable write; no latency/cost improvement is claimed. Concurrent public UI/Three.js work was preserved and is not accepted as a performance/visual phase by the auth suite. Product52/216 and FE7/32; Phase04 still awaits ID-11 live SES.

## Active scope — SQL readability COMPLETE locally, 2026-10-07

User accepts retaining pg provisionally and requests a query-format rule plus normalization of existing SQL. Ownership remains Identity persistence and shared technical PostgreSQL adapters; include executable test fixtures, local tooling and operational SQL. Read/write paths, bindings, domain invariants, transaction/lock boundaries and public contracts must remain unchanged. This is code-shape work, not an ORM, schema or query optimization change.

- [x] QF-01: Canonical SQL layout adopted in conventions §102.1/rule R-77; AGENTS, validation workflow and database guide point to it. Clauses, projections, predicates, CTEs/subqueries, mutations, bindings and short-query exceptions are specified.
- [x] QF-02: Current runtime, integration fixtures, local tooling and operational queries normalized across14 code/SQL files. Reviewed locking clauses, EXTRACT, JSON pairs, shared projections and PL/pgSQL bootstrap blocks. Eight immutable migrations and historical experiment sources/evidence preserve their bytes; future migrations use the convention.
- [x] QF-03: Token/literal/interpolation/binding and surrounding semantic AST comparison PASS across84 code files/274 SQL literals or fragments plus3 operational SQL files. All53 scoped historical files unchanged;8 source/built migrations match captured SHA-256. Prettier, lint/quality/contracts, typecheck/build,100 unit/tooling and53 real PostgreSQL/Identity regressions PASS. Bootstrap and diagnostics execute on dedicated local PostgreSQL:55434. See [validation](validation.md#sql-readability-normalization--2026-10-07) and [verification ledger](evidence/sql-format-2026-10-07.json).

Self-review: one active connection/UoW, query operation labels, parameter arrays, static interpolation, quoted aliases/literals, locks, result shape and statement order are unchanged. No runtime formatter/dependency, ORM switch, schema/HTTP/event or performance optimization was added. Formatting tooling ran from `/tmp` only; short technical commands and intentional migration-parser fixtures remain compact. Separate Web UI work, Git staging and historical benchmark results are preserved. Product roadmap and production acceptance are not advanced by this maintenance increment.

## Status note — Web UI local fix, 2026-10-07

This note does not replace the SQL readability scope above and does not reopen the persistence evaluation. Local `apps/web` exists. FE checklist remains 3/32 checked. Preview regressions for the reviewed deadline, reauth, 403 cache, answer pagination and editor-revision cases are recorded in [fix evidence](web-ui/evidence/fix-2026-10-07/README.md). HTTPS, live Catalog/Assessment/Reporting and WEB-01–10 stay open. No production acceptance is claimed.

## Active scope — persistence evaluation COMPLETE locally, 2026-10-07

User authorizes O-01–04: compare current pg with TypeORM and Sequelize before selecting persistence. Keep existing Web UI work and staging untouched. The experiment has its own pinned package/lockfile and disposable PostgreSQL on a separate port; no runtime ORM switch, applied migration rewrite, API or AWS change is authorized by this evaluation alone.

Identity owns the representative paths: principal projection, account mapping, session refresh and profile + audit + actor-scoped receipt. The existing Application and Domain contracts remain unchanged. Candidate executors must preserve one active transaction/connection, nested join/rollback-only, late-context rejection, bounded admission, server timeouts, safe errors and graceful pool drain. ORM models are experiment Infrastructure only; synchronize and automatic migrations are disabled. Raw projections and ORM repository paths are measured separately.

Sequence: pin/verify dependencies and capture source/config/schema digests; write failing real-PG transaction/correctness checks; implement isolated candidate adapters; run hard gates; seed 100,000 Identity users/families/sessions; run repeated interleaved comparisons at fixed pools/concurrency; retain raw samples, query/lock/transaction/pool/CPU/RSS/startup and query plans; inspect dependency/TCO burden; write ADR and adoption/rollback decision. Use the same compiled Identity classes, ES256 crypto, privileges, schema and durable controls across candidates. Local closed-loop measurements are not sustainable AWS capacity, exam load-test acceptance or dollar savings. Reject failed candidates regardless of latency.

Outcome: O-01–04 complete locally; [experiment](../experiments/persistence-comparison/README.md) retains75 configurations/76,800 samples/0 errors and42 checks. Current runtime regression evidence is100 unit/tooling +53 integration PASS. pg queued-work drain failure was reproduced and corrected before measuring; no schema/contract change. [ADR-008](adr/008-persistence-evaluation.md) retains pg for current Identity, allows later TypeORM reopening, and records Sequelize dependency/logging/lifecycle gaps. Production dataset/capacity/RDS/AWS/TCO remain separate open gates. Existing frontend work/staging is not accepted or changed by this task.

## Active scope — Web UI documentation/task handoff COMPLETE, 2026-10-06

The user requests a detailed UI implementation brief and tasks for Grok before the ORM comparison. Deliver [web-ui handoff](web-ui/README.md): committed visual direction/tokens/screens, truthful API/state mapping and dependency register,32 ordered frontend tasks with acceptance,24 scenarios and a prompt around1,000 whitespace words. ADR-007 specializes frontend build/layout choices without changing backend architecture. This increment creates documentation only: no frontend scaffold/package/runtime, backend/ORM/API change or AWS action.

Owners are presentation/features in the future apps/web client; Identity/Catalog/Assessment/Reporting remain backend authorities. Existing product/security/OpenAPI were inspected, including actual Identity controllers. The brief separates interactive demo, live Identity, missing business endpoints and production acceptance. Current Profile has no permissions; frozen presentation metadata/replay revision/search/report fields are explicit backend dependencies, not frontend fabrications. Product count remains50/216; FE implementation0/32, ORM evaluation0/4. Validate links/schema mapping/task IDs/word count/diff and record documentation checks; prior152 tests remain historical runtime evidence for unchanged sources.

## Source-layout normalization COMPLETE, 2026-10-06

The user authorizes completing the structural adjustment after the documentation/review increment. Implement N-04–12: fail-first guard regressions; baseline diagnostic; config/shared/database/HTTP/Identity moves; public worker/operator factories; immutable SQL bundle copy and CLI path updates; unit/real-PG/smoke/drain checks; repeated comparable diagnostic and final self-review. Preserve all auth/session/rate/receipt/worker/transaction semantics and eight migration checksums. No schema/ORM migration or Catalog expansion is included; O-01–04 remains the separate proposed persistence experiment.

Owning modules: Identity for account/session/verification/public worker+operator capabilities; Assessment for unchanged domain helpers; technical config/shared/infrastructure/workers for process/DB/HTTP mechanics. Application owns existing atomic writes; one pg transaction executor resolves the active client for every repository/audit/receipt call. Read-side principal/CSRF projection is split from domain write contracts without additional SQL or API changes. Public HTTP/events remain unchanged.

Execution: capture baseline before runtime moves; strengthen guard first; relocate with exhaustive literal import/path mapping; separate typed config/validation from secret I/O; extract domain persisted types + application read port; bind public capabilities in composition roots; update build/assets/scripts/tests/docs; run supported checks and self-review. Mark each normalization item only with actual evidence in validation and experiment artifacts.

Outcome: N-01–12 complete;100 unit/tooling +52 real-PG/HTTP/SMTP integration tests PASS; typecheck/build/lint/quality/contracts, actual migration/API/worker/operator CLI checks PASS. Six repeated local diagnostic runs keep query counts while some p95 observations increase; no performance improvement claim. RV-01–05 CLOSED, browser/live SES/AWS gates remain open. Current pg adapter is retained within scope; O-01–04 is proposed, unmeasured and separate. See [normalization checklist](architecture-normalization-plan.md), [validation](validation.md) and [experiment](../experiments/architecture-normalization/README.md).

The [marked roadmap](implementation-roadmap.md) is the delivery-status source. Initial narrowed work delivered standards/bootstrap, then user authorized contracts, PostgreSQL and Phase04 Identity runtime. Historical sections below record those increments; the Phase04 section records the prior runtime outcome. The active scope above records the completed source-normalization increment. AWS production acceptance remains pending.

Affected standards: AGENTS.md, architecture entry point, .ai architecture/rules/conventions/workflow/overview/module-template, project profile and ADR-001/002. New documentation: module guide, performance protocol, contract-test matrix, production acceptance ledger and experiment template.

Previously opened code work: pure Assessment Attempt lifecycle and exact-match scoring with fail-first Jest tests; TypeScript/ESLint/Prettier configs; local PostgreSQL/ElasticMQ Compose. These do not implement API/use cases/UoW/schema/session/worker/frontend/Terraform/k6. Unused runtime dependencies and nonexistent run commands are removed from the bootstrap so the current repository only advertises checks it can run.

Validation: domain unit tests, typecheck/build, lint, standards links/anchors/import/test placement, npm audit, Compose health/local queue. Record actual results in validation.md and tick matching roadmap IDs. No AWS resources are created or benchmark results fabricated. Git is not initialized; no diff/PR can be claimed.

Next implementation order after this scope: product contracts → database/UoW/Identity/Catalog → Assessment/scoring → reporting/browser/observability → Terraform/CI → dataset/load/failure/FinOps → evidence-based production acceptance. Each phase is split into small reviewable changes with tests and updated evidence/status.

## Review of completed checklist items

User requests reviewing the 18 completed items before advancing. Inspect each checked artifact and rule consistency, rerun appropriate local checks, and reopen/fix defects with regression tests before restoring completion status. Current findings: Attempt hydration permits inconsistent lifecycle/expiration state; import checker misses import-type/import-equals, bare Node network modules and technical-folder barrel imports; database task dependencies require later business flows too early. Check local SQS URL consistency and permanent guidance for stale turn-specific scope. Owner: Assessment domain for lifecycle invariants; quality tooling for literal import checks; standards/roadmap for documentation. No API/AWS implementation or migration/network production operation is included. Domain changes remain pure and transaction-independent. Required evidence: failing regressions, passing unit/tooling tests, lint/typecheck/build/quality, local Compose/DB/queue checks and explicit unresolved dev-audit findings. Record the final per-item verdict in docs/completed-checklist-review.md.

Review outcome: findings were repaired with regressions, the completed 18 items are retained with fresh evidence, and phase 02 is the next scoped work. See [completed-checklist review](completed-checklist-review.md).

## Detailed next-work report

The user requests a detailed report of the next work. Deliver [phase 02 plan](phase-02-plan.md), mapping SPEC-01–11 to decisions, owners, planned artifacts, acceptance examples, execution order and the gate before database/application implementation. This turn changes planning documentation only. The specification artifacts themselves remain pending; the roadmap retains 18 completed items. Validate document links and standards consistency with `npm run quality`; do not infer runtime or AWS verification from this report.

## Phase 02 execution — COMPLETE

The user authorizes implementing the reported next phase. Deliver SPEC-01–11: product/version/time/attempt/retry/release/ranking policies, permissions/import/retention, OpenAPI, versioned event schema, SLO/workload and acceptance-case traceability. Owners remain Identity, Catalog, Assessment and Reporting; writes retain the existing UoW/lock/outbox/inbox contract. Select and justify product defaults without changing architecture boundaries. Record any conflict as an ADR. Add dev-only OpenAPI/JSON Schema validation with fail-first tooling tests; validate schemas and examples, then run tests/typecheck/build/lint/quality. Update profile/ledger/roadmap with artifacts and measured local checks. API/SQL/worker/AWS implementations remain subsequent phases; no production commitment or benchmark is inferred from specification delivery.

Outcome: SPEC-01–11 artifacts delivered and [reviewed](phase-02-review.md), 48 tests/typecheck/build/lint/quality pass. ADR-003 bounds receipt storage without unsafe old-key replay. Roadmap now 29/212 complete; next phase is DB/migrations/UoW and the pending Git/bootstrap tasks, not AWS benchmarking without runtime/evidence.

## Phase 03 execution — DB-01–11 COMPLETE, DB-12 PARTIAL

User authorized continuation. Followed [Phase 03 plan](phase-03-plan.md): six immutable migrations, capability schema/snapshots/constraints, owner vs runtime roles, plain UoW with pg/AsyncLocalStorage, bounded pool/timeouts, connection-budget CLI, redacted observations/pg_stat_statements and real PostgreSQL tests. Applied local CLI migrations, performed [self-review](phase-03-review.md), repaired invariant gaps with failing regressions, and updated roadmap to40/212. [Database guide](database.md), ADR-004 and migration runbook explain implementation/limits. 67 unit/tooling +30 integration cases pass. Business use cases/AWS/benchmarks remain future phases. DB-12 is deliberately unchecked: runbook delivered, actual old/new image drill requires BOOT-10/CI. No background work remains. Next: Identity and composition roots; Git remote still unspecified.

## Phase 04 plan and authentication contract amendment

User requested a detailed implementation explanation, then amended Identity: email/password with single-use email verification links now, asymmetric private/public signed access/refresh, magic link and GitHub later. Deliver [Phase04 plan](phase-04-plan.md), [ADR-005](adr/005-email-verification-and-signed-tokens.md), updated rule/architecture/security/product/OpenAPI/SLO owners, roadmap ID-10–13 and focused fail-first contract tooling regressions. This amendment precedes Identity runtime implementation. Existing six migrations/UoW are inspected but unchanged; plan new forward migrations, schema/privacy/grant restrictions and Identity-owned durable encrypted mail outbox. Retain PG session authority, cookies/CSRF and bounded hashing; no auth cache, external provider framework or unnecessary mail queue. Final password at activation protects against attacker pre-registration. Signature algorithm ES256/P-256 is an unmeasured standards choice, not a FinOps result.

Review/evidence: [auth contract amendment](phase-04-contract-review.md). Roadmap remains40 delivered, now216 total/176 pending due to four new Identity items. Runtime ID-01–11/BOOT-10 remain pending; ID-12/13 LATER. Git remote/AWS account/region/sender and domain are unselected; no real mail or key material is generated in this amendment. Contract-only validation does not close crypto/session/email/browser/AWS gates.

## Phase04 runtime execution — LOCAL CORE DELIVERED, ID-07/11 PARTIAL

User authorized implementation, then requested rereading changed folders. Inspected and adopted module-level composition, grouped Identity ports/errors/persistence/security/mail/http/DTOs, technical platform error categories/idempotency, generic HTTP setup and null success envelope. Updated conventions/architecture placement guide and quality boundary tests without changing capability ownership.

Implemented BOOT-10/ID-01–06/08–10: two new forward migrations, private/public ES256 credentials, bounded Argon2, email activation/final owner password, sessions/refresh/reuse/logout/current permissions/profile receipts, audited operator bootstrap, encrypted email outbox/SMTP/SES adapters, least-privilege worker, fencing/retries/park/replay/maintenance. Hash/provider I/O outside UoW; user-first locks and durable security effects. Real regression tests repaired logout lost-ACK CSRF, concurrent login limit, bucket lifetime and final-attempt crash handling.

[Runtime review](phase-04-review.md), [operations runbook](runbooks/identity-operations.md), [experiment](../experiments/identity-local/README.md) and validation inventory record evidence. Roadmap50/216 completed; ID-07 browser HTTPS/WEB-02 and ID-11 live SES operations remain PARTIAL, ID-12/13 LATER. No Catalog work automatically started; no Git/remote/AWS resources. Full SLO/cost/restore acceptance is not inferred from local tests.

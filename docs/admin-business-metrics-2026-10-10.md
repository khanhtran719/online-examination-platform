# REP-05 Business metrics — 2026-10-10

Status: COMPLETE locally; production NOT ACCEPTED. Local scope BM-01–06 only.

## Contract and implementation plan

Reporting owns additive READ GET /v1/admin/business-metrics with reporting.read.
Existing /v1/admin/metrics and its mandatory HTTP/SQS fields stay specified and
unchanged: no provider exists to populate those fields truthfully. This endpoint
has its own DTO; Web wiring, technical telemetry/AWS integration and production
acceptance remain separate. No new schema/index/resource is planned without evidence.

A cohort is attempt started_at in [from,to), excluding CREATED. Both canonical UTC
millisecond parameters (years0001–9999) must be supplied together; default preceding24h using the
primary statement clock, max7days and to<=asOf. Counts describe current durable
state, not event rates/completions that occurred in the window: startedAttempts,
submittedAttempts, completedAttempts, failedAttempts, expiredSubmissions,
expiredCompletedAttempts, activeAttempts (IN_PROGRESS and deadline>asOf). Purged
COMPLETED tombstones still count; no answer/result/Identity PII join. Opt-out,
disabled candidate, archived exam and version changes do not filter this aggregate.
Counts are per attempt, not unique/concurrent users. No time series or AWS bill.

Backlog is global and independent of the cohort: submitted SUBMITTED/EXPIRED/
PROCESSING plus FAILED with replay_pending=true. Count replay subset separately;
oldest original submitted_at and age at asOf preserve retries/replay age. No row
means null timestamp/age, not unknown=zero. Terminal FAILED without replay and
COMPLETED (including purged) are excluded. Transaction-local PROCESSING may never
be externally observed; do not manufacture worker activity or SQS depth.

Current Identity authentication/permission/admission precede input mapping;
locked revalidation, one primary consistent aggregate and mandatory safe audit
commit in the existing UoW before response. Audit action reporting.business-
metrics.read targets BUSINESS_METRICS with fixed global scope UUID00000000-0000-
4000-8000-000000000000; no counts/window payload. Query reads declared Assessment
attempt columns only. No source writes, COUNT DISTINCT, full aggregates, cache,
SDK/network calls, public facade export, cursor or per-row queries. Expected8 SQL
calls including auth/admission/BEGIN/revalidation/projection/audit/COMMIT. Existing
statement/lock/acquisition/admission bounds remain. Result payload budget4KiB.

A global aggregate may scan all attempt identities; a7day filter limits semantics,
not physical work. Measure natural100k/1M plans and raw sequential diagnostics;
no forced index or capacity/optimization/AWS savings claim. A production poll
interval requires measured load; initial operational guidance manual refresh or

> =30s+jitter, pause hidden. No snapshot is authority for writes or authorization.

- [x] BM-01 Inspect source/contract/rules; record time/count/backlog/audit semantics,
      protected historical hashes and additive API decision.
- [x] BM-02 Fail-first pure count/time/invariant and Application safety tests.
- [x] BM-03 Private Reporting ports/service/query/DTO/controller wiring;
      OpenAPI/ADR/AC scenario, preserving combined metrics contract and exports.
- [x] BM-04 Restricted-PG/HTTP count boundaries/state/replay/purge/permissions/audit,
      atomic committed visibility, query budget and actual compiled TCP composition.
- [x] BM-05 Natural100k/1M aggregate plans, payload/latency/CPU/RSS/pool/transaction
      diagnostics with raw artifacts; local baseline only.
- [x] BM-06 Relevant/full checks, self-review, migration/history preservation,
      cleanup, runbook/evidence/docs/roadmap closure.

REP-04 privacy ledger/deletion/restore, REP-06 audit lifecycle, REP-07 exports,
Web, technical telemetry and AWS gates remain open. A checked REP-05 will mean
its named local business count/backlog deliverable, not full Reporting acceptance.

## Self-review and closure evidence

Architecture: thin HTTP adapter, pure Domain count/time/subset policy, plain
Application current Identity revalidation/UoW/projection/access audit, private pg
adapter with declared physical source. No framework/driver/SDK/HTTP/crypto imports
in business layers; no source repository/import/write or new public export.
Counters remain exact integers, fail closed above2^31-1 or inconsistent subsets;
empty backlog null differs from nonempty age0. Explicit requested bounds must
match projection bounds; future bound uses primary time. All counts/backlog share
one statement snapshot. Fresh grading/replay/purge alter current counts without
inventing immutable event rates. Source migrations need dependency re-review.

Two missing implementations RED, then36 units GREEN; explicit window mismatch
RED→GREEN gives37. Review reproduced invalid year0000 RED; validation now rejects
it before PostgreSQL and adds the38th unit case. Initial PG15 PASS/1 FAIL was a
fixture event-field error (accepted time is occurredAt, not payload.submittedAt).
Expanded17 then final18 business-metrics cases PASS, including canonical-year
validation, restricted grants, real duplicate grading/replay/purge, committed
visibility, audit and locks. Compiled AppModule/TCP includes actual route checks.

Final559 root cases (421 API/47 suites,42 tooling,96 Web),379 full integration/
22 suites/0 skipped in313.296s PASS. First full377 PASS/1 FAIL was an existing
SQS SDK happy-path fixture; original cause unconfirmed. Happy path now has1000ms
while the dedicated deadline test retains100ms/<400ms/one attempt. Production
SQS code/config is unchanged; raw failures and the source-overlap caveat remain
in evidence. SQL predicate line breaks preserve435 tokens, literals, bindings
and adapter code. Fresh build and18 post-format PG cases in99.838s PASS.
Lint/typecheck/quality/contracts48 operations/445 examples PASS.18 source/build
migrations match,521 prior files remain unchanged,65 source hashes recorded.
Fixture cleanup has0 other DBs/logins/connections/temp key directories; test
containers stopped, volumes retained, development55432 untouched. Work is on
local branch codex/rep05-business-metrics with prior workspace changes preserved;
no commit, PR or deployment. No browser HTTPS rerun.

[Full-regression raw](evidence/admin-business-metrics-2026-10-10/diagnostic/diagnostic-90744966-806b-4096-8a88-153aa7c28ebe.json):
query p95/p99≈57.659/58.551ms at100k and544.616/544.729ms at1M; paced inject
HTTP p95/p99≈85.462/85.919ms and571.073/572.928ms,507/511bytes,8 SQL calls.
Independent [post-format raw](evidence/admin-business-metrics-2026-10-10/diagnostic/diagnostic-0512b881-e868-49df-afc5-30c6bbab0117.json)
gives HTTP p95/p99≈91.039/241.397ms and645.738/682.557ms. Whitespace changed
no query behavior; sample variance is not a performance improvement. Natural
plans show O(N) sequential scan, current-access locks held through audit; no
indexed scan/saturation/optimal pool/SLO/capacity/cost winner.

No schema/index/resource is accepted as an optimization from these baselines.
Concurrent/skewed reports mixed with autosave/submit/grading, primary utilization
and production poll/admission policy remain open. Combined HTTP/SQS metrics,
Web wiring and AWS acceptance remain separate. Roadmap85/216 checked,131 pending.
Next proposed bounded increment: REP-06 audit lifecycle (existing append-only
admin writes are partial; browse/access policy, retention and recovery checks
require their own plan and evidence). No other implementation is running.

[Evidence and failure history](evidence/admin-business-metrics-2026-10-10/README.md),
[runbook](runbooks/admin-business-metrics.md), [ADR-014](adr/014-business-metrics-snapshot.md).

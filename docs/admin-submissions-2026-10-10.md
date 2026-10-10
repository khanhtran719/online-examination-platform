# REP-02 Admin submissions and scores — 2026-10-10

Status: COMPLETE locally. Local implementation acceptance only; production remains
NOT ACCEPTED. REP-01 and historical evidence are preserved.

## Scope and contract

Reporting owns two READ operations: exam-scoped submissions/attempt ledger and
Admin result detail. Current `reporting.read` allows all exams in this single
platform (no tenant scope exists). The existing AdminSubmission schema includes
unsubmitted attempts: CREATED/IN_PROGRESS have null submittedAt and scores.
SUBMITTED/EXPIRED/FAILED also have null scores; only durable COMPLETED has scores.
Do not turn failure into zero. Include all attempts, not just best leaderboard
entries. Optional publishedVersionId must belong to the requested exam; absent
exam/version is404, existing draft with no attempts is an audited empty page.
Archive/unpublish and candidate ranking opt-out do not hide authorized reports.
Exclude purged payloads; missing/purged detail is404. Unfinished detail is409.
Admin detail is aggregate/section scores only, review:null: keys, answers,
explanations and the separate assessment.review.admin operation stay out of scope.

## Architecture and performance plan

Plain private Application service, DTOs/query/cursor ports; Reporting-owned pg
projection and crypto adapter, thin HTTP controller and module factory. Declare
Catalog exam/version/section/question and Assessment attempt/result/section/
question-score dependencies. No private Assessment import or exported new facade.
Primary DB statements provide fresh state. READ COMMITTED can change state/score
between pages; immutable startedAt DESC/id DESC order plus first DB watermark
prevents duplicate traversal. New starts after watermark are excluded. Purged
rows may disappear; fresh enumeration starts without a cursor.15min opaque AEAD
cursor binds actor/exam/version/page size/order, preserves initial expiry.

Authentication/admission precede a short UnitOfWork. Identity public revalidation
locks the current actor and checks current session/permission; one projection and
safe mandatory access audit commit together. No attempt locks, business writes,
event/outbox/cache/network call in this flow. Timeout/audit/database failure
returns no data; no fallback/retry that could fabricate results. Expected8 SQL
calls per successful read including auth/rate/transaction, independent of page
size. Existing attempts_admin(version_id,started_at,id) is the starting index;
measure natural plans before considering a new index. No new AWS resource,
runtime package or migration is pre-approved by this plan.

## Checklist

- [x] AS-01 Inspect contracts/source/rules; record ownership, invariants, audit,
 pagination, retention, failure policy and protect prior migration/evidence bytes.
- [x] AS-02 Fail-first Application/cursor/HTTP tests for branching and safety.
- [x] AS-03 Implement private Reporting ports/service/adapters/controller/wiring.
- [x] AS-04 Real PostgreSQL/HTTP permission, filter, paging, result/state/privacy,
 audit failure and concurrent completion regressions; actual compiled composition.
- [x] AS-05 Query budgets/payload and natural plan/local timing diagnostic with
 large corpus; retain raw measurements and state capacity/cost limitations.
- [x] AS-06 Relevant/full validation, self-review, immutable evidence/bundle
 verification, cleanup, documentation/status closure.

AWS capacity, saturation, optimal pool, production SLO/cost, Web business
integration, REP-03 and the remainder of REP-04 remain separate open gates.

## Closure and self-review

452 root cases PASS (314 API/39 suites,42 tooling,96 Web);320 integration cases
across19 suites PASS,0 skipped, including21 new restricted-PG/HTTP cases and the
extended actual compiled TCP composition. Lint/typecheck/build/quality/contracts
46 operations/425 examples PASS.33 new Application/crypto cases include cursor
scope, malformed/future/expired state, current actor, fail-closed audit, unready/
missing result and genuine zero. Eighteen source/built migrations match;472 prior
files are unchanged. Fixture database/login/client/key-directory cleanup is0.
No browser HTTPS rerun: no Identity/Web change; prior REP-01 result is historical.

[Raw evidence](evidence/admin-submissions-2026-10-10/README.md),
[runbook](runbooks/admin-submissions.md),
[experiment](../experiments/admin-submissions/README.md).

Final local diagnostic:100k attempts,20 exams, query p95 first/51-row continuation/
version-filtered18.175/18.391/2.565ms; natural all-version scan versus existing
attempts_admin for version filter. List HTTP p50/p95/p99 45.267/52.515/52.710ms,
30 paced samples,6.605 achieved RPS,5910bytes/page20 and27575bytes/page100.
Score detail26.048/40.505/41.744ms,30 paced samples,7.164RPS,521bytes on1 section/
1 question. Both8 SQL/read; list transaction p95 38.551ms, acquire p95 0.145ms.

These observations show cross-version scan work and the value of the existing
version index; they establish neither a saturation point nor an optimization
winner. No new index accepted: concurrent Admin demand, skew, more versions,
write/storage overhead and SLO need still require measurement. Harness CPU/RSS
are labeled; allocation/DB CPU/IOPS/cost/capacity remain unmeasured. No AWS savings.

Self-review: thin transport and exact DTOs; only public Identity capability and
pure shared audit/UoW contracts in Application. Query schema dependencies are
explicit and source SQL follows R-77; no aggregate hydration/N+1/OFFSET, driver
leak, business write/event/cache or extra public module export. Current permission,
locked actor revalidation, single primary projection and safe audit commit before
return. Unfinished/null/zero/purged states remain distinct. Result uses the frozen
scoring policy and section positions, without review keys or answers. No change
to source migrations, runtime grants, secrets, dependencies or AWS resources.

REP-02 is closed locally; next REP-03 question statistics. REP-04 remains SUBSET;
Web integration, Admin review, audit retention and AWS/production gates stay open.

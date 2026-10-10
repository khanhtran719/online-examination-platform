# REP-04 Admin best/latest reporting subset — 2026-10-10

Status: BL-01–06 COMPLETE locally. REP-04 stays SUBSET and unchecked; production NOT ACCEPTED.
This increment delivers Admin selection semantics only. Preserve all applied
migrations and historical evidence. No Web, privacy-ledger deletion/restore, AWS,
audit retention, deployment or commit acceptance is inferred.

## Contract and plan

Additive READ `GET /v1/admin/exams/{examId}/versions/{versionId}/candidate-results`
is owned by Reporting. [ADR-013](adr/013-admin-best-latest-report.md) specializes
the existing product contract and documents the new API. It returns one pair per
candidate with an eligible retained submission in the exact frozen version.
`best` is a retained COMPLETED result ordered earned DESC, submittedAt ASC,
attempt UUID ASC. `latest` is the retained submitted attempt ordered submittedAt
DESC, attempt UUID DESC, including pending/FAILED/deadline submissions. Unsubmitted
CREATED/IN_PROGRESS attempts are excluded. Only COMPLETED has scores; no completed
result means best:null. Candidate opt-out/disable or archived/unpublished/disabled
leaderboard do not suppress authorized Admin reporting. No PII/keys/review.

Current reporting.read/auth/admission precede input validation; locked Identity
revalidation, one primary projection and mandatory exact-version access audit
share the short UnitOfWork. Audit failure or corrupt completed-result state fails
closed with no response. Reporting writes no business state; source grading,
replay and purge remain Assessment-owned and atomic.

Page1–100/default20, candidate UUID ASC, opaque15min actor/exam/version/size/order
cursor with fixed original expiry and database start watermark. Each page sees
fresh primary status/selection, not a historical snapshot. Candidate ordering
does not change when the selected attempt changes; purge may remove candidates.
No hidden COUNT, OFFSET, export, ranking position or unique-user capacity claim.

Sources: Catalog published version identity; Assessment attempts/results. The SQL
limits candidate IDs before two bounded lateral attempt selections; parameters
remain adjacent and source read dependencies explicit. Existing version and
candidate/exam indexes; no new migration/index/cache/resource without evidence.
Expected8 auth-inclusive SQL calls/page and response below128KiB. Scanned rows can
grow with version population even when returned rows are bounded.

- [x] BL-01 Inspect standards, contract/source/tests; define exact selection,
 scope, freshness, safety, transaction, cursor and protected historical hashes.
- [x] BL-02 Three fail-first suites followed by35 pure reported-score/Application/
 cursor cases; complete root521 PASS.
- [x] BL-03 Private Reporting implementation plus additive OpenAPI/ADR and AC-36;
47 operations/435 examples and source boundaries pass.
- [x] BL-04 Real restricted-PG/HTTP ties/version/status/permission/audit,
 grading/replay/purge/concurrent visibility/paging; actual compiled TCP composition.
 Eighteen new cases pass in the final full361-case run and the final focused format regression.
- [x] BL-05 Natural100k-attempt cardinality plans and raw local diagnostics;
 fixed query budget/max page; no sustainable capacity or AWS cost claims.
- [x] BL-06 Relevant/full checks, self-review, migration/history preservation,
 fixture cleanup, runbook/evidence/status closure.521 root/361 integration21
 suites/0 skipped PASS; lint/typecheck/build/quality/contracts47/435.18 migrations
 source/build match,493 prior files unchanged,56 source hashes; fixture cleanup0
 and test containers stopped with volumes retained. [Evidence](evidence/admin-candidate-results-2026-10-10/README.md).

REP-04 cannot close until its independent privacy ledger/deletion/restore and other
remaining requirements have their own evidence. This subset has a named checklist
without adding product items or changing the216-item denominator.

## Self-review

Thin HTTP controller authenticates/authorizes/admits before UUID/page mapping.
Plain Application owns visible UoW, current locked Identity access, primary query,
pure reported-score validation, fixed cursor lifetime and exact-version audit.
No Nest/pg/crypto implementation enters these layers; Reporting exports only the
existing ranking facade. Optimized SQL reads explicitly declared Catalog and
Assessment columns, without private Assessment services/repositories, business
writes, PII/keys, stale authorization, N+1 network queries, OFFSET or COUNT.

Candidate IDs are limited before two indexed lateral selections. SQL fragments
are fixed adapter-owned identifiers with adjacent parameters. Best NULLS FIRST
fails closed on an absent completed score instead of choosing an apparently valid
older score; the database completion guard prevents that state at commit. Pure
policy requires bounded exact integer COMPLETED scores and null unfinished scores.
Eligibility/best/latest share one statement snapshot. Stable candidate UUIDs do
not move when grading/replay/purge changes a winner. The start-time watermark is
not a commit sequence or frozen export. Natural100k plans preserve existing
indexes; broader skew/concurrency/capacity/AWS costs remain unmeasured. No schema,
grant, event, package, key, cache or resource added; historical bytes are preserved.


## Validation scope addition: local SMTP test harness

The first full run passed359/failed1 in the existing Identity SMTP capture check.
The unchanged Identity plus compiled HTTP suites then passed49/49. Cause of the
initial provider/capture absence is not confirmed. A new deterministic regression
forced the first send to fail transiently and reproduced the harness stopping on
runOnce=false while the durable job awaited backoff. The harness now polls the
loopback mailbox within a six-second window and closes the SMTP fixture in finally.
The new test requires retry then acceptance and durable delivered_at/attempt count;
Identity alone passes23/23; the final full run passes361/361 in21 suites,0 skipped. Only the test changes: production worker/backoff/leases/
mail transport/permissions remain unchanged. The final complete integration run
includes this regression; format-only PG verification subsequently passes18/18. No live email or production reliability claim follows.


## Closure and follow-up

All six named local deliverables are complete. The roadmap stays84/216 checked,
132 pending because REP-04 also requires independent privacy ledger/deletion/
restore evidence. No full Reporting phase or production acceptance follows.
The next proposed bounded increment is REP-05 business metrics: define starts/
submissions/completions/expired/failed and processing backlog before implementing
a primary bounded projection with current permission/audit and query-budget tests.
Privacy retention/restore, audit lifecycle, Web and AWS gates remain separate.

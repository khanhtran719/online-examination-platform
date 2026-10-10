# REP-03 Admin question statistics — 2026-10-10

Status: COMPLETE locally. Production NOT ACCEPTED. REP-01/02 and all previous
accepted migration/evidence bytes are preserved. [Evidence](evidence/admin-question-statistics-2026-10-10/README.md),
[runbook](runbooks/admin-question-statistics.md),
[experiment](../experiments/admin-question-statistics/README.md).

## Contract and ownership

Reporting owns READ GET /v1/admin/exams/{examId}/versions/{versionId}/question-statistics.
Exact frozen exam/version required; absent/mismatched version404. Includes archived/
unpublished versions and disabled leaderboard. All frozen questions/options appear
even before first grading, with zero counts. Stable section position/question
position/question UUID order; pageSize1–100/default20. Opaque15min cursor binds
actor/exam/version/pageSize/order, with fixed original expiry. Primary counters
are fresh per statement/page; this is not a cross-page snapshot or export.

Denominator: all retained COMPLETED attempts for the frozen question/version,
including repeated attempts by one candidate, ranking opt-out and expired-completed.
correct+incorrect+unanswered = completedAttempts; answered = correct+incorrect.
Empty/missing selections are unanswered. Wrong/nonexact multiple choices are
incorrect; individual option selectedCount counts each valid selected option, so
sum may exceed answered for multiple choice. Pending/FAILED excluded; duplicate/
replay contributes once. Grading updates counters atomically; purge subtracts
contributions atomically. No client-side scan of results/answers or new cache.
Response exposes IDs/counts only, no names, email, prompts, keys or explanations.

Existing schema counters are bigint while HTTP bounds are signed32bit. Parse exact
decimal counts and fail closed if negative/nonintegral/out of range/inconsistent;
never clamp, truncate or emit rounded counts. Add required answered to the not-yet-
implemented QuestionStatistic contract and update examples through contract checks.

Contract correction: x-transaction:none conflicts with the required sensitive
Admin-access audit policy in security-and-permissions. Specialize this operation
to audit-read, AC-24, like REP-01/02. This follows the existing architecture, not a
new business write or exception. Identity public locked revalidation of current
session/permission, one primary projection and safe audit share a short UoW.
HTTP authenticates/authorizes/admit before input validation. Failure returns no
data; actor locks/timeouts/pool bounds retained, no attempt/counter locks on reads.
Audit action is `reporting.question-statistics.read`, resourceType `EXAM_VERSION`
and resourceId the exact version UUID. A failure in validation, projection,
counter mapping or audit rolls back the read transaction and returns no report.

Private DTO/query/cursor ports, plain Application service, small pure Domain count
policy, Reporting pg/crypto adapters and thin controller/module composition.
Declare Catalog frozen version/section/question/option and Assessment counters.
No private Assessment import, new public facade, aggregate reconstruction, business
write/event/outbox/cache/network call. Expected8 auth-inclusive SQL calls per page,
one bounded projection. Existing primary/order indexes; add no migration/resource
without evidence. Source schema changes require report regression review.

## Checklist

- [x] QS-01 Inspect rules/contracts/source; explicit denominator, scope, freshness,
 safety/audit, paging/query budget and protected historical hashes.
- [x] QS-02 Fail-first count policy/Application/cursor tests; 34 new unit cases.
- [x] QS-03 Implement private Reporting flow and intentional OpenAPI correction.
- [x] QS-04 Real PG/HTTP grading/duplicates/retention/atomic visibility/permission/
 audit/scope/paging/overflow; actual compiled route composition.
- [x] QS-05 Bounded maximum frozen500-question/10-option page, natural plans and
 raw local diagnostics; no sustainable capacity/cost claims.
- [x] QS-06 486 root and342 integration/20 suites/0 skipped PASS; lint/typecheck/
 build/quality/contracts46/425; self-review,18 source/build migration hashes and
481 prior files unchanged, fixture cleanup0, evidence/status closure.

No Web, Admin key review, REP-04 privacy-ledger, audit retention or AWS/load/
cost-curve/deploy/commit acceptance is inferred. Next scope follows the roadmap.

## Implementation and self-review

The pure Domain count policy validates exact decimal bigint values, arithmetic
partitions and each option bound. Application controls current access, visible
transaction, exact scope, cursor expiry and mandatory audit. Presentation handles
HTTP admission/input mapping only; private pg and crypto adapters implement ports.
ReportingModule exports only the existing public ranking capability. Declared
read sources follow the optimized SQL exception; no private Assessment service,
repository or Nest/pg/crypto dependency enters Domain/Application.

One statement returns presence, database clock and the limited question projection.
Options are bounded lateral lookups after pageSize+1 limiting. Natural query plans
may sort all500 frozen question candidates and hash/scan the modest question-counter
relation; this is recorded rather than hidden by forced planner settings. There
is no N+1 network round trip, OFFSET, answer scan or aggregate reconstruction.
Counter validation/audit occur inside the transaction so failure cannot emit a
partial report. Permission removal, audit outage, actor-lock timeout, stale cursor,
overflow and invalid option partition have explicit fail-closed tests.

Real restricted-PG tests exercise all three scoring types, empty/missing answers,
repeated and opt-out candidates, pending/FAILED exclusions, deadline completion,
duplicate queue delivery, operator replay generations and actual maintenance purge.
An independently blocked grading transaction proves old committed counters remain
readable before the entire new contribution becomes visible. Frozen500-question/
20-section paging under grading has no duplicate/missing IDs. Actual compiled
AppModule/TCP tests exercise authorized and Candidate-denied route composition.
No schema, grant, event, key, package or AWS resource changes were needed.

## Closure and limits

Final full integration passed342/342 in20 suites,0 skipped,213.968s. Root passed
486 (348 API/42 suites,42 tooling,96 Web). New coverage is34 unit and22 PG/HTTP
cases. Lint/typecheck/build/quality/contracts46 operations/425 examples pass.
All18 source/built SQL hashes match and481 prior files remain unchanged. External
fixture checks find0 other databases, extra LOGIN roles, other client connections
or temporary key directories. Test PG55435/both Mailpit containers stopped with
volumes retained; development55432 untouched. No browser HTTPS rerun was needed
for this increment; compiled TCP composition is verified and prior HTTPS remains
historical. Early failing tests and the unconfirmed existing SMTP capture failure
are described in evidence, alongside the unchanged Identity focused pass and final
complete pass. No production recovery fix is inferred from a successful rerun.

Final maximum100/10-option inject diagnostic: p50≈33.194ms, p95≈39.297ms,
p99≈39.854ms;8 SQL calls,92,313bytes. Real query plans/raw samples accompany the
synthetic10k-question/100k-option cardinality fixture. Sequential/short paced
throughput and combined Jest CPU/RSS cannot establish sustainable capacity,
allocation/request, saturation, AWS SLO or cost savings. No new resource/index is
accepted. Only REP-03 closes:84/216 product items checked,132 pending.

Next proposed bounded scope is REP-04 Admin best/latest reporting semantics; its
independent privacy ledger/deletion/restore requirements remain distinct and keep
REP-04 unchecked until actually delivered and verified. No next implementation is
already running; production acceptance remains open.

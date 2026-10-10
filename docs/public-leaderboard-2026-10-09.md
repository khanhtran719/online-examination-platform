# Candidate public leaderboard —increment2026-10-09, closed2026-10-10

LB-01–05 complete locally. REP-04 stays SUBSET; roadmap81/216 checked,135 pending.
The delivered scope is Candidate ranking/privacy reads through Reporting's public
facade, not full Admin reporting or independent privacy/deletion/restore acceptance.
Production remains NOT ACCEPTED. [Raw evidence](evidence/leaderboard-2026-10-09/README.md),
[ADR-012](adr/012-public-ranking-projection.md),
[runbook](runbooks/public-leaderboard.md),
[experiment](../experiments/public-leaderboard/README.md).

## Delivered behavior and architecture

- Authenticated exact frozen-version leaderboard; current `leaderboard.read`
  permission/rate admission, no anonymous access or policy bypass.
- Current enabled/verified/opt-in/no-deletion-request visibility checked in the
  primary statement, no copied consent/cache. Requests after opt-out commit hide
  the candidate. Older frozen visibility survives draft/unpublish/republish changes.
- Best retained COMPLETED attempt by earned DESC/submitted ASC/attempt UUID ASC;
  expired completions participate. Exact pseudonym-only DTO and no-store.
- Actor/version/page-size/watermark/epoch-bound encrypted15min cursor; stable
  per-version96bit aliases from a dedicated API-only key independent of JWT/CSRF.
  Continuations preserve original expiry; deliberate key rotation resets aliases.
- Assessment owns Presentation/auth/admission; Reporting owns the plain Application
  facade/read ports/private pg+crypto adapters. Explicit read dependencies are
  Identity visibility, Catalog frozen policy and Assessment durable best/result/
  attempt/epoch sources. No private cross-module repository, technical business
  import, read UoW, aggregate hydration, N+1, OFFSET, Redis or new dependency/resource.

The source placement follows architecture §5 and ADR-006. Domain/Application remain
framework/driver/crypto-adapter independent. Only the public RankingProjection
token is exported; the two reviewed facade/composition entry points are registered
without relaxing private/global architecture guards. SQL stays parameterized inside
Reporting Infrastructure; migrations remain in the global versioned bundle.

## Migration and cursor correctness

The17-migration control reproduces a candidate twice: after the high-score result
has appeared on page1, replace its best entry with an older lower-score survivor
below the cursor. The old continuation returns200 with that same pseudonym.
Forward0018 makes DELETE/worsening UPDATE atomically increment a per-version epoch;
old cursors fail400/refetch instead. Normal improving grading has no epoch write.
Epoch rollback and actual retention purge/audit-failure rollback are tested.

The epoch table has PK/FK and runtime SELECT only. Trigger function ownership,
fully qualified objects, secure search_path and revoked PUBLIC EXECUTE prevent
direct caller-managed invalidation. Runtime winner UPDATE remains column-scoped;
candidate/version ownership is immutable. Grader privileges already had that shape.
No score, answer, inbox, outbox or audit/event format changes.0001–0017 unchanged.
Apply0018/key provision before API rollout; retain migration/retention awareness
on rollback. Mixed-image rollout/restore reconciliation is still an operational gate.

## Performance evidence and its limits

The initial full-window query joins/formats the whole visible version then limits;
natural100k plans spill its sort to disk. The chosen query limits the ordered page
before window/formatting and conditionally counts a same-snapshot visible prefix
for exact live ranks. This adds a deliberate prefix scan on continuation, not a
total or per-row query. First-page prefix execution is skipped. Output is≤101 rows;
planner-selected joins can still scan a large version, so this is not constant-time
paging or a proven saturation solution.

Matched experiment: same database/pool/settings/100k synthetic candidates and
durable results/best entries in one enabled version, all scores100/tied submit time.
40 alternating before/after first-page101 pairs,20 pairs after rank50,000, two
warmups per shape/case, exact row equality and natural EXPLAIN(ANALYZE,BUFFERS).

| SQL case | Before p50/p95/p99 ms | After p50/p95/p99 ms | Local p95 change |
| --- | --- | --- | --- |
| First101 |293.499/299.972/305.841|244.182/248.200/255.571|−17.26%|
| After rank50,000 /101 |349.096/355.036/357.019|267.695/271.157/276.420|−23.63%|

These SQL numbers support the local query decision, not an HTTP SLO or AWS saving.
No index/pool/instance/cache was added or enlarged. Dataset does not satisfy the
full1000-exam/500k-question/million-answer production workload requirement.

Final separate40-request Fastify injection diagnostic: p50≈266.919/p95≈275.074/
p99≈355.747ms,3131bytes/response,3 statements/request including auth/rate,120
acquire/query observations each.15.238s paced closed-loop window serves≈2.625 RPS,
one in-flight request,0 sample errors; this achieved diagnostic rate is not offered
arrival/sustainable RPS. Pool maximum1 connection/waiters0; pool2 is fixture config,
not optimal sizing. CPU≈6386.425µs/request includes Jest/harness/idle; RSS
516358144→514605056 is resident memory, not allocation/request. Allocation and pure
row-lock/transaction duration are null; no explicit read transaction is opened.
Local full-run percentile variation is retained instead of discarding larger tails.
Container DB CPU/IOPS/utilization/headroom, concurrent load, saturation, AWS cost/
Performance–Cost Curve remain unmeasured. Real compiled TCP route and Chromium
HTTPS checks verify wiring/auth separately, not these latency measurements.

## Validation, review and cleanup

| Check | Result |
| --- | --- |
| Root tests |396 PASS:258 API/35 suites +42 tooling +96 Web |
| New Application/crypto tests |19 PASS; preimplementation failures preserved |
| Focused ranking/retention |28 PASS before the final2 ranking cases; final12 ranking cases PASS |
| Matched query comparison |12 ranking cases PASS; first/deep rows equal |
| Full restricted-PG/HTTP/SMTP |281/281 PASS across17 suites,0 skipped |
| Compiled TCP composition |1 new leaderboard case + existing26 real HTTP fault cases PASS |
| Chromium HTTPS/SMTP/current AppModule |10/10 PASS, built18 migrations; ephemeral SPKI trust, not public PKI |
| TypeScript/build/lint/architecture/contracts |PASS;46 operations/425 examples |
| Preservation/bundle |386 protected files unchanged:17 applied migrations +369 old evidence;18 source/built migrations match |
| External cleanup |0 temporary DBs/logins/other-DB connections/key directories; fixtures stopped, volumes preserved;55432 untouched |

Failures retained: initial missing ShutdownGate/revision are fixture failures;
the cursor duplication/ownership controls are genuine behavior REDs. The initial
100k ranking seed exceeded its fixture budget;1000-row transactions preserve all
FKs/guards and complete. First full run259 PASS/21 setup failures came from a fixed
17-name upgrade expectation; adding0018 preserves exact upgrade/rerun checks.
Second full run279 PASS/1 history seed timeout also timed out teardown and left
the SQL running. Its confirmed disposable backend was canceled, then its database/
four logins were removed after0 connections. The history fixture now seeds1000
rows/batch with refreshed statistics and a20s fixture-only SQL budget; its focused
case and the final full suite pass. No history runtime query/SQL guard was changed.
The exact cause of the long seed was not separately profiled; do not infer a
production bottleneck or cached-plan defect from this setup failure.

Self-review against R-58/R-59 and workflow §§47–48: READ owner/public boundary and
source dependencies explicit; exact safe DTO/error categories/current auth; no
write transaction/event/cache or unnecessary pass-through abstraction; SQL bounds/
bigint cursors/expiry/privacy consistent; destructive source changes rollback with
epoch; no secret/raw parameter/body logging. Existing write/worker/retention and
ownership regressions remain passing. No staging/commit/deploy was requested.
Dependency audit/images/live AWS/k6/managed failover/PITR/restore/mixed rollout were
not run or accepted by this increment.

## Next bounded increment

REP-01: read-only Admin monitor of active candidates, exact permission/data scope,
freshness/deadline semantics, cursor limits and declared Reporting source contracts.
Follow with fail-first PG/HTTP privacy/permission tests and query/plan evidence.
REP-02/03/05–07, Web live leaderboard integration, independent privacy ledger and
production load/security/recovery/FinOps gates remain separate unchecked work.

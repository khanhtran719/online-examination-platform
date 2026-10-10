# Candidate public leaderboard evidence —2026-10-09

REP-04 Candidate ranking/privacy-read subset. [ADR-012](../../adr/012-public-ranking-projection.md),
[runbook](../../runbooks/public-leaderboard.md),
[matched experiment](../../../experiments/public-leaderboard/README.md).
Production/SLO/capacity/AWS costs/Admin reporting/privacy restore remain open.

| Artifact | Meaning |
| --- | --- |
| lb-unit-red.log / lb-unit-green.log | New use-case/crypto fail-first then19 passing cases |
| lb-config-red.log / lb-config-green.log | Worker leaderboard-key distribution regression,3 config cases PASS |
| lb-boundary-red.log / lb-boundary-green.log | Reviewed public facade/composition only; private/global bypasses stay rejected |
| lb-epoch-red.log | Initial missing ShutdownGate fixture provider; setup failure, not runtime reproduction |
| lb-epoch-behavior-red.log | Initial fixture missing required attempt revision; not runtime reproduction |
| lb-epoch-behavior-red-2.log / lb-epoch-duplicate-red.log |17-migration control accepts stale continuation; deterministic repeated Candidate asserted before expected400 fails |
| lb-ownership-red.log |17-migration runtime can change best-row candidate identity;0018 restricts it |
| lb-focused-initial.log |9 correctness cases PASS; artificial100k single-transaction seed timeout |
| lb-focused-second.log |10 ranking +18 actual retention cases PASS; epoch commit/rollback included |
| lb-query-constant.log / local-diagnostic-constant.json | Intermediate explicit-version predicate, still large join/sort; not chosen final shape |
| local-diagnostic-before.json / ranking-before.txt | Frozen initial whole-window source and local HTTP/plan baseline |
| ranking-constant.txt / ranking-after.txt | Frozen intermediate/final SQL adapter source; archived unchanged |
| lb-comparison.log / local-comparison.json |12 ranking cases PASS; same100k dataset exact before/after equality/plans/alternating timings, first/deep pages |
| lb-root.log |396 root cases PASS:258 API/35 suites +42 tooling +96 Web |
| lb-type-initial.log / lb-type-second.log | TypeScript PASS |
| lb-build-initial.log / lb-build-final.log | API build/SQL-copy PASS |
| lb-lint-initial.log | Expected public Reporting entry points not yet registered in architecture guard |
| lb-lint-second.log / lb-lint-final.log | Architecture/link/lint/contracts46 operations/425 examples PASS at those source states |
| lb-integration-initial.log |259 PASS/21 setup failures from upgrade fixture expecting17 instead of18 migration names |
| lb-integration-seed-timeout.log |279 PASS/1 history fixture timeout plus teardown timeout; singleton100k seed query explicitly canceled on its disposable DB |
| lb-history-seed-fix.log |Bounded1000-row seed batches/ANALYZE and20s fixture-only SQL budget: history-plan case PASS;32 deliberately deselected, not full acceptance |
| lb-integration-full.log / local-diagnostic-full.json / http-matrix-full.json |Final281/281 across17 suites PASS,0 skipped;27 compiled TCP cases, including new leaderboard composition |
| lb-final-diagnostic.log / local-diagnostic-final.json |Final12 ranking cases PASS after adding achieved-window RPS and sanitized120 acquire/120 query observations |
| lb-https.log / https-summary.json / https-environment.json / https-boundaries.json |10 actual Chromium HTTPS/worker SMTP/current AppModule cases PASS;18 built migrations |
| verification.json / cleanup-db.json |386 protected files unchanged;18 source/build bundles match;0 temporary DB/login/connections/key directories |
| cleanup-services.log / container-postgres.json / container-mailpit.json |Test services exited, volumes preserved; development55432 untouched |

Local comparison settings: Node24.17.0/darwin/arm64; PostgreSQL17.11/aarch64 Docker,
shared_buffers128MB/work_mem4MB/max_connections100, restricted runtime pool2,
statement2s/lock500ms. No planner settings disabled, no FK/trigger bypass.100k
synthetic users/attempts/results/best entries in one version, tied scores/submit
timestamp. Seed1000 records per transaction; this is a projection dataset only.
The old history seed was also bounded; its business query/index assertions remain.

Matched SQL comparison:40 alternating before/after first-page101 pairs and20 deep
pairs after rank50,000, two warmups per shape/case. Raw rows must match; plans are
natural. p95≈299.972→248.200ms /355.036→271.157ms respectively. Separate40-request
default20 HTTP injection sample: p50≈262.040/p95≈269.468/p99≈270.484ms,3131bytes and
3 SQL calls including auth/rate. Node CPU≈5924.675µs/request includes harness/idle;
RSS546553856→547094528 is resident memory, not allocation/request. Allocation,
sustainable RPS, saturation, AWS price/savings/capacity remain null/unmeasured.
These are scoped local diagnostics, not an HTTP socket/TLS SLO population.

Final separate diagnostic after telemetry capture: p50≈266.919/p95≈275.074/
p99≈355.747ms,40 successful requests/0 errors,15.238s paced window, achieved≈2.625
RPS at one in-flight request.3 statements/request,120 acquire+120 query records,
pool maximum1/waiters0. CPU≈6386.425µs/request including harness/idle; RSS
516358144→514605056, allocation null. No explicit read transaction; pure row-lock
time and transaction duration unmeasured. This rate is not sustainable capacity.
Final full-run tail variation (p99≈314.437ms) is retained alongside the matched
comparison and this later diagnostic; no cherry-picked SLO population.

Closure: [report](../../public-leaderboard-2026-10-09.md).396 root/281 full
integration/10 HTTPS PASS. Latest source/type/format/diff/doc checks are recorded
in the final validation log; source-hashes.json is provenance for delivered code.

Reproduce ranking correctness with disposable55435 administrator via a0600 local
Jest globalSetup file, then `npm run test:integration -- --globalSetup FILE
--runTestsByPath apps/api/tests/integration/leaderboard.spec.ts`. Set
LEADERBOARD_COMPARISON=true and LEADERBOARD_EVIDENCE_FILE to a **new** output path
to emit the matched comparison. LEADERBOARD_BASELINE=true applies17 migrations plus
a test-only empty epoch stub for fail-first reproduction; it is never runtime mode.
Full setup clears baseline/comparison/old suite evidence variables, redirects HTTP
matrix/Assessment diagnostics and ranking output only into this new evidence tree.

Fixtures use real primary PostgreSQL/current Identity session/permission/rate
admission; ranking HTTP cases use Fastify injection. The new compiled TCP case
uses actual AppModule/ReportingModule/secret loading. No production key, credential
env, HTTP body, cookie, answer key or raw application log is archived. Plan constants
refer only to disposable synthetic IDs. Historical evidence/migrations are protected
by preservation-before.json; final verification/cleanup belongs to closure evidence.

# Identity local diagnostic experiment

Date2026-10-06; latest raw run started2026-10-06T08:32:02.222Z. **Executed local diagnostic, not AWS capacity/SLO/cost acceptance.** [Script](../../scripts/identity-benchmark.mjs), [runtime review](../../docs/phase-04-review.md), [latest raw samples](latest.json).

This report and its raw JSON retain the historical11-operation Phase04 run. The current script uses normalized source paths and adds two provider-stub worker diagnostics (13 operations); new comparable runs are archived in [architecture-normalization](../architecture-normalization/README.md). Set `IDENTITY_BENCH_OUTPUT` to an allowed experiment path to avoid overwriting historical latest.json.

Separate actual main/worker smoke after final maintenance fix: live/ready and SIGTERM exit0, combined idle shutdown640.6ms; [raw summary](smoke.json). This is not deployment-under-load or recovery evidence.

## Hypothesis and configuration

Read-only CSRF-family resolution can use one projection instead of write locks/transaction, while all mutations retain authoritative post-lock revalidation. Hashing concurrency must be bounded above the Argon2id security floor. Distributed login admission must prevent concurrent failed attempts exceeding the policy even if extra queries are required.

macOS ARM64/8 logical CPUs, Node24.17.0, PostgreSQL17.11/aarch64 in Docker. Two loopback HTTP API instances use production controllers/HTTP setup/adapters and one database through a fixture composition module; actual main/AppModule startup is verified separately by smoke. Pool4 per instance;32 verified fixture accounts. Argon2id19456KiB/time2/parallelism1, application concurrency2/queue8; extra hash concurrency1/2/4 sweeps. Eight migrations, restricted app login, no Redis. No ALB/TLS/WAF/AWS services. Explicit client cookie jars honor CSRF/Origin; browser Secure-cookie handling is not exercised.

Traffic is sequential:64 login (32 anonymous and32 already-authenticated),200 me,64 refresh,32 logout,32 absent wrong credentials,32 existing wrong credentials. Each JWT-pair issue100 samples; access verify200. Eight batches per hashing concurrency. Requests alternate API instances. Database/roles are disposable and removed after sockets close; fixture verification bypasses mail delivery only during dataset setup, not measured auth calls.

## Measurements

Latest run:0 unexpected errors. Expected401 on invalid credential samples is validated, not counted as an unexpected error.

| Operation | Samples | p50 ms | p95 ms | p99 ms | Achieved sequential RPS | Process CPU ms/op | DB queries/op |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Login | 64 | 37.37 | 44.44 | 54.36 | 26.37 | 26.26 | 19.5 |
| GET me | 200 | 3.90 | 4.92 | 5.97 | 253.22 | 1.43 | 2 |
| Refresh | 64 | 8.01 | 9.52 | 29.17 | 117.60 | 3.00 | 10 |
| Logout | 32 | 8.03 | 9.26 | 9.30 | 125.53 | 2.34 | 9 |
| Absent wrong credentials | 32 | 29.27 | 30.23 | 30.48 | 34.43 | 23.66 | 7 |
| Existing wrong credentials | 32 | 29.80 | 50.25 | 55.47 | 31.84 | 24.73 | 7 |

Queries include BEGIN/COMMIT and security controls, not only business SELECTs. Login average19.5 reflects anonymous versus family-bound CSRF contexts. GET me has one auth/permission projection plus one actor rate query. CPU includes API and benchmark client in the same process and excludes the PostgreSQL process. RSS/delta, pool-wait and transaction p50/p95/p99 are in raw JSON; RSS delta is not allocation/request and may be negative after GC. Pool wait was sampled at checkout; it does not prove saturation headroom or optimum pool.

JWT-pair issuance p95/p99=0.143/0.389ms, process CPU0.238ms/pair; access verification0.126/0.157ms, CPU0.113ms/op. Access598bytes/refresh606bytes (tokens, not full cookie/header payload). No remote signing/secret fetch per request.

| Argon hash concurrency | Samples | p95 ms | p99 ms | Achieved hash jobs/s | Process RSS MiB at end |
| --- | --- | --- | --- | --- | --- |
| 1 | 8 | 22.12 | 22.12 | 46.10 | 200.41 |
| 2 | 16 | 25.65 | 25.65 | 86.44 | 219.42 |
| 4 | 32 | 31.33 | 31.73 | 155.16 | 256.16 |

RSS includes prior operations and retained allocator memory; these are not isolated memory-per-hash measurements. More local hash throughput at concurrency4 does not select Fargate concurrency4: CPU quota/memory/mixed traffic/security admission need a container load sweep.

## Before/after and decision

| Artifact | Scope / validity |
| --- | --- |
| [failed-empty-json-body](failed-empty-json-body.json) | Invalid benchmark client sent application/json on empty refresh/logout bodies, causing96 errors. Retained failure; exclude from comparison/capacity evidence. |
| [baseline](baseline.json) | Corrected client,0 errors; pre-CSRF projection/additional session audit/atomic login reservation |
| [csrf-projection](csrf-projection.json) | Projection plus session audit,0 errors; before atomic failed-login reservation |
| [latest](latest.json) | Final atomic reservation/expiry extension and projection/audit,0 errors |

Baseline→latest queries: refresh15→10 (−33.3%), logout13→9 (−30.8%, including added audit). This proves fewer client DB calls for these paths, not AWS cost saved. Baseline p95 refresh22.73ms/logout84.44ms; latest9.52ms/9.26ms. Runs also differ in auditing and short-run noise; no statistical or isolated latency-gain claim. Latest refresh p99 increased relative to the preceding run despite lower p95, illustrating why tails require larger repeated workloads.

Login query overhead increased to preserve an atomic security control. Six concurrent wrong credentials produce five401/one429 in the PG test; successful attempts release reservations, crash conservatively retains one, latest failure extends15min expiry. Do not choose the earlier cheaper/racy version. Concurrency2 remains a bounded local candidate; retain no-cache/no-extra-queue baseline until benchmark or operational requirement justifies more resources.

Invalid absent/existing groups run in fixed order and have few samples; they **do not prove timing-enumeration resistance**. Require interleaved randomized larger samples with controlled environment and an explicit acceptance bound before production.

## AWS resources, cost and unresolved evidence

AWS resources:none; cost/hour and cost/1M requests are **null/unmeasured**, not zero. No jobs/USD, sustainable RPS/USD, user capacity/USD or AWS savings computed. Utilization/headroom, dataset scale, bottleneck, saturation, concurrency/pool winner, ECS architecture/sizing, HA/failover, provider throughput/quotas and Performance–Cost Curve remain unresolved.

Reproduce with PostgreSQL running: `npm run bench:identity:local`. It overwrites latest.json; archive each future comparable run with config/source provenance before rerunning. Do not run a concurrent build because build cleans generated dist. Next controlled experiments need randomized repeats, actual HTTP concurrency/ramp/soak, isolated client/CPU quotas, representative dataset, browser/TLS and then tagged AWS cost evidence. No exam hot-path benchmark is claimed here.

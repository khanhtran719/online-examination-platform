# Persistence comparison: pg / TypeORM / Sequelize

2026-10-07. **O-01–04 local evaluation complete. Retain pg for the present Identity runtime; do not install an ORM in the API.** [ADR-008](../../docs/adr/008-persistence-evaluation.md) records the decision. All libraries can implement the architecture; the result is scoped to measured Identity paths and current operational controls, not a universal ORM or AWS winner.

## Hypothesis and configuration

An ORM may improve mapping/CRUD maintenance while preserving optimized projections, query counts, transactions and security. Compare that benefit against CPU, memory, startup, control implementation and migration cost. [Protocol](protocol.md) was written before measurement; no production SLO was relaxed.

Pinned experiment dependencies: pg8.23.1, TypeORM1.1.1, Sequelize6.37.8 with scoped uuid11.1.1 override. Node24.17.0/macOS ARM64, actual compiled Nest12 Identity classes, PostgreSQL17.11 ARM64 Docker. One pool4 per candidate; waiting32; acquire1,000ms/statement2,000ms/lock500ms/idle-transaction5,000ms; synchronous_commit=on. Runtime login has DML grants and no owner/DDL role. Eight original SQL migrations are used without edits or ORM synchronization. Package and lockfile are separate from the root runtime and frontend.

AWS resources: **none**. Local Compose uses its own project, PostgreSQL55434 and a Mailpit fixture for the existing SMTP integration test. No shared development database is truncated. Disposable databases/logins are removed; Compose containers are stopped after validation, volumes retained. EC2/Fargate/RDS utilization, price, monthly/idle/normal/peak cost, cost/hour, cost/1M requests and performance/USD: **UNMEASURED**, not zero. Do not draw a dollar cost curve from this experiment.

Dataset:100,000 users +100,000 role memberships +100,000 families +100,000 indexed sessions, up to32 temporary active identities. Seed took10.489s; baseline DB149,037,583bytes. This does not implement the full examination dataset. Synthetic filler sessions are never exposed as usable credentials. Timed session tokens use real ES256; Argon2 setup uses the existing configuration, not a faster substitute.

Five modes: pg, typeorm.raw, typeorm.mapped, sequelize.raw, sequelize.mapped. Mapped paths use infrastructure ORM account lookup/row lock/profile update; session/principal/audit/rate/receipt SQL remains explicit through the same active manager/connection. No second runtime pool. Four populations: account, principal authentication, signed refresh and profile+audit+receipt. Registration/login/SMTP are not timed.

Five blocks rotate candidate order; concurrency1/8/32,256 timed samples/population/block/mode and32 warmups. **75 configurations,76,800 timed operations,0 unexpected errors**. Measurements ran02:11:26–02:14:23 UTC (09:11–09:14 Vietnam). The timings are application-operation samples, not HTTP API SLIs. Actual HTTP behavior is tested separately.

## Measurements

[Raw samples/config/source/migration digests/DB counters/GC/pool/lock/transaction observations](raw.json), [summary with ranges/paired deltas](summary.json), [all60 groups](measurements.md). Each value below is the median of five per-run percentiles at concurrency32, not a percentile of pooled samples.

| Mode             | Principal p95/p99 ms | Refresh p95/p99 ms | Profile p95/p99 ms | Profile CPU ms/op | Queries: principal/refresh/profile |
| ---------------- | -------------------: | -----------------: | -----------------: | ----------------: | ---------------------------------- |
| pg               |         10.22 /10.48 |       41.64 /42.86 |       63.17 /65.43 |             0.929 | 1 /8 /10                           |
| TypeORM raw      |          9.46 /10.79 |       44.52 /45.47 |       60.13 /63.38 |             1.009 | 1 /8 /10                           |
| TypeORM mapped   |          9.49 /10.43 |       44.03 /45.90 |       63.11 /67.95 |             1.185 | 1 /8 /10                           |
| Sequelize raw    |          9.20 /10.65 |       44.93 /46.70 |       59.12 /61.47 |             1.233 | 1 /8 /10                           |
| Sequelize mapped |          9.36 /10.48 |       45.48 /46.01 |       68.30 /72.51 |             1.467 | 1 /8 /10                           |

Account lookup is one query for every mode. At concurrency32, pg p95=5.47ms/CPU0.088ms/op; TypeORM mapped6.36ms/0.167; Sequelize mapped5.83ms/0.169. The principal path is a projection for all modes; it does not hydrate an aggregate or query permissions per role. The raw account EXPLAIN uses `users_email_key`, one returned row/four shared-hit blocks,0.021ms execution for that one sample. That one plan/timing is not a capacity result.

| Candidate | Cold bootstrap median ms | Cold RSS MiB |
| --------- | -----------------------: | -----------: |
| pg        |                    49.68 |        63.30 |
| TypeORM   |                   123.76 |        80.31 |
| Sequelize |                   148.15 |        86.77 |

Cold measurements are fresh Node processes importing the same compiled Identity base and opening a DB pool; they are not Nest start-to-ready or container image measurements. Memory in the long-lived mixed harness includes previously imported ORM packages; use cold RSS to compare import footprint, not its absolute mixed-process RSS as per-candidate container sizing. RSS/heap deltas are not allocated bytes/request. CPU includes client, instrumentation and application; PostgreSQL/container CPU/IOPS are not isolated.

There is substantial run variance: for example Sequelize mapped profile p95 at concurrency32 ranged58.89–195.38ms. Some raw ORM medians are lower than pg while some tails/runs increase. This is not sufficient for a causal latency or AWS cost improvement claim. Pool4 is an experimental constant, not the optimal production pool; concurrency32 is an offered closed-loop load, not maximum candidates or saturation. Warm caches and short runs do not prove sustained headroom, soaks, recovery SLO or coordinated-omission safety.

## Correctness, controls and dependency findings

- Candidate checks:42 PASS (36 behavioral leaf checks,3 candidate parent results,3 statistics cases),0 skipped. Real PG + actual Nest HTTP test cover nested/PID/rollback-only, caught SQL failure, late/detached context, DDL, timeout, admission/drain, ORM mapping, duplicate receipt/audit rollback, stale/key conflicts, lock contention, concurrent refresh, backend kill/recovery and envelope/CSRF/signed cookie response. A loopback cookie jar is not browser HTTPS acceptance.
- Existing runtime:100 unit/tooling +53 PG/HTTP/SMTP integration PASS. The additional case reproduces and fixes pg shutdown with admitted queued work. The fail-first regression returned DB_ACQUIRE_TIMEOUT before the fix. close now denies new admissions, waits for admitted work, then ends the pool; repeated close shares one completion promise. No query, transaction, permission or HTTP semantics changed.
- Early spike failures included fixture fields/UUIDv7/role-assignment ordering and a Sequelize rowCount adaptation bug. They were repaired before measurement; no controls were stubbed to bypass failures. Sequelize raw INSERT/UPDATE metadata can be a number rather than pg-shaped metadata; preserving this matters for rate admission and createAccount.
- [Audit before](audit-before.json): two moderate package findings due to Sequelize→uuid. [Audit after](audit-after.json):0 findings after scoped override; transaction paths still tested. Advisory is [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Sequelize uses uuid v1/v4 in inspected source; that observation does not waive dependency remediation or prove exploitability. No audit downgrade/fix-force was applied to the API.
- Sequelize emits a native console warning with transaction identity and raw connection-error message on failed rollback despite logging=false. The observed message had no credential/SQL payload, but structured redaction is still a production-adoption blocker; the harness does not globally silence console. Its pool counters and TypeORM pool counters use pinned private APIs for diagnostics, not production contracts. Sequelize does not expose equivalent maxLifetimeSeconds control.
- New libraries are pure experiment dependencies. Node24/Nest composition/ARM64 execution passed; no x86_64/Linux image/dependency type-mapping/whole-Identity conversion acceptance is inferred. PoCs are JavaScript spikes against compiled TypeScript ports. A production TypeScript adapter must add strict typing/full existing integration/worker/operator coverage before rollout.

## Maintenance/TCO and decision

ORM mapped methods offer convenient field mapping, row lock and update builders. They do not eliminate the custom UoW admission, rollback-only/detached-work/late-context/redaction/drain requirements or session/rate/audit/receipt SQL. Entity-schema duplication and Domain mapping remain maintenance work. TypeORM has a useful transaction-scoped manager and is the first candidate to reconsider for a demonstrated CRUD-heavy module benefit. The present four paths do not demonstrate development hours saved.

Retain pg now: it has the smaller observed cold footprint, lower observed CPU for these representative writes, equivalent query counts and verified current controls; neither ORM has shown a net TCO/maintenance improvement sufficient to justify converting the whole Identity/worker/operator persistence. This accepts existing implementation with a documented drain correction, not arbitrary resistance to ORM. Sequelize additionally requires the uuid override and production-safe rollback diagnostic/control work. TypeORM raw is viable, but wrapping mostly raw SQL with an ORM has not supplied a measured operational benefit here.

Actual experiment code/dependency/control work is retained for review. Engineer hourly rates, future onboarding/maintenance time, migration effort and AWS bill are unknown; no invented hours/USD saved. Keep all modes' raw data, including fluctuations. SLO/security/durability/capacity remain mandatory if a later module or AWS run reopens this choice.

## Reproduce and next gate

From repository root:

```sh
npm run build
npm ci --prefix experiments/persistence-comparison --ignore-scripts
docker compose -f experiments/persistence-comparison/compose.yaml up -d --wait postgres
npm test --prefix experiments/persistence-comparison
npm run benchmark --prefix experiments/persistence-comparison
node experiments/persistence-comparison/analyze.mjs
docker compose -f experiments/persistence-comparison/compose.yaml stop
```

Tests/benchmark require permitted loopback connections. Existing SMTP suite also needs the experiment Mailpit service. Each benchmark invocation overwrites raw.json only after success; failed-run.json retains a failed report separately. Preserve named artifacts before a new run. Dataset/DB/logins are disposable; never point at a production/shared DB. Do not run tests and benchmark concurrently. Root build is required because this package deliberately uses the actual compiled Identity classes.

If adopting TypeORM later: freeze ports/SQL/schema; implement typed owned models/mappers and one technical executor/context; convert one representative path using the ORM-owned pool for all raw SQL; run full Identity/foundation/worker/operator/security/crash/HTTP checks; repeat paired runs with budget thresholds; convert the remaining persistence as one coherent rollout; canary/rollback to the previous compatible image without reversing SQL migrations. Production acceptance requires k6/RDS/AWS capacity, TLS/image/recovery and billed/estimated regional TCO provenance. None are closed here.

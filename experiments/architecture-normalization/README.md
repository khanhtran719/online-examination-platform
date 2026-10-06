# Architecture normalization — local before/after diagnostic

2026-10-06. Completed N-11 evidence for [ADR-006](../../docs/adr/006-source-layout-normalization.md) and [normalization checklist](../../docs/architecture-normalization-plan.md). Decision: accept structural/correctness normalization. These measurements demonstrate no added query round trips on the observed paths; they do **not** demonstrate a performance/cost improvement.

## Hypothesis and configuration

Relocating source, separating typed config/secret I/O and splitting domain writes from principal/CSRF queries should preserve authentication, transaction, worker and HTTP behavior without adding queries. Baseline runtime commit `cac9416`; [manifest](baseline-manifest.json) retains source/migration digests. [Path mapping](path-mapping.json) records old → current placement. [Checks](checks.json) record the moved worktree digest and all eight source/built migration matches.

Three runs before and three after on macOS ARM64/8 CPUs, Node24.17.0, Docker PostgreSQL17.11 ARM64. Two in-process HTTP API instances, pool4 each, 32 verified fixture users; Argon2id19MiB/time2/parallelism1/admission2, no Redis, loopback HTTP with an explicit cookie jar. DB at localhost55433 in a task-owned Compose project; a service already occupying55432 was not touched. Each run uses isolated fixture databases/logins. Worker accepted/retry observations use a no-network provider stub, 32 accepted and16 retry attempts. Actual SMTP delivery and public worker factory are covered separately by the52 integration cases.

## Observed results

All six runs completed13 operations each. Ten operations with error counters reported0 unexpected errors; the three Argon hash microbenchmarks completed but do not expose a separate error counter. The table uses **median of three per-run p95/p99 values**, not a pooled percentile. [Comparison JSON](comparison.json) includes all13 operations, min/max, p50/p95/p99, sequential RPS, CPU/RSS, queries, pool wait and transaction duration; raw samples remain in each run file.

| Operation | p95 ms, before → after | p99 ms, before → after | DB queries/op, before → after |
| --- | --- | --- | --- |
| login.http | 48.092 → 43.960 | 67.352 → 50.183 | 19.5 → 19.5 |
| me.http | 5.474 → 7.275 | 6.629 → 8.580 | 2 → 2 |
| refresh.http | 11.230 → 12.831 | 13.863 → 15.560 | 10 → 10 |
| logout.http | 9.253 → 12.590 | 10.930 → 12.665 | 9 → 9 |
| worker.accepted | 5.816 → 4.604 | 5.986 → 5.643 | 6 → 6 |
| worker.retry | 6.468 → 5.601 | 6.468 → 5.601 | 6 → 6 |

Me/refresh/logout p95 increased in the observations. CPU and transaction timings also vary; no causal explanation or performance gain is established. Before-run development activity, shared-host noise, sequential non-interleaved execution, small samples and lack of dedicated warmup control limit the comparison. SQL query counts and immutable migration bytes are unchanged. Local observations are below the specified Identity latency thresholds, but this does not establish production SLO compliance or rule out regressions under concurrent AWS load.

## Validation and decision

100 unit/tooling and52 real PostgreSQL/HTTP/SMTP integration tests passed without skips; lint/typecheck/build/contracts passed. The compiled migration CLI applied8 migrations to the isolated database, then reran from `/tmp` with0 new receipts. Actual [API/worker smoke](smoke.json) passed readiness and SIGTERM (combined shutdown581.814ms). Actual [operator CLI](operator-cli.json) passed bootstrap/grant/revoke, persisted3 audits, left0 admin roles after revoke and rejected repeated bootstrap. Normalization guards reject legacy source and forbidden dependency boundaries.

[Source self-review](self-review.json) compared six non-import runtime/controller bodies and24 Identity SQL literals with the baseline; all unchanged. Final guard regressions also restrict public composition factories to composition roots, excluding controllers.100 unit/tooling cases and lint/quality/contracts passed again after that repair. Task-owned PostgreSQL and Mailpit were stopped, volumes retained.

Raw runs: [before1](before-1.json), [before2](before-2.json), [before3](before-3.json), [after1](after-1.json), [after2](after-2.json), [after3](after-3.json).

Accept N-01–12 for source layout and tested behavior. Keep pg as the current adapter while TypeORM/raw-projection evaluation O-01–04 remains proposed and unmeasured. Neither pg nor an ORM is selected as a performance/cost winner. Browser HTTPS, live SES, ARM64 Linux image compatibility, k6 capacity, full production observability, failure recovery and AWS FinOps gates remain open.

## Reproduction and scope limits

Build current source, start local dependencies and use the existing benchmark entry point. For one after run with the isolated env/config:

```sh
IDENTITY_BENCH_OUTPUT=experiments/architecture-normalization/after-new.json node --env-file=/tmp/examination-normalization-api.env scripts/identity-benchmark.mjs
```

The env file is temporary local configuration derived from `.env.example` with DB URLs pointing to55433; no credential/key material is archived here. For baseline reproduction, restore runtime `cac9416` in an isolated checkout with the same dependencies/configuration. [Archived before harness](before-harness.mjs) is a template from that baseline, with worker diagnostics added; render its output path for the desired label and run from a `.local/` directory beside the baseline `dist`, since its imports are relative to that location. It is historical test data, not a current executable entry point. Current runs load the immutable migration bundle from the compiled artifact. Do not overwrite historical Identity benchmark JSON.

RPS here is achieved sequential diagnostic RPS, not maximum sustainable RPS. CPU includes API/client in one process and excludes PostgreSQL; RSS/its delta does not measure allocation/request. The worker stub excludes provider network/delivery latency, so jobs/sec here cannot size production mail capacity. No AWS resources were deployed: cost/hour, cost/1M requests, jobs/USD, SLO headroom and performance–cost curve remain **null/unmeasured**. No ORM comparison, cache benefit or AWS saving is claimed.

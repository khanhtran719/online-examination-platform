# Catalog diagnostic — frozen from one run

Run: `58451c3f-aa1e-4698-86e7-1c1218fad576`; recorded UTC: `2026-10-07T09:32:12.265Z`.
Source: [diagnostic.json](diagnostic.json). This summary is generated from that file by `scripts/catalog-diagnostic-report.mjs`.

## Configuration and scope

Sequential calls on one local restricted PostgreSQL process; 25 samples per API operation, 100 questions and 2 sections per new publication. Page size 20; pool max 10; statement timeout 2000ms; lock timeout 500ms. Node v24.17.0, darwin/arm64.

Browse/detail invoke the actual Catalog query port through the application service. Authentication/rate admission for HTTP is excluded. Publish includes current-session/permission revalidation, receipt lookup, locks, DB clocks, snapshot/pointer, audit/receipt and commit. Draft/import preparation, warm-up, EXPLAIN and provenance generation are excluded.

## Measured milliseconds

| Operation | n | p50 | p95 | p99 |
| --- | --- | --- | --- | --- |
| Browse projection | 25 | 3.184 | 5.126 | 6.270 |
| Detail projection | 25 | 1.302 | 1.681 | 2.060 |
| Publish application call | 25 | 27.695 | 42.770 | 103.994 |
| Publish transaction including acquisition | 25 | 27.511 | 42.677 | 103.895 |
| Publish lock statement round trip | 75 | 1.005 | 5.666 | 14.307 |
| Publish connection acquisition | 25 | 0.020 | 0.085 | 0.369 |
| Read transactions | 0 | not measured | not measured | not measured |

Read statements: 50; read errors: 0; detail payload: 666 bytes. Publish statements: 425; publish errors: 0; statements per publication: 17.000 / 17.000 / 17.000 (p50/p95/p99, counts).

Observed publish pool: max total 1, max active 1, max waiting 0. These are event-sampled pool occupancy values for a sequential diagnostic, not a utilization/headroom benchmark. Lock round trips include SQL execution/network plus any lock wait; they are not lock-hold duration. Read transaction samples are absent because projections autocommit.

## Exact query plans and provenance

Warm-up captures the real adapter SQL and bindings in memory. EXPLAIN ANALYZE/BUFFERS uses those exact statements, including question-count/section aggregation, with the same parameters. Only stripped plans and SQL SHA-256 digests are exported; SQL text, parameters, prompt/key content and credentials are excluded. The raw file includes source/config/migration hashes and the test-source digest.

## Acceptance limits

This is local diagnostic evidence. It does not establish sustainable RPS, concurrent capacity, HTTP SLOs, CPU/memory per request, optimum pool size, AWS costs or an optimization winner. Those remain unmeasured. CAT-10 still needs the actual Assessment start/publication race. Historical diagnostics are retained separately and are not directly comparable across changed datasets or scopes.

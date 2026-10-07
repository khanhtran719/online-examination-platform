# Catalog local diagnostic — 2026-10-07

Raw sample: [diagnostic.json](diagnostic.json). The integration spec writes this file from a disposable PostgreSQL 17 database. It is a single-process projection measurement, not sustainable RPS, an SLO, or an AWS saving.

## Configuration

| Item | Value |
| --- | --- |
| Node | v24.17.0 |
| Pool max | 10 |
| Statement timeout | 2000 ms |
| Lock timeout | 500 ms |
| Iterations | 25 browse and 25 detail |
| Page size | 20 |
| Published exams visible to the plan | 7 |
| Errors | 0 |

Browse and detail here call the Catalog projection directly with an actor id. Each call is one `catalog.read` statement. The sample also includes one extra browse used to choose a detail id, so the observer recorded 51 statements. Session authentication and rate admission are outside this window. The OpenAPI budget for the HTTP route remains principal, admission and one projection.

Explicit transaction-duration samples in the window are zero because these reads autocommit. The JSON keeps pool, lock and transaction fields so a later comparison can use the same shape.

## Latency and payload

Times are in-process round trips on this host, in milliseconds.

| Call | n | p50 | p95 | p99 |
| --- | --- | --- | --- | --- |
| Browse | 25 | 1.480 | 2.882 | 2.981 |
| Detail | 25 | 1.065 | 1.545 | 1.705 |

The detail JSON payload in the sample is 583 bytes. It contains published metadata and section summaries, not prompts or keys.

## Plans

`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` was reduced to node type, relation, actual rows, actual total time and shared hit blocks. Filter text, index conditions and SQL text are not stored.

Browse: Limit, then Sort, then Nested Loop. The outer side is an Index Scan on `exams` (7 rows). The inner side is an Index Scan on `published_versions`. Detail: Nested Loop of an Index Scan on `exams` and an Index Only Scan on `published_versions`.

No browse index was added. Seven rows and an in-memory sort are not a before/after capacity result.

## What this does not close

CAT-10 stays partial until Assessment can start an attempt in the same transaction context as the frozen version. ID-11, SES, Reporting, Terraform and production acceptance stay open.

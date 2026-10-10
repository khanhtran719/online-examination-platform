# Admin business metrics

GET /v1/admin/business-metrics with a live verified/enabled reporting.read session
returns one no-store primary snapshot. Candidate/anonymous callers are denied
before query parsing. Both from/to are optional together, canonical UTC milliseconds (years0001–9999)
(e.g.2026-10-09T00:00:00.000Z); range is [from,to), >0 and<=7days, to<=DB asOf.
Default previous24h ending at asOf. Invalid/unpaired/future/unknown/duplicate query
parameters return400; no broad query/export/filter override is accepted.

The counts are current durable state for attempts started within that cohort:
startedAttempts, submittedAttempts, completedAttempts, failedAttempts,
expiredSubmissions, expiredCompletedAttempts and activeAttempts. CREATED/future
starts are excluded. Submitted includes completed/failed/deadline submissions;
expired counters overlap it. Active is IN_PROGRESS with deadline>asOf, not people
online. COMPLETED compact identities after payload purge still count. Opt-out,
disabled candidate and archived exam are included in authorized operational totals.
No names/emails/IDs/answers/keys/scores or breakdown that identifies individuals.

A completion today of an attempt started last week changes last week's cohort;
it does not become a start or completion event today. Replay can move failed to
completed and duplicates add no second attempt. This endpoint is a snapshot,
not event-rate time series, business ledger, unique-user capacity or billing data.
Retention/account deletion/restore require their own privacy reconciliation.

Global backlog deliberately ignores the selected window: accepted SUBMITTED,
EXPIRED, PROCESSING and FAILED with replay_pending. pendingAttempts includes its
replayPendingAttempts subset. Terminal FAILED without replay and COMPLETED are
excluded. Oldest original submission/age remains unchanged by retry/replay except
age increases with asOf. Empty timestamp and age are null; show “Không có backlog”.
Zero-age nonempty backlog is valid. Do not label this SQS depth or active workers;
transaction-local PROCESSING may never be visible. Use real queue depth/oldest age
and worker measurements for future scaling decisions. Combined /v1/admin/metrics
remains a separate specified endpoint requiring telemetry providers.

Authentication/admission, BEGIN, locked current permission, one aggregate,
mandatory access audit and COMMIT use8 SQL calls; payload is tested below4KiB.
Global audit reporting.business-metrics.read uses BUSINESS_METRICS and fixed
UUID00000000-0000-4000-8000-000000000000, actor/correlation only. No response is
released on audit/commit/corrupt counter failure; technical faults return safe503.
Respect429/Retry-After and bounded503 retry, never loop rapidly. Operator checks
use correlation IDs, never lower DB constraints or fabricate zero values.

This aggregate can scan every attempt identity, including compact history. A
seven-day filter limits meaning, not table I/O. Keep manual refresh or>=30s+jitter,
pause hidden views, and do not turn a single response into a synthetic chart.
Production polling/admission needs mixed-load/primary-utilization benchmarks;
current8-query/payload bounds alone do not establish sustainable capacity or SLO.

[Plan](../admin-business-metrics-2026-10-10.md),
[ADR](../adr/014-business-metrics-snapshot.md),
[evidence](../evidence/admin-business-metrics-2026-10-10/README.md),
[experiment](../../experiments/admin-business-metrics/README.md).

# ADR-014: Business cohort counts and global durable backlog

Status: accepted locally2026-10-10 with
[BM-01–06](../admin-business-metrics-2026-10-10.md). Production NOT ACCEPTED.

## Decision

Add GET /v1/admin/business-metrics owned by Reporting with reporting.read. Keep
specified GET /v1/admin/metrics unchanged: its required HTTP/SQS fields need real
telemetry providers and cannot be filled with guessed zeros or DB backlog. The
new DTO does not silently replace the existing Web parser/contract. No Web change
or technical observability implementation is inferred from this increment.

Counts use current durable state of the started_at cohort [from,to), excluding
CREATED and future identities/submissions. Explicit canonical UTC millisecond
bounds (years 0001–9999) are paired, positive and <=7days, with to<=primary statement asOf. Default
previous24h. startedAttempts counts durable starts; submittedAttempts includes
all accepted submissions, including completed/failed/expired. completedAttempts
and failedAttempts describe current state, not completion/failure events that
occurred in the time range. activeAttempts means IN_PROGRESS with deadline>asOf,
not browser presence or unique concurrent users. expiredSubmissions overlaps
submitted states; expiredCompletedAttempts is its COMPLETED subset. Replay can
move a count from failed to completed; duplicate delivery adds no second start.
Compact purged COMPLETED identities still count although scores are unavailable.
This is not an immutable analytics ledger or an all-time retention guarantee.

Backlog is global regardless of the selected cohort: SUBMITTED/EXPIRED/PROCESSING
or FAILED with replay_pending. Terminal failures without replay and COMPLETED are
excluded. Return pendingAttempts, replayPendingAttempts, oldest original accepted
submittedAt and integer age seconds at asOf. Empty oldest/age are null. Retry or
replay preserves original age. Durable pending spans unqueued outbox, queued jobs
and pending replay; it is neither approximate SQS depth nor worker activity.
Transaction-local PROCESSING is not invented from receives or long HTTP requests.

## Ownership, safety and cost

Reporting declares read-only Assessment attempts(started_at,submitted_at,status,
expired,deadline,replay_pending) as its physical source. All source writes,
worker completion, terminal failure, replay and retention remain Assessment-owned.
No private source repositories or aggregate hydration. Domain owns count/time/
subset validity; Application owns current locked Identity revalidation, projection
and access audit in the existing UnitOfWork. HTTP authenticates/authorizes/admits
before mapping; current actor mismatch/audit/commit/corrupt counts release no report.
Audit action reporting.business-metrics.read uses BUSINESS_METRICS and the fixed
single-platform UUID00000000-0000-4000-8000-000000000000, actor/correlation only.
No dynamic counts, query text, window, PII/keys/answers or scoring detail is logged.

One statement and one primary snapshot count cohort and global backlog consistently.
No source locks, result join, COUNT DISTINCT, per-row calls, queue/SDK/network,
cache, cursor, new resource or public Reporting export.8 auth-inclusive SQL calls,
4KiB response budget. Existing pool/admission/timeouts and actor-lock order remain.
A seven-day semantic window does not bound physical work: baseline scans attempt
identities in O(N), uses constant-size aggregate state and can pressure the primary.
Measure100k/1M natural plans and diagnostics; don't claim an indexed/range scan
or optimize by increasing RDS before evidence. Sustained mixed workloads, skew,
utilization and audit retention are separate production gates. Start operational
usage with manual refresh or>=30s+jitter and pause hidden views; choose a production
poll/admission policy only after load measurement. Do not use this snapshot for
write invariants, authorization, queue scaling or Performance/Cost capacity.

## Compatibility and limits

Additive operation/schema and AC-37; combined metrics, events, migrations, grants,
configuration and module exports keep their contract. All applied migrations and
prior evidence remain immutable. Restore/privacy deletion may change source
population; independent ledger reconciliation remains REP-04/production work.
No result-score zero, missing-provider zero, fabricated time series or AWS bill.

# Grading consumer operations

Local implementation2026-10-09. This is a deployment/runbook deliverable, not an
AWS deployment or an accepted end-to-end scoring SLO. See the
[delivery report](../grading-consumer-2026-10-09.md) and
[publisher runbook](submission-publisher.md). The later
[terminal recovery increment](../grading-recovery-2026-10-09.md) and
[recovery/replay runbook](grading-recovery.md) add local ASYNC-10 evidence;
managed AWS acceptance remains open.

## Authority and startup

1. A database administrator applies `infra/database/roles.sql` to create the
   NOLOGIN grading group. A dedicated LOGIN inherits only
   `examination_grading_worker`; it must not inherit Identity/runtime/owner roles.
2. Apply forward migrations0015/0016 through the normal migration owner. Keep
   applied0001–0015 bytes/checksums unchanged.0015 adds digest-only poison evidence
   and grading grants;0016 adds terminal recovery generations/history/audit and
   separate recovery authority. No answer/submission-identity UPDATE, Identity
   secrets or result UPDATE/DELETE is granted.
3. Configure the same regional Standard queue used by the publisher, an encrypted
   source queue and same-account/region Standard DLQ. Set the source RedrivePolicy
   to the exact configured DLQ and maxReceiveCount (default5). Deployment must
   separately verify DLQ encryption, retention/redrive permissions, effective IAM
   and networking; startup does not prove those controls.
4. IAM for the consumer needs only `sqs:GetQueueAttributes`, `sqs:ReceiveMessage`,
   `sqs:DeleteMessage`, `sqs:ChangeMessageVisibility` on the source queue. A customer
   managed KMS key also needs the corresponding scoped decryption authority.
   Sending/redriving jobs is a separate publisher/operator capability.
5. Build the image and run `node dist/workers/sqs/grading.main.js` with production
   configuration. `.env.grading.example` is illustrative; no account, region,
   queue, DB login or ECS task is provisioned by that file. Local command after
   configuring real local prerequisites: `npm run build`, `npm run grading:local`.

Worker startup verifies its DB group, generation-column authority and absence of Identity schema authority,
then reads the source queue ARN, encryption and redrive attributes. Incorrect
authority/configuration fails closed with a redacted startup event. Production
requires verified PostgreSQL TLS and regional SQS HTTPS. Explicit HTTP endpoint
overrides work only in development/test on loopback.

## Processing and ACK

- Receive at most the admitted concurrency slots (default2, maximum8); concurrency
  cannot exceed the worker DB pool. Every admitted message starts immediately.
- Parse at most16KiB of envelope JSON, enforce strict v1 fields, and compare
  submission/version/exam/deadline/time/kind/expired identity with the locked
  PostgreSQL attempt. No answer or key is accepted from the broker body.
- Run one grading UoW: lock attempt → transaction-local PROCESSING → frozen Catalog
  snapshot and committed answers → exact-match integer grade → result/details →
  question/option counters → best-attempt projection → COMPLETED/inbox → COMMIT.
- DeleteMessage runs only after durable completion, verified duplicate, stale
  generation, durable terminal failure or quarantine. The inbound public factory rejects an ambient caller transaction;
  returning from a joined UoW is insufficient proof of outer COMMIT.
- Same event delivery or matching submission under another event ID after completion
  creates no second result/projection effect. Another event ID before completion
  is quarantined. An inbox ID belonging to another attempt is never reinterpreted.
- A schema/identity mismatch stores SHA-256 body digest, safe code and server time,
  then ACKs. It never changes a referenced attempt to FAILED and never stores raw
  body, answers, keys, handles or secrets.
- Failed grading/quarantine persistence or lost DeleteMessage ACK remains
  unacknowledged. DB rollback removes all partial effects; committed effects survive
  ACK failure and are recognized on redelivery.
- Known permanent scoring validation rolls grading back before a separate terminal
  FAILED/quarantine/audit UoW. Unknown technical errors retry. Older generation
  deliveries cannot execute/clear a newer replay; future generation quarantines.

Default visibility60s, heartbeat10s, long poll10s, whole-call timeout15s. SDK attempts
are1; polling failures use bounded exponential jitter. Heartbeats never overlap,
are drained before ACK, and failure suppresses ACK. A heartbeat loss does not undo
a committed result. SQS is at least once even during visibility; PostgreSQL
identity/result uniqueness is the correctness authority. See
[AWS ReceiveMessage](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html)
and [visibility semantics](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html).

## Health, shutdown and observation

Expose worker `/live` and `/ready` only on its private task network. Readiness
depends on poll/settlement health, recent polling and a bounded30s DB probe.
Metrics/probes do not overlap. Readiness becomes false during drain. SIGTERM/SIGINT
stop polling admission, allow all deliveries already received to settle, stop
heartbeats, drain probes and close the SQS client/DB pool. The CLI force limit is30s;
forced termination leaves broker delivery retryable and uncommitted SQL rolls back.

Structured metrics every30s/final drain: completed/duplicate/quarantined/terminal/stale/unsettled
counts, poll failures, fixed settlement-duration buckets, query count, transaction
and lock duration totals, pool stats, RSS and process CPU counters. Process CPU/RSS
are cumulative snapshots, not CPU or allocated memory per job. Settlement time
includes broker deletion; result INSERT time is not a physical COMMIT timestamp.
Event logs sample5% with a validated correlation UUID; no IDs are metric labels,
and no raw SDK/PG errors or message body is logged. Set diagnostic retention14days.
Full OpenTelemetry/CloudWatch cost integration and measured sampling overhead remain
in the observability phase.

Alert on increasing unsettled/poll-failure/quarantine counts, source oldest age,
queue backlog, DLQ messages and pool waits. Queue/RDS/ECS metrics and alert thresholds
must be wired/measured in AWS; local log counters do not supply those managed metrics.

## Incident and remaining gates

Use a controlled operator/migration-owner session to inspect digest/code/time in
`platform.invalid_submission_messages`; do not request raw candidate answers or
secrets in diagnostics. Repeated poison bodies deduplicate by digest. There is no
automatic quarantine purge in this increment: retention/lifecycle automation and
audited administration remain open. Preserve unresolved incident evidence under
the data-retention contract and implement bounded maintenance before production.

Transient failures never become terminal on their first occurrence. Verified
bounded source redrive protects retries; the dedicated recovery mode now settles
exhausted DLQ jobs. ASYNC-10 is accepted locally; follow the
[recovery runbook](grading-recovery.md) for separate DB/IAM authority, audited
operator CLI and retention. A job can remain SUBMITTED/EXPIRED while recovery is
not running. FAILED can grade only with authorized replay_pending and the matching
generation; this worker has no public replay endpoint or self-authorization.

Deploy0015/0016 before the new worker. Before the first replay, upgrade and drain
all publishers/consumers; after nonzero replay, rollback must keep generation-aware
images and forward migrations. Full image compatibility drill remains DB-12.
Never replay by deleting successful inbox/results/counters.
AWS failover/task interruption/deployment under load and sustainable jobs/USD have
not been accepted. Result/history/review and public ranking/privacy filters remain
separate HTTP/Reporting work.

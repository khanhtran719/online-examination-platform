# ADR-009: Generation-fenced terminal grading recovery

Status: accepted for the local ASYNC-10 implementation,2026-10-09. Specializes
existing architecture §§77–79 and the FAILED/replay product contract; no boundary
exception or broker/service change. Managed AWS deployment remains unaccepted.

## Context

A committed submit must survive worker/transport failure. Successful grading
already commits results/inbox/projections atomically before ACK. Source retries
are bounded, but an exhausted job needs an audited terminal outcome and a
controlled replay. SQS is at least once: an old source/DLQ copy can arrive after
a new authorization. A replayPending boolean alone cannot distinguish those
generations while preserving the original event identity.

## Decision

Assessment owns GradingRecovery and the operator replay capability. A failed
grading UoW rolls back first. Known permanent scoring validation is settled in a
separate root UoW; exhausted retries are settled by a verified DLQ worker mode.
FAILED, a generation-specific validated quarantine envelope and an unsampled
audit commit together, without partial result or successful inbox. Unknown
technical errors retry; invalid/foreign messages retain digest-only quarantine.

Use an integer grading_generation on attempt/outbox and generation on quarantine,
with a composite (event_id,generation) key. Operator-only replay locks FAILED,
requires current unresolved evidence/revision, commits audit+pending+generation+
outbox and preserves original event/submission/answers/version. Concurrent repeat
acceptance is idempotent; COMPLETED is terminal. Never delete successful evidence.

The publisher carries generation as one SQS Number attribute outside the strict
immutable v1 body; absent means initial0. Consumers compare it with locked DB
state. Old generations ACK without effects; future/invalid metadata quarantines.
Only the authorized current pending generation may grade FAILED. This avoids a
second event identity, successful-inbox deletion, or a new queue per replay.
The MD5 attribute check protects transport integrity, not authority.

A narrow migration-owned SECURITY DEFINER function grants only replay execution
to the operator group; private PG adapter and public Assessment factory expose
it to the operator CLI. Recovery has its own restricted DB group and no
answers/keys/Identity/outbox/replay authority. The existing worker image has a
DLQ mode with no Catalog composition; no permanently running new AWS resource
is introduced. Effective IAM and human attribution remain deployment duties.

## Alternatives and consequences

| Option | Reason not selected |
| --- | --- |
| Reuse event+replayPending without generation | Old deliveries could execute or cancel a newly authorized replay |
| Mint a new event/submission or delete inbox/result | Violates immutable identity or enables duplicate effects |
| Blind managed DLQ redrive | Omits required revision/audit/pending authorization |
| Kafka/new workflow service | No requirement/evidence offsets extra operational/cost burden |
| Permanently provision a recovery service now | Recovery-age/baseline capacity has not been measured |

One integer comparison adds O(1) admission work; no network call in the grading
UoW. Normal generation0 remains15 observed SQL statements/job in the local
diagnostic. Recovery/replay paths need extra SQL/audit and are not claimed faster
or cheaper. Live sustainable capacity/TCO remains unmeasured.

Migration0016 is forward-only; applied0001–0015 stay immutable. Before first
nonzero replay, all publisher/consumer tasks must be generation-aware and drained
of old images. Rollback must retain that ability once replay is used. Retention
preserves unresolved quarantine and successful inbox/result identity. Admin
replay HTTP remains a later capability; this operator channel does not implement
that public API.

## Evidence and remaining gates

[Closure](../grading-recovery-2026-10-09.md) and
[raw evidence](../evidence/grading-recovery-2026-10-09/README.md) record fail-first
generation/terminal/role/transport probes, real restricted-PG concurrent replay,
audit rollback, immutable body, stale source/DLQ handling and compiled CLI/worker.
The [runbook](../runbooks/grading-recovery.md) defines deployment and rollback.

[AWS ReceiveMessage](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html)
documents DLQ source metadata; [message metadata](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-metadata.html)
documents Number attribute checksums. Local fixtures validate code against these
contracts. They do not prove live SQS behavior, effective IAM, failover, recovery
time, image compatibility, retention automation, tracing or jobs/USD.

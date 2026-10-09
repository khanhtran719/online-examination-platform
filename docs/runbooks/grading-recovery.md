# Terminal grading recovery and replay

Local implementation2026-10-09. Scope: ASYNC-10; managed AWS permissions, DLQ
retention, deployment under load and timed recovery remain unaccepted. See
[decision](../adr/009-grading-recovery-generations.md),
[closure](../grading-recovery-2026-10-09.md) and
[normal worker](grading-worker.md). PostgreSQL is authoritative.

## Failure policy and durable outcomes

| Input/outcome | Durable effect | Broker action |
| --- | --- | --- |
| Invalid JSON/schema, invalid generation or untrusted DLQ source | Digest-only invalid-message quarantine; no attempt mutation | ACK after quarantine commits |
| Submission/version/exam/time/kind mismatch or future generation | Digest-only quarantine; no foreign attempt failure | ACK after quarantine commits |
| Older generation than locked attempt | No effect; newer replay permission remains | ACK as stale |
| Technical error/timeout/lock/connection failure | Grading rollback; no result/inbox/failure claim | Do not ACK; bounded source redrive |
| Known permanent scoring validation | Roll back grading first; new root UoW persists FAILED + safe quarantine + audit | ACK after terminal COMMIT |
| Verified current-generation source message in configured DLQ | FAILED + safe quarantine + audit in one root UoW | ACK after terminal COMMIT |
| Duplicate terminal failure | Verify existing current-generation durable failure; no new audit/effect | ACK |
| Already COMPLETED with its result | Preserve success; no terminal failure | ACK verified duplicate |

Failure codes exposed to internal persistence are SCORING_INVALID and
RETRY_EXHAUSTED. Unexpected infrastructure errors are never reclassified from raw
error text. No zero score is invented for FAILED. A failed recovery transaction,
including audit failure, stays unACKed. An ACK timeout after terminal commit can
redeliver safely. Normal successful grading still commits result, statistics,
leaderboard, inbox and COMPLETED atomically.

Quarantine retains the validated v1 submission envelope, SHA-256 of received body,
safe code, original event/attempt, generation and failure time. The envelope has
no answers, answer keys or credentials. Malformed/forged bodies retain only their
digest/code/time. Do not store raw poison, receipt handles or arbitrary exception
strings. Business audit is unsampled and transactional; diagnostic event logs
remain5% sampled with14-day diagnostic retention.

## Deployment sequence and authority

1. Bootstrap `infra/database/roles.sql`, then apply forward0016 with the migration
   owner. Preserve applied0001–0015 checksums and committed results/inbox.
   Startup checks generation-column authority; missing migration fails closed.
2. Create a dedicated recovery LOGIN inheriting only
   `examination_grading_recovery`. Its DB grants allow attempt metadata/terminal
   transition, result existence, poison/failure quarantine and audit INSERT. It
   cannot read answers/Catalog keys/Identity, change answers, publish outbox,
   authorize replay or delete results/evidence. Normal grading retains its separate
   `examination_grading_worker` authority.
3. Upgrade **all source consumers and publishers to generation-aware versions**,
   drain old tasks and verify fleet versions before authorizing the first replay.
   The schema addition alone does not make an old image generation-aware.
4. Configure an encrypted Standard source/DLQ pair in the same region/account.
   Source RedrivePolicy must match GRADING_DLQ_ARN and GRADING_MAX_RECEIVE_COUNT
   (default5). For recovery startup, the DLQ must explicitly have RedriveAllowPolicy
   `byQueue` with exactly the configured source ARN. Shared DLQs are not adopted
   by this implementation.
5. Scope recovery IAM ReceiveMessage/DeleteMessage/ChangeMessageVisibility/
   GetQueueAttributes to the DLQ; GetQueueAttributes also needs the source queue.
   Add only the required KMS decrypt permissions for a customer managed key.
   No SendMessage, PurgeQueue or StartMessageMoveTask is needed. Queue resource
   policies must prevent arbitrary direct sends to the DLQ. Validate effective IAM,
   TLS, private networking, encryption and retention separately in AWS.
6. Use the existing image entry point `node dist/workers/sqs/grading.main.js`,
   with GRADING_QUEUE_MODE=dead-letter and the recovery DB LOGIN. The configured
   SUBMISSION_QUEUE_URL stays the source URL; validated DLQ ARN determines the
   recovery receive URL. Health port must be private and distinct if colocated.

`.env.recovery.example` is illustrative only. After supplying a dedicated local
LOGIN/queue fixture, `npm run grading:dlq:local` starts the mode; it does not create
queues, users, roles or AWS resources. Run recovery on demand initially; this
increment does not justify another permanently provisioned ECS service.
Production frequency/baseline capacity requires measured oldest-age/recovery SLO.

Each DLQ message must carry the exact source ARN in DeadLetterQueueSourceArn.
Missing/foreign source is quarantined as poison, never used to fail an attempt.
The API documentation lists this system attribute:
[AWS ReceiveMessage](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html).
Local SDK HTTP fixtures prove request/response handling, not managed redrive
behavior or IAM enforcement.

Admission, timeout/visibility heartbeat, health/backoff and SIGTERM drain are
shared with the normal worker. Default concurrency2 cannot exceed DB pool;
maximum8. The worker owns no local durable state. Preserve unresolved quarantine
until incident resolution; there is no automatic purge yet. Baseline retention
and future bounded maintenance follow [security policy](../security-and-permissions.md#5-audit-and-retention).

## Operator-authorized replay

1. Stop the cause of failure. Review safe failure code, attempt ID, generation,
   revision and audit through an authorized operator channel. Correct a code/
   configuration defect without rewriting frozen questions, accepted answers,
   submission identity or successful results. Back up incident evidence.
2. Supply a separate operator LOGIN with `examination_operator` membership through
   DATABASE_OPERATOR_URL, plus OPERATOR_IDENTITY and a concrete OPERATOR_REASON.
   Use secret injection; never put a live URL/password in shell history, documents
   or logs. Identity is attributed as authenticated session_user plus operator
   label; trusted human/IAM attribution remains a deployment gate.
3. Build and execute the narrow CLI with the observed FAILED attempt revision:

```sh
npm run build
node dist/workers/operator/grading-replay.main.js <attempt-uuid> <expected-revision>
```

4. A successful response contains only event=grading.replay.accepted, revision,
   generation and replayPending=true. This is acceptance, not scoring completion.
   The single SECURITY DEFINER DB call locks the attempt, requires unresolved
   matching failure evidence, validates frozen identity and commits replay audit,
   replayPending, revision/generation and outbox together. Audit failure rolls all
   effects back. Runtime/grading/recovery groups cannot execute it.
5. Concurrent identical acceptance returns the already accepted pending revision
   without another generation/audit; conflicting revision fails closed. At most
   one replay is pending. Current implementation caps replay generation at1000;
   reaching the cap requires reviewed forward policy, never manual counter reset.
6. Let the normal publisher deliver the outbox. Do not use raw SQS redrive as a
   replacement for authorization: it neither increments generation nor commits
   the required DB audit/pending state. Do not delete inbox/results/statistics to
   force another scoring effect. A delivery-only publisher replay cannot authorize
   grading FAILED.

Envelope fields/event/submission/time/answers/version remain unchanged. Generation
is the SQS Number message attribute gradingGeneration, outside the immutable JSON
body. Absence means legacy0; initial generation0 publishes without the attribute.
Replay generations1..1000 require a matching attribute checksum. The checksum is
a transport integrity check, not a signature or authorization; IAM and DB state
remain the trust controls. See
[AWS message metadata](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-metadata.html)
and [SendMessage acknowledgement](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html).

JSONB preserves the logical envelope, not arbitrary input whitespace/property
ordering. A retained outbox row keeps original created_at/body. If diagnostic
retention already pruned it, replay reconstructs the same validated envelope from
quarantine and sets created_at to original submittedAt; replay_at supplies delivery
age. No new attempt/quota slot is created.

Old source/DLQ generation0 after authorization1 cannot execute or clear the
pending replay. If generation1 exhausts, terminal settlement records a second
failure under (eventId,1) and clears pending. A later authorized generation2
remains protected from generation0/1. Completion resolves prior failure rows in
the same UoW; their history and audit remain. The Admin replay HTTP route and
permission-aware public result/history/review APIs remain future work.

## Rollback, incident diagnosis and acceptance gaps

Before the first nonzero replay, compatible prior images may be considered only
after the image/schema drill. Once replay is used, rollback must retain
generation-aware publisher/consumer/recovery versions and forward0016. An old
publisher can omit generation, and an old consumer cannot fence stale replay;
do not roll back to it. Stop/drain workers if no safe image is available and
preserve outbox/DLQ/quarantine for repair. DB-12 compatibility drill is still open.

Observe terminal/stale/quarantine/unsettled counters, source/DLQ oldest age,
outbox pending/parked age, failure/replay audits, pool waits and queue transport
errors. Logs are bounded; never add attempt/event IDs as metric labels. The
worker's `failed` metric means an unsettled transport/UoW operation; `terminal`
means durable FAILED settlement. They are different counters.

Still required: live SQS source redrive/origin/attribute tests; least-privilege
effective IAM/KMS/resource-policy proof; retention/admission reconciliation;
real task crash/visibility/failover/deployment drills; measured recovery time;
full tracing/alerts; HTTP result/privacy/admin replay; sustainable jobs/sec/task,
pool/task budget and jobs/USD. These local tests do not establish an AWS SLO or
production acceptance.

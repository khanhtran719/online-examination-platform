# Grading terminal recovery closure — 2026-10-09

**ASYNC-10 is accepted locally.** Assessment now settles verified permanent/
exhausted grading failures durably and supports audited operator replay without
changing submission identity. Roadmap77/216 checked,139 pending. Production stays
NOT ACCEPTED; no AWS deployment, sustainable capacity or cost saving is claimed.

[Raw evidence](evidence/grading-recovery-2026-10-09/README.md),
[ADR-009](adr/009-grading-recovery-generations.md) and
[recovery runbook](runbooks/grading-recovery.md) define scope and operation.
Previous ASYNC-05–07 and publisher acceptance remains. This increment adds
generation-fencing/transport subsets to ASYNC-11; ASYNC-08/09/11/12 remain open.
No Admin replay HTTP, Web, Reporting read API, Terraform, stage, commit or deploy.

## Delivered behavior

- A known permanent scoring validation rolls the original grading UoW back,
  then a separate root UoW commits FAILED, validated generation-specific
  quarantine and unsampled SYSTEM audit. Unknown technical errors remain
  retryable and unACKed; no successful inbox or partial score survives failure.
- A dedicated recovery worker mode receives the configured DLQ, verifies source/
  DLQ configuration and each message's original source ARN, and commits terminal
  settlement before ACK. It needs neither Catalog keys nor candidate answers.
- Malformed schema, forged identity, invalid/future generation and foreign DLQ
  origin enter digest-only poison quarantine. They cannot fail a legitimate
  attempt. Current FAILED duplicates require durable failure evidence before ACK;
  COMPLETED remains terminal.
- The operator CLI uses a dedicated DB authority and expected revision/reason.
  Replay audit, revision/generation, replayPending and outbox commit atomically.
  Concurrent repeat authorization has one effect. Frozen event/submission/
  version/answers/time/correlation/causation remain unchanged; no new quota slot.
- Generation travels as a Number message attribute outside the strict v1 JSON
  body. Initial absent metadata means0. Old source/DLQ generations ACK stale
  without executing/clearing a newer replay. Future metadata quarantines.
  Repeated failure records another (event,generation) row; successful replay
  resolves earlier failures in the same grading commit without deleting history.

The public factory rejects an ambient caller transaction before terminal recovery
or replay, preserving root COMMIT-before-ACK. Broker I/O is outside PostgreSQL
transactions. Application/Domain remain plain classes; Infrastructure implements
ports. The reusable submission-identity predicate is Domain-only; no driver/
Nest/Redis/AWS imports cross the business boundary.

## Source, schema and authority

| Placement | Responsibility |
| --- | --- |
| Assessment Domain grading-submission | Authoritative frozen identity comparison shared by grading/recovery |
| Assessment Application GradingRecovery/failure port | Terminal policy and UoW orchestration |
| Assessment private PG failure adapter | Guarded failure, safe envelope and audit SQL; operator function call |
| Assessment public worker factory | Root committed inbound recovery/replay composition |
| Global SQS adapter/shared queue ports | Bounded receive/send and Number generation checksum metadata |
| workers/sqs + workers/operator | Health/drain/transport lifecycle and narrow replay CLI |
| Forward0016 + roles.sql | Generation constraints, failure history, restricted recovery group and operator-only function |

0016 adds integer generation0..1000 to attempts/outbox and generation-specific
quarantine with safe optional envelope/digest. It replaces quarantine's event
primary key with (event,generation), preserving old rows as0. Runtime quarantine
write authority is revoked; worker/recovery grants are explicit. Recovery may
read only terminal admission metadata/result existence and write failure/audit/
poison evidence; it cannot read keys/answers/Identity, publish or authorize replay.
Operator function is SECURITY DEFINER with pg_catalog search_path, qualified
owned tables and PUBLIC execute revoked. Audit identifies session_user plus
operator label; effective IAM/human attribution remains an AWS gate.

No runtime dependencies or lockfile were changed. pg remains behind private
adapters per ADR-008. Readable SQL follows R-77/conventions102.1. Formatting
verification compares SQL lexical tokens/quoted literals; it does not establish
a query-plan or performance improvement.

## Validation

| Check | Result / scope |
| --- | --- |
| Root tests |327 PASS:190 API/28 suites,41 tooling,96 Web;0 skipped |
| Full integration |214 PASS/14 suites; restricted disposable PG17 on55435, local SMTP/SDK HTTP fixtures |
| Lint/quality/contracts | PASS;46 operations/425 examples unchanged |
| Strict typecheck/build | PASS; compiled recovery worker and operator CLI exercised |
| Historical preservation |254 protected files unchanged:15 applied migrations +239 historical evidence |
| Build assets |16 source/built migrations byte-identical |
| Cleanup | Disposable databases/logins/connections removed; only services started for validation stopped; volumes retained |

Fail-first probes cover missing recovery use case, stale/future generation
executing without a guard, absent recovery authority, missing DLQ mode/transport,
missing compiled operator CLI and repeated terminal source delivery being retried.
Intermediate role/source-identity assertion defects were fixed before GREEN.
The first full run found a minimal outbox fencing fixture missing the new column;
its schema was updated while retaining all prior lease/fencing assertions.

Real PG recovery cases prove concurrent terminal settlement, terminal/audit
rollback, scoring-validation rollback, concurrent replay, preserved envelope,
stale source/DLQ, repeated replay generations, stale revision rejection, replay
audit rollback, denied worker/recovery replay/evidence deletion, root-boundary
rejection and poison isolation. A dedicated dispatch LOGIN proves the public
publisher claims the replay generation after COMMIT, passes1 alongside unchanged
logical JSON and marks only after ACK. Local SDK cases independently use the
known Number1 metadata MD5 fixture, verify DLQ source/policy and exact broker
attributes. A compiled recovery process observes durable FAILED/audit before a
deliberately failed DeleteMessage, redelivers without a second effect, drains on
SIGTERM, then invokes the compiled operator CLI.

One evidence-path mistake was corrected explicitly: an early grading-only run
reused the previous globalSetup paths and overwrote two earlier diagnostics.
New output was archived under this increment, original bytes were restored and
verified against the pre-task hashes, and final setup writes only this evidence
directory. See [correction](evidence/grading-recovery-2026-10-09/evidence-path-correction.json).
The final254-file preservation check passes; archived evidence is unchanged.

## Measurement limits and rollout risk

Final short normal-grading diagnostics retain15 statements/job. Ten sequential
3-question jobs took91.725ms total (observed109.02jobs/s); a single500-question/
5,000-selection job took149.030ms,148.659ms transaction and1.014ms lock observation.
These tiny synthetic local observations are **not sustainable throughput,
percentiles, a before/after improvement or AWS SLO/cost evidence**. Recovery/
replay query cost, contention, optimal pool, saturation and jobs/USD are unmeasured.

All publishers/consumers must be generation-aware and old tasks drained before
the first replay. Once a nonzero generation exists, rollback must keep
generation-aware images and forward0016; an older image cannot enforce this
contract. Full image/schema/rolling-deployment drill remains DB-12. No native SQS
redrive bypasses DB authorization. JSONB preserves the logical envelope; arbitrary
original whitespace/order is not a contract. If retained delivery diagnostics
were pruned, replay reconstructs the envelope from safe quarantine and uses
original submittedAt for created_at, replay_at for current delivery age.

Still open: Admin permission-aware replay HTTP, result/history/review/privacy
reads, retention maintenance, full tracing/alerting, effective managed SQS/IAM/
KMS/network controls, task crash/visibility/failover/restore/deployment drills,
timed failure recovery, aggregate connection/task budget and performance–cost
curve. No permanently running recovery AWS service was justified or created.

Next API increment: ATT-08 bounded Candidate result/history/review projections,
ownership and explanation policy, with matching HTTP/PG/query/payload evidence.
It is separate from closing this recovery increment.

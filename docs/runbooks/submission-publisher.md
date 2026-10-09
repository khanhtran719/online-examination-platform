# Submission outbox publisher

Started 2026-10-08; local validation completed in the associated delivery report.
This operates Assessment delivery intents, separately from Identity verification
email intents and the future grading consumer/DLQ replay.

## Invariants and placement

`SubmissionPublisher` is a plain Assessment Application use case. Its private
PostgreSQL adapter owns `platform.outbox` claim/ACK SQL. Global
`infrastructure/messaging/sqs` implements the shared queue port; it imports no
business module. The worker calls the existing public Assessment worker factory.
No new business module, Kafka, Redis or AWS resource is added.

The claim statement atomically locks a bounded ready set with SKIP LOCKED, assigns
independent random lease tokens and increments durable attempts. Claim returns
only after autocommit ACK; an ambient UoW is rejected. All claimed slots start
immediately, without a local queue. Broker I/O holds no DB connection/transaction.
ACK/failure mutations lock the row first, then recheck the matching token and DB
clock in a second statement. Checking the clock in a blocked UPDATE alone is
insufficient: an unchanged tuple can retain a pre-wait predicate result.

Send → SQS ACK → fenced DB delivery mark. Crash/lost ACK between steps can duplicate
the same event. Consumers must implement ASYNC-05–07 before accepting production
result correctness. No global/per-attempt broker ordering is promised; v1 emits
one accepted submission per attempt. The stable envelope carries correlation and
causation. Answers, answer keys, candidate identity and credentials are excluded.
The strict publisher validates exact keys, version/type/source, UUIDs, real UTC
timestamps and consistency with the outbox row before sending.

The SQS adapter uses `SendMessage`, one SDK attempt, an abortable whole-call
deadline and an outer deadline that also bounds credential resolution. A response
must contain MessageId and a matching body MD5 before it counts as acknowledgement.
Transport errors become safe classifications, without raw SDK messages. Official
[SendMessage contract](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html),
[SDK v3 examples](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_sqs_code_examples.html)
and [abort handling](https://github.com/aws/aws-sdk-js-v3/blob/main/README.md)
are the transport references. MD5 is a transport checksum, not a security signature.

## Deployment and configuration

1. Administrator runs the updated `infra/database/roles.sql` on the target cluster
   to create `examination_dispatch_worker` NOLOGIN. Migration owner cannot create roles.
2. Stop any legacy delivery writer. Apply forward `0014_submission_dispatch.sql`
   through the separate migration login. Migrations0001–0013 keep their bytes.
3. Create a dedicated login with only membership of `examination_dispatch_worker`.
   API inserts intents; it no longer has delivery metadata UPDATE grants. Worker
   can read outbox/modify delivery fields, but cannot read users, sessions, answers,
   answer keys or change event payload/identity/original timestamps/replay window.
4. Inject verified PostgreSQL TLS settings and a real Standard queue URL/region.
   `.env.dispatch.example` is a local example, not an existing AWS account/queue.
   `npm run db:local` prepares the example login only on explicit invocation;
   this increment did not migrate the long-lived development DB.
5. Build with `npm run build`; run `node dist/workers/outbox/submission.main.js`.
   Task IAM grants only `sqs:SendMessage` on the specific queue ARN. Use ECS task
   credentials, no embedded AWS keys. Default SSE-SQS does not require KMS client
   permissions; a later CMK choice needs explicit KMS permissions and evidence.

Current defaults are hypotheses for measurement: concurrency4, pool2, max waiting4,
5s send timeout,15s lease,1s idle poll±20%,10 tries,24h dispatch age, exponential
retry ceiling30s with50–100% jitter. Configuration caps concurrency8, tries1000,
age7days, send10s and lease120s. Production accepts only regional commercial-AWS
HTTPS Standard queue URLs; local HTTP endpoints must be explicit loopback fixtures
outside production. URL userinfo/query/hash, FIFO and region mismatch are rejected;
SDK configured-endpoint overrides are ignored.

Startup rejects a lease shorter than send timeout + claim statement budget + ACK
pool waves +1s margin. Validate total task-count/pool budget separately before AWS
rollout. A batch has one claim statement and four DB statements per successful
fenced ACK (BEGIN/row lock/UPDATE/COMMIT); one backlog statement runs at most every
30s. The extra lock statement is required by observed lease correctness. Run
EXPLAIN/large-backlog/pool experiments before changing this path or raising capacity.

## Failure, parking and replay

- Timeout/network/throttle/unknown transport failures persist retry eligibility
  using PostgreSQL time. SDK hidden retries are disabled. Other workers/restarts
  respect the same available_at and lease.
- Invalid envelope, unsupported/permanently rejected send, exhausted attempts or
  aged dispatch window parks the intent with a bounded safe code. A crash on the
  last attempt is reclaimed and parked without another unbounded send.
- Database ACK failure leaves the lease intact; expiry recovery may send again.
  A stale/expired worker cannot mark delivered or defer a newer claim.
- Parking does not change attempt status or delete accepted answers. Durable
  submission stays SUBMITTED/EXPIRED pending future grading. SQS DLQ is a separate
  future consumer mechanism; this publisher parking is in PostgreSQL.

For replay: repair dependency/configuration first; verify stable event identity,
parking code and original age through authorized operator diagnostics. Do not edit
the payload to bypass schema validation. If a poison producer bug is involved,
ship a reviewed forward repair before replay. Use the dedicated database operator
login and record operator identity plus reason:

```sh
# Inject DATABASE_OPERATOR_URL, OPERATOR_IDENTITY and OPERATOR_REASON securely.
# event-uuid below is an existing parked event ID, never a new event ID.
node dist/workers/operator/submission-replay.main.js event-uuid
```

The operator-only SECURITY DEFINER function has a fixed search_path and qualified
tables, validates input, updates only parked/undelivered rows and appends audit in
the same transaction. Audit failure rolls back replay. Runtime/worker cannot invoke
it; operator cannot directly UPDATE outbox. Repeated replay of a live/delivered row
fails. It resets attempts/eligibility/lease and a separate `replay_at` dispatch
window while preserving event/body/created_at and true oldest unpublished age.
CLI logging contains only a safe outcome; the DB audit records session_user plus
declared operator, reason, event ID and correlation. This authorizes delivery replay
only; future grading FAILED/DLQ replay remains ASYNC-10.

An outage may exceed bounded retries, so alerts must reach an operator before
repeated parking grows. Automatic unlimited replay is forbidden. API disk/backlog
admission thresholds and broader retention remain pending; durable ACKed intents
must never be silently removed to control backlog.

## Health, shutdown and telemetry

`/live` means process alive; `/ready` becomes healthy after a successful poll and
reflects observed broker failure until a successful delivery. An empty queue does
not prove live SendMessage IAM/connectivity. API readiness is independent of this
asynchronous publisher. Use liveness for process replacement and backlog/retry/age
alarms for dependency failure; restarting workers cannot repair a rejected queue.

SIGTERM/SIGINT stops admission and interrupts idle/backoff sleep. Admitted sends
settle and persist ACK/failure before sampler/server/SDK/pool close. Repeated stop
returns the same drain promise. The CLI force-exits after30s; interrupted unfinished
claims recover by lease expiry. A readiness failure alone never erases an intent.

Every30s emit bounded counters, fixed publish-ACK-duration buckets, pool utilization
and pending/parked/oldestPendingAgeMs. Original pending age includes cooling/leased
rows, excluding delivered/parked. Backlog sampling never overlaps. Failure logs use
safe codes/correlation/event IDs as context, never metric labels. No success log
per job, raw bodies, answers, SDK messages or SQL parameters. Logs use the project
14-day diagnostics policy; CloudWatch cost and instrumentation overhead are unmeasured.

## Reproduction and limitations

Start disposable PG/Mailpit according to the integration runbook, set
`TEST_DATABASE_ADMIN_URL`, build, then run `npm run test:integration`. New tests use
disposable DBs/restricted logins and a local HTTP fixture with the real AWS SDK.
They do not use AWS credentials/accounts or prove SQS service durability, IAM, VPC
routing, DLQ/redrive, ECS scaling, latency SLO, sustainable jobs/sec or jobs/USD.
The no-network queue diagnostic isolates local PG/relay overhead only. Production
acceptance stays open until consumer atomicity, load/failure/AWS gates pass.

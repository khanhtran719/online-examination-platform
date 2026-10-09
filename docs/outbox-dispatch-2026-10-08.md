# Assessment outbox dispatch — local delivery

Started2026-10-08; completed2026-10-09. **ASYNC-02–04 accepted locally.** Production
acceptance stays NOT ACCEPTED. [Runbook](runbooks/submission-publisher.md),
[evidence](evidence/outbox-dispatch-2026-10-08/README.md).

## Delivered scope

- [x] Atomic bounded SKIP LOCKED claim, independent lease tokens, DB-clock
  eligibility and expired-lease recovery across workers/recomposition.
- [x] Plain Assessment publisher + shared queue port + global AWS SDK SQS adapter.
  Exact validated stable envelope; send outside DB transaction; one SDK attempt;
  bounded whole-call timeout; mark after valid broker ACK only.
- [x] PostgreSQL retry schedule with exponential jitter, attempt/age limits,
  permanent/poison parking and recovery of a crashed final attempt.
- [x] Dedicated dispatch role, forward0014, API delivery UPDATE revocation and
  operator-only atomic replay/audit with original identity/body/created_at retained.
- [x] Separate worker/config/CLI, `/live`/`/ready`, bounded backlog/metrics sampling,
  pool/lease budget check, repeated-stop drain and compiled SIGTERM smoke.
- [x] Regression tests, source/evidence preservation and disposable cleanup.

No scoring, inbox, result/ranking/statistics write, consumer ACK/DLQ, Terraform,
AWS deployment or capacity/cost acceptance is included. ASYNC-11 and ASYNC-09 have
publisher subsets only; their wider consumer gates remain unchecked.

## Architecture and correctness review

Assessment retains business ownership of submission events; its Application has
no Nest, pg, SDK, HTTP or filesystem dependency. Infrastructure implements its
dispatch port and shared transport port. The worker imports only the existing
public Assessment factory. No extra business module/framework or broker is added.
The technical database executor now rejects relay claim inside an ambient UoW.
Existing submit/expiry transactions still persist acceptance plus intent atomically.

The first ACK implementation exposed a real PostgreSQL issue: a lease predicate
evaluated before waiting for an unchanged tuple lock can remain true after the
lease expires. Parent RED probes and a separately authored reproduction both
failed; the independent controls for token rotation passed. ACK/failure now use
BEGIN → lock row → evaluate token/DB time in UPDATE → COMMIT. New independent
observed-lock-wait tests pass for both operations. No physical commit timestamp
or universal performance improvement is inferred.

Publication is at least once: a crash after SQS ACK and before the delivery mark
re-emits the same event after lease expiry. A live/old token cannot overwrite a
new claim. Database ACK failure does not get mistaken for a failed broker send;
the claim remains recoverable. All admitted parallel sends settle before a batch
error propagates or shutdown closes the pool. Stable IDs support the future inbox;
consumer correctness is not yet established.

Replay runs under a dedicated database operator authority, preserving source
identity/body/original time. Its SECURITY DEFINER function has fixed search_path,
qualified tables, bounded inputs and only parked/undelivered eligibility. Audit
failure rolls back replay. `replay_at` starts a new bounded dispatch window while
oldest unpublished age retains original created_at. This cannot replay grading
FAILED/DLQ states. Malformed producer data needs a reviewed repair, not payload
editing through this CLI.

## Validation and measurement

Fresh checks: **280 root tests** (144 API/23 suites +40 tooling +96 Web),
**173 integration tests/11 suites/0 skipped**, lint/architecture guards,
typecheck, build,46 OpenAPI operations/425 examples and production dependency
audit PASS (0 runtime advisories returned by the registry).

New tests include13 publisher +11 config +2 supervisor unit cases;19 full-schema
PG/worker cases +6 actual SDK/local HTTP cases +4 independently authored PG
fencing cases. Full historical integration still passes after forward0014;
0001–0013 source bytes and older expiry evidence are checked separately.
The fixture's initial invalid attempt_limit/revision and double HTTP-ACK cleanup
were corrected; failed logs are retained and are not represented as product
regression acceptance. Final integration exits cleanly without open handles.
After final SQL layout changes, the29 publisher integration cases were rerun and
passed. An intervening Docker-offline attempt is retained as an environment
failure. Disposable DB/login/connection counts were then verified at0, and the
owned PostgreSQL/Mailpit fixtures stopped with volumes retained.

Local diagnostic:32 intents, concurrency4, pool2, no-network queue implementation.
Observed finite-run duration81.36ms; eight batch cycles p50=8.97ms,
p95/p99=12.05ms. ACK transactions p50=5.05ms/p95=9.75ms/p99=9.86ms.
137 observed statements:8 claims,32 each BEGIN/lock/UPDATE/COMMIT,1 backlog.
Nearest-rank percentiles from small samples describe this run only. Source/raw
and [derived summary](evidence/outbox-dispatch-2026-10-08/diagnostic-summary.json)
retain exact numbers; the first full run is also preserved for transparency.
This is neither HTTP/SQS latency nor sustainable jobs/sec. CPU/job, memory/job,
AWS jobs/USD, optimal pool/concurrency and production saturation are unmeasured.

## Operational impact and next work

Bootstrap the new NOLOGIN role before applying0014. Inject a distinct worker login,
verified DB TLS, a real regional Standard queue URL and a queue-specific SendMessage
task policy. No AWS account/profile/region/domain was selected, no queue was created,
and the long-lived development DB was not migrated. The example region is only
an example. PostgreSQL/Mailpit owned test services are stopped after cleanup, with
volumes retained. No staging/commit/deploy or unrelated Web edits were performed.

Next increment: ASYNC-05–07 consumer validation + transactional inbox + deterministic
grading/result/projections before DeleteMessage, followed by crash/redelivery and
scoring-duration evidence. Consumer lease/visibility/DLQ and live AWS capacity/cost
gates remain open. API outbox backlog admission/retention, alert routing, IAM/VPC
proof and full distributed traces require later operational delivery.

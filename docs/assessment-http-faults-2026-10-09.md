# Assessment HTTP fault matrix —2026-10-09

Status: ATT-10/11 accepted locally; focused26/26 and full268/268 integration PASS,
16 suites/0 skipped;375 root PASS. Roadmap81/216 checked,135 pending.
Scope: missing local ATT-10/11 HTTP fault matrix for Candidate start/save/submit.
Existing Assessment publication/deadline/quota/answer-version/save-submit races,
expiry worker faults and retention remain covered by their accepted suites.
[Recovery runbook](runbooks/assessment-http-recovery.md),
[raw evidence](evidence/assessment-http-faults-2026-10-09/README.md).

## What changed

Added one real integration suite at
`apps/api/tests/integration/assessment-http-faults.spec.ts`. It uses compiled
`dist/main.js`, genuine TCP HTTP, current Identity session/CSRF/RBAC, public
Catalog publication and all17 migrations under a restricted API login. Verified
user fixtures are seeded locally; verification delivery/browser HTTPS are
separately accepted scopes. PostgreSQL on55435 is disposable;55432 is rejected.
No runtime hook, production SQL/migration/grant, dependency, API schema, queue
event, AWS resource or business-layer abstraction was added.

The late pre-COMMIT gate is a receipt BEFORE INSERT trigger only in the test DB.
Assessment has already executed its business writes (including submit outbox)
before this gate. An independent administrator observes the exact restricted
backend/advisory blocker or PgSleep; faults are not timed against a guessed sleep.
Independent reads then prove atomicity and durable receipt/state reconciliation.

## Matrix

| Fault/control | Start | Save | Submit | Required outcome |
| --- | --- | --- | --- | --- |
| Drop all downstream ACK bytes after upstream success; SIGKILL/restart | PASS | PASS | PASS | Original body/status replay; one effect; resource key-scope/current permission/revocation enforced |
| SIGKILL after business writes, before receipt/COMMIT | PASS | PASS | PASS | All business writes/receipt/outbox roll back; same key succeeds after restart |
| Terminate actual DB backend at late gate | PASS | PASS | PASS | Safe503; no partial durable effect; pool recovers and same key succeeds |
| Actual lock timeout | PASS | PASS | PASS | Bounded503, complete rollback, same-key retry succeeds |
| Actual statement timeout in PgSleep | PASS | PASS | PASS | Bounded503, complete rollback, same-key retry succeeds |
| Client socket times out while transaction is held; release/commit/restart | PASS | PASS | PASS | Disconnected write may commit; original receipt resolves ambiguity without duplication |
| Two checked-out API clients blocked; waiting queue exhausted | PASS | PASS | PASS | Acquire timeout/back-pressure503; target writes unaccepted; same-key recovery |
| Same key through two independent API processes | PASS | PASS | PASS | Exactly one writer, one replay, same body/status/effect |
| Two tabs/different keys/expectedVersion; old receipt after newer answer | n/a | PASS | n/a | One200/one409, newer version survives replay; changed payload409 |
| SIGTERM on an admitted submit, then restart | n/a | n/a | PASS |202 and clean drain; one durable event; original receipt replays |

26 cases: seven fault cases ×three writes, three cross-process duplicate cases,
one stale-tab/old-receipt case and one SIGTERM case. State checks include attempt
count/revision/deadline, answers/selections/version, event/payload/submission/
causation identity and durable receipt. Resume/answer reads use the actual HTTP
boundary and retain no-store/redaction. Submit202 is acceptance, not scoring.

## Review and validation

The sandbox-only attempt failed with connect EPERM; no application fault was
observed in that run. The first network run had13 PASS/10 failures from two
incorrect fixture expectations: eventId was treated as submissionId and revoked
family-bound CSRF was expected401 instead of403. A subsequent run had16 PASS/7
failures because the new start read control expected a synthetic empty answer;
the contract returns an empty list until the first saved answer. Correcting
these assertions and adding pool controls gave26/26 PASS. All original logs
remain. These fixture failures are not runtime defect reproductions; no runtime
fix or performance improvement is claimed.

Root375 cases (238 API/33 suites,41 tooling,96 Web), lint/typecheck/build and
contracts46operations/425examples PASS. Full integration268/268/16 suites,
0 skipped PASS, including the strengthened log-redaction/partial-setup cleanup
checks. Reviewed
R-58/59 boundaries remain unchanged: plain write services and Domain policies,
short UoW/current revalidation/owned locks, private pg adapters, transactional
outbox, safe envelope and no request-time network scoring. SQL fixture layout
follows conventions102.1.17 source/built SQL assets match and364 protected files
(17 applied migrations +347 historical evidence) are byte-identical. External
read-only PostgreSQL cleanup confirms0 temporary databases/logins/other-database
connections; suite cleanup confirms0 child processes/holders and removed own keys.
Filesystem inspection finds0 temporary key directories. Only test PostgreSQL55435
and root Mailpit are stopped after this run; volumes and development55432 remain.
No runtime change means no before/after optimization claim or new ADR is needed.

## Measurement limits

matrix-local.json and matrix-full.json contain focused/full local samples.
lock/statement/pool durations
measure from sending the affected HTTP call until its unavailable response;
lost-ACK/pre-COMMIT-kill durations include preparation and restart/control checks.
Other durations are null because they were not measured. These are single fault
samples, not percentile distributions, sustainable capacity, recovery SLO or AWS
cost. Timeout budgets are intentionally local test settings, not a selected
production pool configuration.

The full run observed lock-timeout acknowledgements319.33–327.54ms with a300ms
lock budget, statement-timeout919.22–932.88ms with a900ms statement budget, and
pool/back-pressure253.21–258.07ms with a250ms acquire budget. Each range has
three samples, one per operation, and includes HTTP/auth overhead. It validates
bounded local failures; it does not describe healthy endpoint latency or prove
production SLOs. No tuning recommendation follows from these samples.

AWS ALB/WAF/TLS/RDS/network failure, RDS durability/failover/PITR, old/new container
rollout, actual load/scaling/recovery time and performance/cost remain open in the
[production ledger](production-acceptance.md). No deploy, commit or staging.
The next increment is REP-04 public leaderboard/privacy read acceptance; broader
Reporting/Admin and privacy restore/deletion-ledger work retain their own gates.

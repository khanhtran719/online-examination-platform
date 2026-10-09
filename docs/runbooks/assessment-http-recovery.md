# Assessment HTTP timeout, retry and API restart

Scope: Candidate start/save/submit and local ATT-10/11 proof. PostgreSQL remains
the source of truth. [Fault matrix](../assessment-http-faults-2026-10-09.md) and
[raw evidence](../evidence/assessment-http-faults-2026-10-09/README.md) record the
tested environment. AWS ALB/network/RDS failover, old/new container compatibility,
PITR and timed recovery under production load remain separate acceptance gates.

## Client recovery

1. Generate a fresh UUIDv7 for a new logical operation. Keep the exact key,
   resource and canonical payload until its outcome is resolved. A transport
   timeout/reset does not prove rollback; the server may still commit after the
   client disconnects.
2. Retry the same operation with the same key and payload after a transient503
   or network failure. Use bounded retries with jitter; avoid immediate unbounded
   loops during pool/DB saturation. Keep the UUIDv7 first-use window in
   [ADR-003](../adr/003-idempotency-retention.md); do not turn an unresolved write
   into a new operation merely by replacing its key.
3. A replay preserves the original201/200/202 and body, including accepted time,
   deadline/version/submission identity. `Idempotency-Replayed: true` identifies
   replay. It is an acknowledgement of that write; GET resume/status/answers
   provides current state. An old save receipt cannot undo a newer answer.
4. A409 from an optimistic-version conflict requires reading current answers
   and reconciling the tab. Reuse of a key for another resource/payload also409s.
   Generate a new key only for a deliberately new operation after reconciliation.
5. Current session, permission, Origin and CSRF still apply to replay. Anonymous
   or revoked family-bound CSRF can403; a valid-CSRF request without a current
   principal can401. Reauthentication/refresh follows the Identity contract;
   possession of an old receipt key grants no access.
6. A202 submit acknowledges durable acceptance/outbox intent. Poll the status
   using `Retry-After`/bounded backoff. Do not retry submit with new keys to force
   scoring. No inline scoring, Redis lock or queue send belongs in that request.

## Operator handling

On elevated503s, correlate server-issued request IDs with safe route/status logs
and pool/DB/lock telemetry. Inspect actual waiting connections, statement/lock
timeouts and database availability before increasing task count/pool size. More
API tasks can worsen an already saturated PostgreSQL connection budget.

SIGTERM first stops new admission and drains admitted HTTP/database work. The
compiled local test holds a submit after business writes, signals SIGTERM,
releases the fixture lock, observes202 and clean exit, then replays after restart.
The application hard shutdown deadline is30seconds; deployment drain/ALB/task
stop budgets need their own AWS check. SIGKILL offers no drain: PostgreSQL must
roll back incomplete work, and a durable committed receipt must survive restart.

Never delete receipts or change attempt/submission/outbox identity to recover
a timeout. For completed payload/receipt retention use the owning
[maintenance runbook](assessment-retention.md); for failed grading use
[recovery generations](grading-recovery.md).

## Reproduce the local matrix

Build with `npm run build`. Start only the disposable PostgreSQL service from
`infra/identity-https/compose.yaml` on55435. Supply TEST_DATABASE_ADMIN_URL via
a temporary local environment/global setup; it must never be an API credential.
Run `npm run test:integration -- --runTestsByPath
apps/api/tests/integration/assessment-http-faults.spec.ts` with that environment.
The suite explicitly rejects55432/nonloopback administrators. It creates a random
database and dedicated owner/runtime logins, applies all17 migrations, creates
ephemeral0600 signing/CSRF/email/rate files and starts the actual compiled API.
Users are verified fixture rows; login/session/CSRF/Catalog publish and all
Assessment operations execute through genuine HTTP. No SMTP send, AWS call or
browser cookie/TLS claim is made by this suite.

The test-only receipt trigger lives solely in the disposable database. Its
target is one generated UUIDv7; pg_stat_activity/pg_blocking_pids prove the late
transaction gate before faults. No production trigger, feature flag, backdoor or
administrator credential is shipped to runtime. Cleanup waits for connections,
drops only its database/logins and removes its own key directory; no DROP FORCE.
An optional TEST_ASSESSMENT_HTTP_EVIDENCE path writes sanitized fault labels and
local elapsed samples. Never route that path to an accepted historical artifact.

For the full suite also start the root Compose Mailpit service, use a fresh
evidence directory and unset other diagnostic output variables. Stop only the
services started for this run and preserve their volumes. Do not migrate or
stop the long-lived development database.

# Identity operations

2026-10-06. Local API/email-worker/operator implemented; AWS drills pending. [Review](../phase-04-review.md) and [acceptance](../production-acceptance.md) record evidence.

## Local setup

Follow [README](../../README.md): Node24, identity:keys:local once, PostgreSQL+Mailpit, db:local, db:migrate:local, build, separate start:local/worker:local. SMTP11025/UI18025 and PG55432 bind localhost. smoke:identity:local starts actual main/worker, checks live/ready, sends SIGTERM and cleans children. Tests/benchmark use disposable databases/roles.

Worker config excludes JWT/CSRF files and uses mail DB role. Operator config requires operator identity/reason. Never load API example config into worker or local examples into production. Local HTTP tests use manual cookie jar; browser TLS/landing remain pending. Do not relax Secure cookies to bypass that gate.

## Admin bootstrap/grants

Use an existing enabled verified account UUID and set OPERATOR_IDENTITY/OPERATOR_REASON in the authorized environment. Production operator role must be attributed/short-lived. Actual compiled CLI:

```sh
node --env-file=.env.operator.example dist/operator-admin.js bootstrap USER_UUID
node --env-file=.env.operator.example dist/operator-admin.js grant USER_UUID
node --env-file=.env.operator.example dist/operator-admin.js revoke USER_UUID
```

Replace USER_UUID; no default admin/password. Bootstrap globally once, including after revocation. DB function grants/audits with session_user/reason in one transaction. API cannot execute or DML assignments. CLI prints safe completed/failed only. Current permissions take effect on next request; no cache flush.

## Normal JWT rotation

1. Generate new P-256 pair and unique kid outside source/image; local generator intentionally refuses overwrites.
2. Preload new public key on every API, retaining old public key. Validate pair/curve/issuer/kid and rollout before switching.
3. Switch active private signer/kid through secret-managed rolling deployment; retire old private access. No worker JWT key or per-request remote secret/JWKS/signing call.
4. Record final issuance/latest expiry of old kid. Keep old public key until actual latest expiry +≤30s crypto tolerance; refresh lifetime can require7days after last issuance.
5. Verify old live refresh issues new kid, new credentials work, unknown/removed kid fails. Remove old public key after overlap only.

Local overlap/removal tests pass; mixed ECS versions/secret rollout/loss recovery drills remain pending.

## Compromised signing key

Stop/replace compromised signers; operator-revoke affected families and deny/remove kid on every serving API, then verify propagation and force affected login. Family revoke alone cannot prevent a still-deployed compromised signer issuing more credentials; no compromised-key overlap.

Parameterized operator-only SQL (bind parameters through an authorized client, no literal secrets in shell):

```sql
SELECT identity.operator_revoke_key($1, $2, $3, $4);
-- kid, operator identity, reason, correlation UUID; returns family count
```

Function/audit/permissions/subsequent rejection have real-PG tests; AWS rollout time unmeasured. No CLI subcommand for this function: operator-admin.js only bootstrap/grant/revoke.

## Delivery outage and replay

202 means committed intent, not inbox. Timeout5s, lease30s, concurrency2/pool4 local; jitter1..60s,≤10 tries, never extend30min challenge. SDK maxAttempts1; worker owns retries. Stale lease cannot acknowledge another worker's job; acceptance timeout can send duplicate same link. Cleanup parks expired final-attempt leases.

Investigate provider health/authorization/quota/permanent code without logging recipient/token/decrypted URL. Restore provider first, then operator replay only parked/live/pending work:

```sql
SELECT identity.operator_replay_email($1, $2, $3, $4);
-- parked job UUID, operator identity, reason, correlation UUID
```

Replay keeps challenge/link/expiry and appends audit. Never reset delivered/cancelled/expired/verified work. Expired links need normal candidate resend. In-flight mail may arrive after activation but cannot activate again. Park/replay/fence/backoff/expiry tested locally; production alerts/UI pending.

## Retention and restore

Worker maintenance every60s, batches≤500: terminal ciphertext erased, terminal hash after24h, email metadata after7days, stale pending account7days anonymized/disabled with audit. User-before-challenge locks. Backup expiry is separate.

Before reopening restored DB: cancel pre-restore challenges/intents and erase material, revoke restored session families, reconcile independent privacy/deletion ledger, inspect pending/parked jobs and audit attribution. These are required steps, **not an executed restore test or complete restore tool**. RPO/RTO/PITR/backup gates remain open.

## Live SES rollout — pending

- Select account/region/verified sender and actual sender restrictions. Domain unavailable; initial verified email candidate still needs account/sender approval and deliverability checks.
- Establish identity/access/quota/configuration set, least-privilege role and private-network reachability. Record NAT/endpoints/network cost before adding resources.
- Implement bounded bounce/complaint ingestion, durable suppression-before-send, abuse policy and oldest-intent/backlog/park/provider/retention alarms. SendEmail adapter alone does not implement these operations.
- Run real delivery, throttle/permanent failure, outage/backlog/expiry/recovery, complaint/suppression and key rollout drills. Verify no token/recipient logs or scanner activation.
- Measure jobs/sec/task, age/provider limits, cost/hour/network/telemetry/TCO before worker sizing/Spot decisions.

No AWS deploy, deliverability/quotas, production security/recovery time or cost saving measured. Current workflow requires no additional email queue/cache.

# Public Candidate leaderboard

Local REP-04 subset implemented2026-10-09. [ADR-012](../adr/012-public-ranking-projection.md)
records boundary, ranking, key and cursor decisions. This does not accept Admin
reporting, AWS load/SLO, privacy deletion/independent ledger or restore readiness.

## Client contract

GET `/v1/exams/:examId/versions/:versionId/leaderboard` with the current authenticated
session and `leaderboard.read`. No anonymous access or Admin bypass of the frozen
leaderboardEnabled policy. Requests after committed opt-out/disable/deletion-request
changes suppress the candidate; unverified users are also hidden. Changing a draft
or unpublishing does not modify an older version's ranking visibility.

Use pageSize20 by default,1–100 maximum. Follow metadata.next with the same actor,
exam/version and pageSize until null. Keep cursors opaque; never parse, log, share
or store them as authorization. Rank and pseudonym are presentation fields, not
user identities. Do not expose a profile link or infer a candidate's email/name.
Every response uses no-store; do not persist a shared leaderboard cache.

Cursors expire15 minutes from the original first page; continuations do not renew
expiry. New completions/improvements beyond the first watermark appear on refresh;
opt-out can remove rows/ranks during traversal. It is not a total or snapshot.
Retention removal/downgrade invalidates existing version cursors with400, preventing
a candidate from reappearing below the old cursor. Restart pagination explicitly
once; persistent400 should stop and display a retry action, not loop indefinitely.

| Response | Client/operator action |
| --- | --- |
| 200 empty/page | Valid; follow next only when present |
| 400 | Validate filters; restart an expired/invalidated traversal |
| 401 | Existing refresh/login flow; do not reuse another actor's cursor |
| 403 | Current permission or frozen policy denies access |
| 404 | Exact exam/version is absent or mismatched |
| 429 | Respect existing rate policy; back off, avoid rapid polling |
| 500/503 | Correlation ID and dependency/pool diagnostics; bounded retry |

## Key provision and rotation

Provision `LEADERBOARD_KEY_FILE`: exactly32 random bytes encoded base64url,0600,
outside Git/image/logs, identical on all API tasks. Existing local installs add
only the missing file; do not rerun the whole exclusive Identity generator or
overwrite JWT/email/CSRF/rate keys. For local development in the repository:

```sh
node -e 'const fs=require("node:fs"), crypto=require("node:crypto"); fs.writeFileSync(".local/identity/leaderboard.key", crypto.randomBytes(32).toString("base64url"), {mode:0o600,flag:"wx"})'
```

`.env.example` points at that file. New installs generate it with the existing
`npm run identity:keys:local`. Production secret provisioning belongs to the
later Secrets Manager/deployment workflow. File absence/invalid mode/size/key
fails API startup. Mail-worker validation rejects receiving this key; no worker
needs pseudonym/cursor authority. Existing JWT key pairs still sign access/refresh.

Preserve the leaderboard key across ordinary deployments/auth rotations. Deliberate
rotation resets pseudonyms and invalidates all cursors; coordinate all API tasks
and force client refresh to avoid mixed aliases/repeated400s during rollout. No
overlap/keyring is implemented for this optional presentation identity. Compromise
requires revoking access to the old key and replacing all serving tasks; do not
promise unlinkability for already exposed aliases. Do not retrieve secrets per
request or put their values in metrics/evidence.

## Deploy, verify and rollback

1. Use the migration role/forward runner to apply0018 after0017; preserve checksums.
2. Provision the stable API-only key and deploy API with readiness/drain procedures.
3. Check authenticated enabled/empty/disabled pages; default/max page, opt-out and
   cursor refresh. Check anonymous401 and permission403. Observe3 SQL calls including
   authentication/admission, no key/answer/PII exposure and no-store.
4. Keep existing grader/retention images compatible with purged identities. Normal
   best-entry improvement should not create an epoch; destructive retention should.
5. If rollback is needed, disable/revert the route through an API image compatible
   with0017/0018. Keep triggers/epoch data and narrower ownership grants; no down SQL.

The local actual compiled API regression/browser auth checks do not constitute a
live rolling-deployment test. Mixed image/secret rollout and AWS IAM/TLS remain open.

## Diagnosis and restore

Inspect exact natural plans/pool wait before resizing RDS. `leaderboard_order` is
the existing version/score/submit/attempt index; planner choice is data-dependent.
Live prefix rank counting and joins can scan a large version. Output is≤101 rows,
but that is not a scan/CPU bound. Measure deep pages, varied visibility/score
distributions and concurrent bursts in k6; current sequential diagnostics do not
prove the p95<300ms/p99<600ms targets or saturation/headroom/optimal pool.

Epoch changes contend only on destructive per-version work; normal grading does
not acquire the epoch row. A timeout/error rolls back the source effect, so use
existing maintenance diagnostics/retry policy instead of direct table repair.
Do not grant runtime epoch UPDATE or trigger EXECUTE to bypass invalid cursors.

Restore remains closed by the privacy contract: reconcile the independent durable
deletion/opt-out ledger, revoke old sessions, then invalidate pre-restore cursors
through an authorized epoch/key procedure before opening ranking. Local fresh-read
tests do not implement or accept that ledger. If reconciliation is uncertain, keep
leaderboards closed. Do not replay restored consent or enable ranking merely
because a SQL health check passes.

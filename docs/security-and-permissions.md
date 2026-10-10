# Security, permissions, import and retention v1

Status: requirements adopted/amended 2026-10-06 by [ADR-005](adr/005-email-verification-and-signed-tokens.md). Identity core controls have [local runtime evidence](phase-04-review.md); browser HTTPS, live SES and production controls remain pending. Covers SPEC-09/auth transport SPEC-10. [Product rules](product-specification.md), [API](contracts/openapi.yaml) and architecture/R-33–47 remain authoritative; magic-link/GitHub login is later work.

## 1. Permissions and ownership

Role maps to permissions centrally; application receives a principal and uses permissions/object ownership, never scattered role-name comparisons. Admin accounts may also hold Candidate permissions; Admin alone does not permit impersonating another candidate's write session.

| Permission | Candidate | Admin baseline | Object / data scope |
| --- | --- | --- | --- |
| `identity.self` | yes | yes | Own profile/session/leaderboard opt-in only; no body role/userId override. |
| `catalog.read` | yes | yes | Published metadata; no keys/question bank. |
| `assessment.take` | yes | separately assigned | Own start/resume/questions/answer/submit/status/history. |
| `assessment.result.read` | yes | separately assigned | Own result/review with frozen release gate. |
| `leaderboard.read` | yes | yes | Frozen enabled version, current session; pseudonyms only. |
| `catalog.manage` | no | yes | Draft CRUD, sections, membership, archive/publish; expected revision + audit. |
| `catalog.keys.read` | no | yes | Bank/admin questions/keys/explanations; audit accesses, never candidate DTO. |
| `catalog.import` | no | yes | Bounded question imports and owned import reports; audited. |
| `reporting.read` | no | yes | Exam-scoped active attempt list across frozen versions; submissions/aggregate-section scores; exact-version best/latest candidate pairs and question/option counts; business cohort/global backlog snapshot; restricted admin DTOs. |
| `assessment.review.admin` | no | yes | Explicit admin submission review including keys; read-access audit, no candidate write impersonation. |
| `assessment.replay` | no | yes | Failed submission replay only, required reason, stable identity and audit. |
| `audit.read` | no | yes | Paginated redacted audit records; no secrets/answers. |
| `system.metrics.read` | no | yes | Aggregated service/business telemetry; no unrestricted CloudWatch console/SQL/SQS access. |
| IAM/operator privilege | no | no | Migrations/secrets/admin provisioning/restore via separate least-privilege operator role, not app role. |

All own-object APIs return 404 Not found for nonexistent/foreign IDs, after authentication. Lack of an action permission returns 403 Permission denied. Admin routes require their declared permission and audited sensitive access. Do not let supplied `actorId`, cursor, exam version, import report ID or resource path bypass authorization. State/deadline invariants apply even if principal is Admin.

REP-04 Admin best/latest requires current locked Identity revalidation and safe
reporting.candidate-results.read audit with EXAM_VERSION/resourceId=exact version.
Only opaque candidate/version/attempt IDs, status/times and bounded scores appear;
pending/FAILED scores are null. Caller verification/enabled/session/permission
remain current; public ranking opt-in does not grant or deny Admin scope. Opaque
15min candidate-order cursors derive a distinct purpose key from the CSRF root,
bind actor/exam/version/page size/order and keep initial expiry. No cursor,
credential or score payload in logs or metric labels. See
[runbook](runbooks/admin-candidate-results.md). Independent privacy deletion/
restore, access and audit retention acceptance remain open.

REP-03 question statistics uses current locked Identity revalidation and mandatory
`reporting.question-statistics.read` audit scoped to the exact `EXAM_VERSION` UUID.
The primary projection and audit commit before response; audit or invalid counter
failure releases no data. Only frozen question/option IDs and aggregate counts
appear; no candidate PII, prompts, choices text, keys or explanations. Opaque15min
cursors derive their own purpose key from the existing CSRF root and bind actor,
exam, version, page size and order with fixed expiry. All replicas share that root;
root rotation invalidates navigation. No cursor/credential in logs or metric labels.
See the [runbook](runbooks/admin-question-statistics.md). Account deletion,
independent privacy ledger/restore and audit retention remain separate gates.

REP-01 uses current authentication/read admission plus transactional Identity
revalidation and safe `reporting.active-candidates.read` audit (EXAM, actor,
resource/correlation IDs, SUCCESS, empty changed fields). Audit failure is closed;
no response page before COMMIT. Query sources expose opaque candidate/attempt IDs
and lifecycle times only, including disabled candidates' still-live attempts.
v1 Admin exam scope is global; no public Candidate access or query actor override.
The encrypted60s cursor derives a distinct purpose key from the existing CSRF root,
never the public leaderboard alias key. Root rotation invalidates navigation;
restart first page. All replicas must share the root. No raw cursor/token/query
or IDs in metric labels. [Runbook](runbooks/admin-monitor.md) explains polling and
failure behavior; audit retention/browsing/restore production acceptance remains open.

Public leaderboard [ADR-012](adr/012-public-ranking-projection.md) exposes only
per-version pseudonyms/rank/earned/possible/completedAt. Fresh primary visibility
requires enabled verified opted-in users without deletion request. The API-only
stable leaderboard key is separate from JWT/CSRF/mail keys; AEAD cursors conceal
actor/order identities and bind version/filter/page-size/watermark/epoch/expiry.
Rotation deliberately resets aliases/cursors. No anonymous access, cached consent
or Admin bypass of frozen ranking policy. Fresh read checks do not accept the
independent privacy ledger/restore/account-deletion requirements below.

## 2. Registration, sessions and browser transport

Register accepts email (ASCII, trim + lowercase full address, max254), displayName (1–80 plain characters), password (15–128 Unicode characters; do not trim password). Email is the only login identifier; no alternate username namespace. Full-address case folding is this product's explicit comparison policy; do not strip plus-tags/dots or infer provider aliases. Case-sensitive local-part addresses are not separate identities in v1. New accounts receive Candidate permissions only and leaderboardOptIn=false, with `emailVerifiedAt=null`. Return202 `{accepted:true}` for new/existing email; registration never overwrites existing credentials/profile. Login invalid/disabled/nonexistent/**unverified** user returns the same401 Unauthenticated, with no session. Existing users are not implicitly verified by migration. Enumeration timing tests and bounded hashing concurrency are required, not implied by generic text.

Password storage uses Argon2id at least19MiB memory /2 iterations /parallelism1, unique salt; benchmark hash duration/memory and raise settings within login SLO/capacity, never lower baseline silently. See [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). No password/token in logs/receipts/audit. Password recovery and email change remain separate future contracts; PUT me cannot change them.

### 2.1 Email verification and delivery

Verification link uses a cryptographically random256-bit token encoded as43 base64url characters, SHA-256 hashed for lookup, bound to the pending user/current normalized email and `VERIFY_EMAIL` purpose. TTL30min; DB time after lock acquisition determines expiry. Register atomically persists pending account/Candidate assignment + challenge + encrypted email intent. Email delivery is asynchronous and 202 acknowledges intent only. Verification is required before account use, consistent with [OWASP email verification guidance](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html).

Link opens an inert same-origin `/verify-email#token=...` page. Fragment avoids token in edge/server URL query logs; no-referrer, no third-party scripts/analytics, no caching, scrub fragment after reading and keep token only in memory. User explicitly confirms via POST `/v1/auth/email-verification/confirm` with anonymous CSRF, token and the **final password chosen by the email owner**. Do not automatically POST on page load. Email scanner GET cannot activate. Choosing the final password prevents an attacker-pre-registered credential surviving activation; it replaces only a pending password, never a verified password. No automatic login or auth cookies on confirmation.

Confirmation locks user then challenge, rechecks enabled/purpose/email/time, and atomically consumes challenge, sets verifiedAt/final password/credential version, cancels other challenges/email intents and revokes any unexpected existing sessions. First successful consumption chooses the password. A retry of that consumed challenge within its original expiry confirms `{verified:true}` without applying another password; invalid/expired/cancelled challenges return400 Invalid request. Stored consumed hash is not a login credential. UI proceeds to ordinary email/password login; it cannot assume a retried POST changed credentials.

POST `/v1/auth/email-verification/request` accepts only email and returns generic202 for pending/absent/disabled/verified accounts. Apply60s minimum resend gap and initially≤5 mail intents/email/hour; account-based suppression still returns202, while existence-independent IP/admission limits can return429. Reuse the live challenge/link on resend; unauthenticated resend must not invalidate a delivered link. New challenge only when no usable one remains. Serialize resend/activation; bound pending work and queue age. Duplicate requests coalesce current delivery sequence, no unlimited mail fanout. Rate limits must be tested for shared NAT and enumeration.

Identity owns a PostgreSQL email outbox separate from the attempt-specific platform outbox. Worker claims a bounded batch with lease/fencing, commits before SES/SMTP I/O and marks acceptance only for its matching lease. Encrypt retryable token material using maintained JWE (`dir`/`A256GCM`) and a separate injected random 256-bit email key; authenticate/check challenge/user/purpose/expiry context on decrypt. Only challenge lookup hash and encrypted material are durable; never plaintext token/URL in DB receipts, SQS, logs or audit. Retain ciphertext for bounded resend/retry until consume/expiry, then erase. Skip known cancelled/used/expired work at claim and immediately before send; activation/expiry can race an already in-flight send, so a mail may arrive afterwards but its link cannot reactivate or extend validity. Timeout after provider acceptance can cause duplicate mail containing the same single-use link; do not promise exactly-once email or inbox delivery.

Initial delivery policy: external timeout5s, lease30s, bounded concurrency within worker pool, retry jittered1..60s at most10 attempts and never past challenge expiry; permanent failures park with operator visibility. Retries retain stable challenge/delivery identity. Do not hold a DB transaction during sends, blindly requeue used links, log decrypted material or prolong expiry to drain backlog. Runbook covers bounded replay, sender quotas, suppression, bounce/complaint handling and abuse alerts. Local integration uses loopback mail capture and no real recipients.

SES is the production adapter candidate with an explicit email operational requirement; private-network reachability, sender verification, sandbox production access, IAM send scope and cost ledger remain AWS work. No domain is currently owned; verified sender **email address** can support initial SES tests, subject to [SES identity/sandbox restrictions](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html). Candidate verification is distinct from SES sender/recipient verification. API readiness does not depend on synchronous provider availability; durable intent backlog/expiry needs alerting and admission controls.

### 2.2 Signed access/refresh and key lifecycle

Baseline browser API and static app share one HTTPS origin (CloudFront routing); origin/TLS AWS implementation remains pending. Access and refresh are compact signed JWTs, **ES256/P-256**, issued with an environment-specific active private/public pair through a crypto port. Private signs, public verifies; signature does not encrypt payload. No email/password/answers/authoritative role list in claims, no localStorage/sessionStorage token. Cookie names `__Host-access`, `__Host-refresh`, both Secure, HttpOnly, SameSite=Lax, Path=/, no Domain. JSON Session contains only IDs/expiry metadata. Access TTL5min; refresh idle7days clipped to family absolute30days. These are credential validity, not attempt duration. Signing CPU/latency and token bytes have a [local diagnostic](../experiments/identity-local/README.md); AWS signing cost and optimum settings remain unmeasured.

Required claims: exact configured `iss`, purpose-specific `aud`, opaque UUID `sub`, independent random UUID `jti` for each token, UUID session `sid` and family `fid`, integer `iat`, `nbf`, `exp`, and `token_use`. Protected headers: allowlisted `alg=ES256`, bounded known `kid`; access `typ=exam-access+jwt`/`token_use=access`/audience `urn:online-exam:api:v1`, refresh `typ=exam-refresh+jwt`/`token_use=refresh`/audience `urn:online-exam:refresh:v1`. Environment-specific issuer prevents cross-environment acceptance and need not be a DNS domain. Reject wrong/missing claims, unexpected critical headers, malformed/oversized JWT (initial ceiling2048bytes), none/HS/other algorithms, unknown/revoked kid, attacker-supplied jwk/jku/x5u and token-purpose substitution. Clock tolerance at most30s for crypto checks; authoritative DB expiry has no grace. Bound future iat and configured maximum lifetimes. Rules follow [RFC8725](https://www.rfc-editor.org/rfc/rfc8725.html).

After signature/claim validation, match full compact JWT SHA-256 fingerprint and session/jti/family/user/kid against PostgreSQL. Every authenticated request checks live session, consumption, expiry, family revocation, enabled/verified account and current permissions; no Redis/auth cache baseline. Invalid JWT fails before a session lookup when practical. Current permission checks never trust stale token roles. One session/permission projection round trip stays in hot-route budgets; crypto overhead is measured separately. Do not silently remove access_hash/refresh_hash durability or bypass checks to claim JWT performance.

Key lifecycle: typed config validates active key pair, P-256/algorithm, unique kid and trusted public ring at startup; API signing private key injected through Secrets Manager production or ignored restricted local file, never source/image/.env.example/log. Worker email has only its purpose-specific encryption material, no JWT private signing key. Normal rotation preloads the new public key on all API instances, switches active signer, retires old private signing access, keeps old public key until latest issued token expiry + clock bound. Refresh JWT lifetime makes required overlap at most7days after last issuance, with actual issuance expiry recorded. Compromise denies kid everywhere and revokes affected families; no compromised-key overlap. Public ring/deny rollout, loss/mismatch, old-token refresh and two-instance propagation need real tests/drills. No per-request remote secret/JWKS/KMS call baseline; do not follow key URLs supplied in tokens.

Refresh atomically consumes the current hashed token and rotates both cookies. Valid refresh replay/reuse revokes that session family and returns Unauthenticated, including two-tab refresh race. Client single-flight coordination is required; security does not rely on it. Timeout after refresh commit may require fresh login if token was lost; do not preserve plaintext refresh tokens in generic receipts or silently allow replay. Logout revokes current family immediately; missing/already-revoked family returns `{revoked:true}` and clears cookies. Permission changes/account disable are effective on next authenticated request. No grace window that serves revoked credentials. Rate-bound register/login/refresh/logout and password hashing are tested before deployment.

CSRF: GET `/v1/auth/csrf` issues a short-lived (10min), server-HMAC-signed random nonce cookie `__Host-csrf` (Secure, SameSite=Lax, Path=/, readable for header echo). Bind authenticated tokens to the live session family; pre-login tokens use a separate anonymous context and cannot authorize a live authenticated mutation. Every unsafe browser method, including login/register/refresh/logout, requires exact allowlisted Origin plus `X-CSRF-Token` matching cookie and valid signature/age/context; protect pre-login as well. Rotate CSRF on login/refresh, clear on logout; clients fetch a new token after expiration. GET csrf may resolve the live refresh family when access has expired; logout without a live family accepts a valid anonymous token and remains idempotent. A still-valid original signed nonce bound to that same revoked refresh fingerprint is accepted only for logout retry; anonymous CSRF must never authorize revocation of a live family. Header/cookie/signature and Origin checks are complementary; cookie flags follow [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). No wildcard credentialed CORS; production same-origin default. k6 uses legitimate cookie jars and Origin/CSRF headers, never bypassed auth.

Both email-verification POST endpoints enforce exact Origin and valid anonymous CSRF at the HTTP-session port; a live family is rejected even when its signed CSRF is otherwise valid. CSRF signing uses a separate secret/purpose, not the JWT private key or email encryption key. A logged-in browser should complete verification in an anonymous context after logout; activation never swaps a live user's session.

Defense-in-depth rate limits: authenticated candidate mutation bucket initially 5/s with burst 20; reads 10/s burst 30 per actor; login failures 5/account/15min plus suspicious-IP control; registration 10/IP/hour is a starting abuse policy, reviewed for shared-campus networks. Baseline distributed counter adapter uses bounded/expiring atomic PostgreSQL buckets behind a security port, with no unbounded user-supplied counter keys; WAF managed rules/size caps and bounded local admission complement it. Its extra query is included in hot-path budgets. Implement/test/prune/benchmark counter contention and cost before production; combining auth/limit SQL or adding Redis requires measured evidence/resource justification, not an assumed free rate-limit lookup. Legitimate mass-start/autosave rejected by limits counts against capacity/SLO; do not apply a generic low IP cap to 2,000 candidates behind one NAT.

## 3. First admin and privilege changes

No public role-assignment/bootstrap endpoint. Implemented operator CLI uses a separate DB role, validates an existing enabled **email-verified** account, acquires a bootstrap lock and grants admin once with append-only audit. It never accepts a hard-coded password/default admin. Require operator identity, reason and explicit account selection; print no secrets. DB audit includes authenticated session_user; trusted human/IAM attribution remains an AWS deployment requirement. Runtime DML cannot self-grant. Subsequent grants/revokes use the same audited procedure; key revoke/email replay use operator-only SQL functions. See [operations runbook](runbooks/identity-operations.md).

## 4. Question import

POST admin import accepts JSON only, schemaVersion=1 and 1–100 bank questions; body ≤1MiB UTF-8, no CSV/XLSX/zip/remote URL fetching in v1. Types/keys/points/text limits follow product §2. Each entry has unique clientRef (1–64 ASCII letters/digits/underscore/hyphen), plus type/prompt/options/correctOptionPositions/points/explanation. Option positions 1–10; correct positions nonempty/unique/members and cardinality validated. Imported bank IDs are server-assigned, not arbitrary overwrite targets.

Validation-only phase precedes writing. `dryRun=true` returns line/clientRef errors or validity without bank mutation; report/audit/receipt are still persisted. Structurally invalid JSON/schema/body limits return 400 Invalid request; semantic entry validation (option positions/key membership/cardinality) returns 200 report `{valid:false, committed:false, issues:[{clientRef,field,message}]}`, no bank rows. Real import is atomic all-or-nothing. Valid real import inserts all questions + report + audit + idempotency receipt in one UoW, returns `{valid:true,committed:true,...}`. Retry key/body returns same report/IDs; changed payload conflicts. Report stores entry IDs and safe issues, not raw question body/keys. Large/unsupported import returns 400 Invalid request; repeated imports with new keys intentionally create new questions, not implicit upsert. Report GET is bounded/authorized; do not enqueue a new import worker for 100-row atomic workload without measurement.

## 5. Audit and retention

Audit records: eventId, occurredAt, actor opaque ID/type, action, resource type/ID, outcome, reason, correlationId and safe changed-field names; no answers/keys/passwords/tokens/raw SQL/body or IP by default. Admin mutations, publish/import, operator grants, replay and privacy opt-in change write audit in the same transaction as effect. Sensitive admin key/review/report exports/access are audited; audit failure fails that operation closed. Audit read access also logged without recursive transaction audit. Append-only application role permissions; retention deletion is separate maintenance privilege. Business audit is not sampled; diagnostic logs/traces may be.

| Data | Baseline retention / purge behavior |
| --- | --- |
| Attempt/answers/results/history | Minimum365days from submit (or deadline if no submit); completed payload withdrawal also waits7days after completion/recent Assessment receipt, successful inbox and settled delivery/failure. Active/pending/FAILED/replay/unresolved records are protected. Bounded payload/projection/audit UoW; compact attempt/submission/inbox stays for quota/redelivery, Candidate history excludes purged payload. [ADR-011](adr/011-assessment-retention-compaction.md). |
| Frozen versions/questions/keys | Retain while referenced attempts exist; archive hides new access, purge only after last reference and retention gate. |
| Receipt | Minimum7days after acceptance; [ADR-003](adr/003-idempotency-retention.md). Implemented Assessment pruning is bounded and completed-only with delivery/failure gates; foreign operations/active/pending/FAILED protected. Compact response, no answer contents. Other capabilities have separate lifecycle gates. |
| Successful inbox/submission identity | Retain with compact attempt identity after payload withdrawal; quota/redelivery/replay fencing requirement. Do not prune while effects could repeat or references/restore require identity. Metadata reclamation/PII unlinking remains a separate gate; no retained answer/score payload is implied. |
| Delivered outbox / import report | 30days diagnostic retention; stable submission/result identifiers remain with attempt. Unsent/parked/outstanding DLQ work never age-purged as success. |
| Session/token rows | Expired/revoked metadata 30days, token hashes removed after absolute expiry/revocation diagnostics; privacy/security review permits earlier cleanup without permitting revoked tokens. |
| Verification challenge / email intent | Token validity30min; erase encrypted delivery material on consume/cancel/expiry, including parked jobs. Hash/terminal diagnostic metadata≤24h; redacted delivery metadata≤7days. Unverified accounts with no authorized activity expire after7days in bounded audited cleanup; resend cannot extend reservation forever. Privacy cleanup cancels mail before PII deletion. Backups follow their separate expiry, and restore cancels pre-restore challenges/mail intents. |
| Admin/operator/privacy audit | 365days online baseline; deletion protection, access control and purge role required. Extend only for documented organizational requirement. |
| Diagnostics / traces | Logs 14days; traces 5% baseline sampled, no high-cardinality metric IDs; budgets measured later. |
| Backup copies | Planned PITR 7days as baseline operational restore window; extension needs documented recovery requirement/cost evidence. Deleted data may remain until backup expiry. Restore procedure reapplies durable deletion/opt-out ledger before reopening public access. No regulatory compliance claim. |

[Assessment retention runbook](runbooks/assessment-retention.md) governs its opt-in job and purged-aware rollout/rollback. This is completed payload lifecycle, not full account/PII erasure, audit/outbox cleanup or restore acceptance. Compact metadata/frozen references carry an explicit quota/redelivery requirement; their storage and safe reclamation must be measured/reviewed separately.

Account deletion: immediately disable/revoke sessions, opt out ranking; remove direct identity PII within 30days through audited maintenance, preserving an unlinked opaque attribution for retained exam/audit records. Purge scores/answers at their retention deadline; organizational/legal retention exceptions require explicit reviewed policy, not a hidden forever-retention default. Retention is a baseline product decision; workload/backup storage cost must be measured. Privacy deletion/opt-out must not be undone by restore or cached rankings. OPS restore must verify an independent durable privacy ledger (encrypted existing private S3, not only the restored DB); default recovery disables leaderboards/revokes sessions and stays closed if ledger reconciliation is uncertain. A fulfilled deletion request requires ledger durability first. This is an operational requirement for future implementation, not a claimed ledger/backup deployment.

## 6. Acceptance

AC-18–24/29 and AC-33–35 in [contract-test matrix](contract-tests.md) define acceptance. Identity crypto, real DB/HTTP sessions, profile rollback/receipts, operator boundaries and SMTP/lease/retention have local evidence; other business ownership/import and browser/restore cases remain pending. Runtime dependency audit reports0 vulnerabilities;20 moderate dev advisories remain SEC-06. Image/IaC and production security are not accepted from that scan.

Login failure admission reserves one slot atomically in an independent short transaction before hashing, with a subject-HMAC advisory lock and a fresh post-lock SELECT. Five failed/in-flight evaluations block further attempts; successful or technically rejected hashing releases its reservation. Native hashing holds no connection. Crash after reservation conservatively counts as a failure until expiry. Minute buckets retain failures at least15min after the latest reservation in that bucket (up to one minute of conservative overlap); a later reservation must extend its expiry. Sequential successes, six concurrent wrong passwords and expiry-extension regression were tested against PostgreSQL. This does not prove shared-NAT capacity or timing-enumeration resistance.

## 7. Later login methods

Passwordless email magic link and GitHub are ID-12/13, not current endpoints. Magic-link tokens have a distinct `LOGIN_EMAIL` purpose, expiry and consumption/browser-binding policy; a VERIFY_EMAIL link must never log in. New methods still create the same signed session pair and obey DB revocation/permissions/disabled/verified policy. Do not add a generic provider framework or future tables before implementation requires them.

GitHub later uses OAuth authorization code with state/PKCE (`S256`), exact registered callback and minimum scopes following [GitHub OAuth guidance](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps); provider API access is behind a port. Account identity uses stable GitHub subject ID, not mutable login name. Unique `(provider,subject)` mapping belongs to Identity. Do not auto-link an existing account solely by matching email: require fresh authentication to the existing account plus provider proof. Email discovery/verified flags follow [GitHub email API](https://docs.github.com/en/rest/users/emails), not a user-supplied profile string. New provider-only account/nullable-password/email ownership policy needs its own migration and tests; no automatic Candidate→Admin grant. Provider token is never accepted as this platform's access/refresh JWT.


Local browser evidence: [Identity HTTPS](evidence/identity-https-2026-10-07/README.md) covers actual Secure cookies, same-origin/CSRF, explicit email activation, shared-cookie tabs, logout/disable and commit-lost ACK. Ephemeral leaf trust is not public PKI/AWS TLS acceptance; production controls and live SES remain pending.

REP-02 reports enforce current reporting.read twice (HTTP admission and locked Identity revalidation); safe mandatory access audit commits before payload. Scores never grant access to keys/answers/explanations; review:null and assessment.review.admin remains separate. Purged payloads are404 and unscored detail409. Scope/paging/failure policy: [Admin submissions runbook](runbooks/admin-submissions.md).


Business count/backlog reads require reporting.read at /v1/admin/business-metrics;
combined /v1/admin/metrics retains system.metrics.read and remains specified until
real telemetry providers exist. Current locked Identity access and mandatory global
reporting.business-metrics.read audit share the short read UoW. Target type is
BUSINESS_METRICS with fixed single-platform UUID00000000-0000-4000-8000-000000000000;
no counts/window/PII in audit payload. Future multi-tenant scope requires a separate
contract review; this platform has one authorized Admin scope. Cost of the global
scan is bounded by pool/admission/timeouts, not an assumed indexed time window.
Manual/slow polling guidance is operational, not a newly enforced30s server limit.

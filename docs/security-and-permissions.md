# Security, permissions, import and retention v1

Status: implementation requirements adopted 2026-10-06, controls not implemented or production-verified. Covers SPEC-09 and auth transport for SPEC-10. [Product rules](product-specification.md), [API](contracts/openapi.yaml) and architecture/R-33–47 remain authoritative.

## 1. Permissions and ownership

Role maps to permissions centrally; application receives a principal and uses permissions/object ownership, never scattered role-name comparisons. Admin accounts may also hold Candidate permissions; Admin alone does not permit impersonating another candidate's write session.

| Permission | Candidate | Admin baseline | Object / data scope |
| --- | --- | --- | --- |
| `identity.self` | yes | yes | Own profile/session/leaderboard opt-in only; no body role/userId override. |
| `catalog.read` | yes | yes | Published metadata; no keys/question bank. |
| `assessment.take` | yes | separately assigned | Own start/resume/questions/answer/submit/status/history. |
| `assessment.result.read` | yes | separately assigned | Own result/review with frozen release gate. |
| `leaderboard.read` | yes | yes | Enabled publication, pseudonyms only. |
| `catalog.manage` | no | yes | Draft CRUD, sections, membership, archive/publish; expected revision + audit. |
| `catalog.keys.read` | no | yes | Bank/admin questions/keys/explanations; audit accesses, never candidate DTO. |
| `catalog.import` | no | yes | Bounded question imports and owned import reports; audited. |
| `reporting.read` | no | yes | Active candidate counts, submissions/scores/question statistics/business summary; restricted admin DTOs. |
| `assessment.review.admin` | no | yes | Explicit admin submission review including keys; read-access audit, no candidate write impersonation. |
| `assessment.replay` | no | yes | Failed submission replay only, required reason, stable identity and audit. |
| `audit.read` | no | yes | Paginated redacted audit records; no secrets/answers. |
| `system.metrics.read` | no | yes | Aggregated service/business telemetry; no unrestricted CloudWatch console/SQL/SQS access. |
| IAM/operator privilege | no | no | Migrations/secrets/admin provisioning/restore via separate least-privilege operator role, not app role. |

All own-object APIs return 404 Not found for nonexistent/foreign IDs, after authentication. Lack of an action permission returns 403 Permission denied. Admin routes require their declared permission and audited sensitive access. Do not let supplied `actorId`, cursor, exam version, import report ID or resource path bypass authorization. State/deadline invariants apply even if principal is Admin.

## 2. Registration, sessions and browser transport

Register accepts email (ASCII, trim + lowercase full address, max 254), displayName (1–80 plain characters), password (15–128 Unicode characters; do not trim password). Username is email; no alternate username namespace in v1. New accounts receive Candidate permissions only and leaderboardOptIn=false. Return 202 `{accepted:true}` for new/existing email with the same envelope; existing account credentials are never overwritten. Login invalid/disabled/nonexistent user returns the same 401 Unauthenticated. Enumeration timing tests and bounded hashing concurrency are required, not implied by generic text.

Password storage uses Argon2id at least 19MiB memory / 2 iterations / parallelism 1, unique salt; benchmark hash duration/memory and raise settings within login SLO/capacity, never lower baseline silently. See [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). No password/token in logs/receipts/audit. No email service or verification is claimed; add verified-email/recovery flows only with separate product/security contract.

Baseline browser API and static app share one HTTPS origin (CloudFront routing); origin/TLS AWS implementation remains pending. Opaque random 256-bit access and refresh credentials are stored hashed in PostgreSQL, bound to session/family/user; no localStorage token. Cookie names `__Host-access`, `__Host-refresh`, both Secure, HttpOnly, SameSite=Lax, Path=/, no Domain. Access TTL 5min; refresh idle 7days; session absolute 30days. These are credential validity, not attempt duration. Every authenticated request checks live session/revocation in DB; no Redis/auth cache baseline. This adds one query/round trip to endpoint budgets, made explicit in workload contract.

Refresh atomically consumes the current hashed token and rotates both cookies. Valid refresh replay/reuse revokes that session family and returns Unauthenticated, including two-tab refresh race. Client single-flight coordination is required; security does not rely on it. Timeout after refresh commit may require fresh login if token was lost; do not preserve plaintext refresh tokens in generic receipts or silently allow replay. Logout revokes current family immediately; missing/already-revoked family returns `{revoked:true}` and clears cookies. Permission changes/account disable are effective on next authenticated request. No grace window that serves revoked credentials. Rate-bound register/login/refresh/logout and password hashing are tested before deployment.

CSRF: GET `/v1/auth/csrf` issues a short-lived (10min), server-HMAC-signed random nonce cookie `__Host-csrf` (Secure, SameSite=Lax, Path=/, readable for header echo). Bind authenticated tokens to the live session family; pre-login tokens use a separate anonymous context and cannot authorize a live authenticated mutation. Every unsafe browser method, including login/register/refresh/logout, requires exact allowlisted Origin plus `X-CSRF-Token` matching cookie and valid signature/age/context; protect pre-login as well. Rotate CSRF on login/refresh, clear on logout; clients fetch a new token after expiration. GET csrf may resolve the live refresh family when access has expired; logout without a live family accepts a valid anonymous token and remains idempotent. Header/cookie/signature and Origin checks are complementary; cookie flags follow [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). No wildcard credentialed CORS; production same-origin default. k6 uses legitimate cookie jars and Origin/CSRF headers, never bypassed auth.

Defense-in-depth rate limits: authenticated candidate mutation bucket initially 5/s with burst 20; reads 10/s burst 30 per actor; login failures 5/account/15min plus suspicious-IP control; registration 10/IP/hour is a starting abuse policy, reviewed for shared-campus networks. Baseline distributed counter adapter uses bounded/expiring atomic PostgreSQL buckets behind a security port, with no unbounded user-supplied counter keys; WAF managed rules/size caps and bounded local admission complement it. Its extra query is included in hot-path budgets. Implement/test/prune/benchmark counter contention and cost before production; combining auth/limit SQL or adding Redis requires measured evidence/resource justification, not an assumed free rate-limit lookup. Legitimate mass-start/autosave rejected by limits counts against capacity/SLO; do not apply a generic low IP cap to 2,000 candidates behind one NAT.

## 3. First admin and privilege changes

No public role-assignment/bootstrap endpoint. Future one-shot deployment/operator CLI uses a dedicated short-lived operator DB/IAM role, validates an existing enabled account, acquires a bootstrap lock and grants admin permissions once with append-only audit. It never accepts a hard-coded password/default admin. Require verified operator identity, reason and explicit account selection; print no secrets. Application runtime DML role cannot self-grant operator privileges. Subsequent grants/revokes use the same audited operator procedure in v1; separate UI workflow requires its own API/review.

## 4. Question import

POST admin import accepts JSON only, schemaVersion=1 and 1–100 bank questions; body ≤1MiB UTF-8, no CSV/XLSX/zip/remote URL fetching in v1. Types/keys/points/text limits follow product §2. Each entry has unique clientRef (1–64 ASCII letters/digits/underscore/hyphen), plus type/prompt/options/correctOptionPositions/points/explanation. Option positions 1–10; correct positions nonempty/unique/members and cardinality validated. Imported bank IDs are server-assigned, not arbitrary overwrite targets.

Validation-only phase precedes writing. `dryRun=true` returns line/clientRef errors or validity without bank mutation; report/audit/receipt are still persisted. Structurally invalid JSON/schema/body limits return 400 Invalid request; semantic entry validation (option positions/key membership/cardinality) returns 200 report `{valid:false, committed:false, issues:[{clientRef,field,message}]}`, no bank rows. Real import is atomic all-or-nothing. Valid real import inserts all questions + report + audit + idempotency receipt in one UoW, returns `{valid:true,committed:true,...}`. Retry key/body returns same report/IDs; changed payload conflicts. Report stores entry IDs and safe issues, not raw question body/keys. Large/unsupported import returns 400 Invalid request; repeated imports with new keys intentionally create new questions, not implicit upsert. Report GET is bounded/authorized; do not enqueue a new import worker for 100-row atomic workload without measurement.

## 5. Audit and retention

Audit records: eventId, occurredAt, actor opaque ID/type, action, resource type/ID, outcome, reason, correlationId and safe changed-field names; no answers/keys/passwords/tokens/raw SQL/body or IP by default. Admin mutations, publish/import, operator grants, replay and privacy opt-in change write audit in the same transaction as effect. Sensitive admin key/review/report exports/access are audited; audit failure fails that operation closed. Audit read access also logged without recursive transaction audit. Append-only application role permissions; retention deletion is separate maintenance privilege. Business audit is not sampled; diagnostic logs/traces may be.

| Data | Baseline retention / purge behavior |
| --- | --- |
| Attempt/answers/results/history | 365days from submit (or deadline if no submit); no purge of active/pending/FAILED unresolved records until recovery/incident reviewed. Then purge by bounded maintenance batches with result/projection/FK consistency. |
| Frozen versions/questions/keys | Retain while referenced attempts exist; archive hides new access, purge only after last reference and retention gate. |
| Receipt | Minimum 7days after acceptance; bounded pruning under ADR-003; compact response, no answer contents. |
| Successful inbox/submission identity | At least attempt/result lifetime; do not prune while replay can duplicate result/projection. |
| Delivered outbox / import report | 30days diagnostic retention; stable submission/result identifiers remain with attempt. Unsent/parked/outstanding DLQ work never age-purged as success. |
| Session/token rows | Expired/revoked metadata 30days, token hashes removed after absolute expiry/revocation diagnostics; privacy/security review permits earlier cleanup without permitting revoked tokens. |
| Admin/operator/privacy audit | 365days online baseline; deletion protection, access control and purge role required. Extend only for documented organizational requirement. |
| Diagnostics / traces | Logs 14days; traces 5% baseline sampled, no high-cardinality metric IDs; budgets measured later. |
| Backup copies | Planned PITR 7days as baseline operational restore window; extension needs documented recovery requirement/cost evidence. Deleted data may remain until backup expiry. Restore procedure reapplies durable deletion/opt-out ledger before reopening public access. No regulatory compliance claim. |

Account deletion: immediately disable/revoke sessions, opt out ranking; remove direct identity PII within 30days through audited maintenance, preserving an unlinked opaque attribution for retained exam/audit records. Purge scores/answers at their retention deadline; organizational/legal retention exceptions require explicit reviewed policy, not a hidden forever-retention default. Retention is a baseline product decision; workload/backup storage cost must be measured. Privacy deletion/opt-out must not be undone by restore or cached rankings. OPS restore must verify an independent durable privacy ledger (encrypted existing private S3, not only the restored DB); default recovery disables leaderboards/revokes sessions and stays closed if ledger reconciliation is uncertain. A fulfilled deletion request requires ledger durability first. This is an operational requirement for future implementation, not a claimed ledger/backup deployment.

## 6. Acceptance

AC-18–24 and AC-29 in [contract-test matrix](contract-tests.md) cover ownership, leakage, refresh/revocation, admin escalation, import rollback/retry, audit and retention/restore. Schema validation cannot prove those controls: real API/DB/browser/restore tests remain pending. Dependencies/image/IaC advisories remain SEC-06; current dev findings are not production security acceptance.

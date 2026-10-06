# Test inventory

No legacy baseline or skipped/disabled tests.

| Suite | Cases | Purpose | Runtime |
| --- | --- | --- | --- |
| [Attempt unit](../apps/api/src/modules/assessment/domain/__tests__/attempt.unit.spec.ts) | 20 | restored status/expiration provenance, CREATED/start, deadline, submit duplication, expiration, invalid transitions/time, defensive snapshot, grading retry | Jest / pure TypeScript |
| [Scoring unit](../apps/api/src/modules/assessment/domain/__tests__/scoring.unit.spec.ts) | 8 | exact match/order/cardinality, duplicates, membership, unanswered questions, invalid scoring definitions | Jest / pure TypeScript |
| [Quality tooling unit](../scripts/__tests__/quality.unit.spec.mjs) | 10 | import forms/barrels, Domain→Application, private dependencies, platform→business and Presentation→Infrastructure rejection, links/anchors/fences | Node test |
| [Contract tooling unit](../scripts/__tests__/contracts.unit.spec.mjs) | 16 | OpenAPI/examples, event identity/time/schema/secret rejection, candidate leak rejection, save bounds/clear, auth public-path allowlist, Origin/CSRF/idempotency/owner/cursor metadata, verification schema/POST, signed-token purpose/authority metadata and raw-token/username/ASCII negatives | Node test |
| [Database config unit](../apps/api/src/platform/infrastructure/database/__tests__/database-config.unit.spec.ts) | 13 | bounded pool/timeouts, TLS/URL overrides, arithmetic connection budget | Jest / pure validation |
| [Migration guard unit](../apps/api/src/platform/infrastructure/database/__tests__/migration-runner.unit.spec.ts) | 6 | top-level transaction/session rejection and allowed quoted/function bodies | Jest / trusted-file guard |
| [Identity policy unit](../apps/api/src/modules/identity/domain/__tests__/identity-policy.unit.spec.ts) | 4 | enabled/verified, post-lock expiry/context, UUIDv7 freshness and lifecycle constants | Jest / pure TypeScript |
| [Crypto unit](../apps/api/src/modules/identity/infrastructure/security/__tests__/identity-crypto.unit.spec.ts) | 5 | signing/claims/purpose/keys, overlap/removal, encrypted context and salted Argon2 | Jest / actual crypto |
| [Admission error unit](../apps/api/src/modules/identity/application/__tests__/admission.unit.spec.ts) | 1 | technical unavailable category/safe text | Jest |
| [Runtime config unit](../apps/api/src/platform/infrastructure/security/__tests__/runtime-config.unit.spec.ts) | 2 | missing secret, production HTTPS, worker no-signing-key | Jest |
| [SES mail unit](../apps/api/src/modules/identity/infrastructure/mail/__tests__/verification-mail.unit.spec.ts) | 2 | provider request/permanent rejection/5s abort; not live SES | Jest / provider boundary |
| [Response unit](../apps/api/src/platform/presentation/http/interceptors/__tests__/api-response.interceptor.unit.spec.ts) | 1 | null success fields/health bypass | Jest |
| [Error filter unit](../apps/api/src/platform/presentation/http/filters/__tests__/domain-exception.filter.unit.spec.ts) | 2 | semantic/framework/unknown safe mapping | Jest |
| [PostgreSQL integration](../apps/api/tests/integration/database.spec.ts) | 30 | schema/privileges/frozen membership/category/completion/submission identity, ALS/joined rollback, async isolation, locks/pool/server timeouts, safe observations/pg_stat_statements, atomic/checksum/concurrent migrations and zero-connection cleanup | PostgreSQL 17 / real restricted logins |
| [Identity integration](../apps/api/tests/integration/identity.spec.ts) | 22 | activation/resend/refresh/reuse/current permissions, audit rollback/profile receipts, HTTP CSRF/cookies/logout/drain, actual SMTP, lease/park/backoff/maintenance locks, operator bootstrap/key revoke/replay/least privilege/retention, concurrent failure admission/expiry | PostgreSQL17 / restricted roles, HTTP/SMTP local |

Inventory:64 Jest +26 Node =90 unit/tooling;30 foundation +22 Identity =52 integration; **142 PASS, none skipped** in complete runs. Focused RED commands temporarily select individual regressions, no permanently skipped baseline. Actual entry-point smoke/diagnostic benchmark are additional script checks, not counted as cases. [Review](phase-04-review.md) and [experiment](../experiments/identity-local/README.md) record evidence. Exam start/save/submit/inbox/SQS, browser HTTPS, AWS/restore/SLO/cost remain pending; local fixtures do not replace those gates.

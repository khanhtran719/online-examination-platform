# Test inventory

No legacy baseline or skipped/disabled tests.

| Suite | Cases | Purpose | Runtime |
| --- | --- | --- | --- |
| [Attempt unit](../apps/api/src/modules/assessment/domain/__tests__/attempt.unit.spec.ts) | 20 | restored status/expiration provenance, CREATED/start, deadline, submit duplication, expiration, invalid transitions/time, defensive snapshot, grading retry | Jest / pure TypeScript |
| [Scoring unit](../apps/api/src/modules/assessment/domain/__tests__/scoring.unit.spec.ts) | 8 | exact match/order/cardinality, duplicates, membership, unanswered questions, invalid scoring definitions | Jest / pure TypeScript |
| [Quality tooling unit](../scripts/__tests__/quality.unit.spec.mjs) | 16 | import forms/barrels, Domain→Application, private dependencies, shared/common/config/workers and technical→business rejection, public cross-module entries, legacy placement, aliases, links/anchors/fences | Node test |
| [Migration assets unit](../scripts/__tests__/migration-assets.unit.spec.mjs) | 2 | byte-identical SQL bundle copy, missing/empty/symlink asset rejection | Node test / actual temp files |
| [Contract tooling unit](../scripts/__tests__/contracts.unit.spec.mjs) | 16 | OpenAPI/examples, event identity/time/schema/secret rejection, candidate leak rejection, save bounds/clear, auth public-path allowlist, Origin/CSRF/idempotency/owner/cursor metadata, verification schema/POST, signed-token purpose/authority metadata and raw-token/username/ASCII negatives | Node test |
| [Database config unit](../apps/api/src/config/__tests__/database-config.unit.spec.ts) | 13 | bounded pool/timeouts, TLS/URL overrides, arithmetic connection budget | Jest / pure validation |
| [App config unit](../apps/api/src/config/__tests__/app-config.unit.spec.ts) | 2 | pure settings validation without secret file access, worker credential isolation and production HTTPS | Jest / pure validation |
| [Migration guard unit](../apps/api/src/infrastructure/database/__tests__/migration-runner.unit.spec.ts) | 6 | top-level transaction/session rejection and allowed quoted/function bodies | Jest / trusted-file guard |
| [Identity policy unit](../apps/api/src/modules/identity/domain/__tests__/identity-policy.unit.spec.ts) | 4 | enabled/verified, post-lock expiry/context, UUIDv7 freshness and lifecycle constants | Jest / pure TypeScript |
| [Crypto unit](../apps/api/src/modules/identity/infrastructure/security/__tests__/identity-crypto.unit.spec.ts) | 5 | signing/claims/purpose/keys, overlap/removal, encrypted context and salted Argon2 | Jest / actual crypto |
| [Admission error unit](../apps/api/src/modules/identity/application/__tests__/admission.unit.spec.ts) | 1 | technical unavailable category/safe text | Jest |
| [Runtime config unit](../apps/api/src/infrastructure/security/authentication/__tests__/secret-loader.unit.spec.ts) | 2 | missing secret, production HTTPS, worker no-signing-key | Jest |
| [SES mail unit](../apps/api/src/modules/identity/infrastructure/mail/__tests__/verification-mail.unit.spec.ts) | 2 | provider request/permanent rejection/5s abort; not live SES | Jest / provider boundary |
| [Response unit](../apps/api/src/shared/common/interceptors/__tests__/api-response.interceptor.unit.spec.ts) | 1 | null success fields/health bypass | Jest |
| [Error filter unit](../apps/api/src/shared/common/filters/__tests__/domain-exception.filter.unit.spec.ts) | 2 | semantic/framework/unknown safe mapping | Jest |
| [PostgreSQL integration](../apps/api/tests/integration/database.spec.ts) | 31 | schema/privileges/frozen membership/category/completion/submission identity, ALS/joined rollback, async isolation, locks/pool/server timeouts, safe observations/pg_stat_statements, atomic/checksum/concurrent migrations and zero-connection cleanup | PostgreSQL 17 / real restricted logins |
| [Identity integration](../apps/api/tests/integration/identity.spec.ts) | 22 | activation/resend/refresh/reuse/current permissions, audit rollback/profile receipts, HTTP CSRF/cookies/logout/drain, actual SMTP through public worker factory, lease/park/backoff/maintenance locks, operator bootstrap/key revoke/replay/least privilege/retention, concurrent failure admission/expiry | PostgreSQL17 / restricted roles, HTTP/SMTP local |

Historical normalization:66 Jest/12 suites +34 Node =100 unit/tooling;30 foundation +22 Identity =52 integration; **152 PASS, none skipped**. Current database suite adds one queued-work drain regression after the persistence evaluation, so the table now lists31 foundation cases. Focused RED commands temporarily select individual regressions, no permanently skipped baseline. Actual entry-point smoke/operator CLI/diagnostic benchmark are additional script checks, not counted as cases. [Review closure](api-architecture-review.md#7-closure-sau-source-normalization) and [normalization experiment](../experiments/architecture-normalization/README.md) record fresh evidence; [Phase04 review](phase-04-review.md) retains historical142-test evidence. Exam start/save/submit/inbox/SQS and AWS/restore/SLO/cost remain pending; local browser HTTPS was subsequently checked below; local fixtures do not replace those gates.

## Web public experience — 2026-10-07

Separate from the historical backend totals above:

| Suite                                                                                            | Cases | Purpose                                                                                                                                                             | Runtime                                   |
| ------------------------------------------------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [Public sample reducer](../apps/web/src/features/experience/__tests__/sample.unit.spec.ts)       | 7     | authored three-question scoring/exact-match, selection replacement/multiple choices, navigation/marks, clear/reset, incomplete review, invalid indices              | Vitest / pure TypeScript                  |
| [Public sample UI](../apps/web/src/features/experience/__tests__/sample-experience.unit.spec.ts) | 2     | question→review→result/register/reset and mark/back/clear                                                                                                           | Vitest / React Testing Library            |
| [Public visual browser](../apps/web/e2e/public-experience.e2e-spec.ts)                           | 8     | live+demo WebGL, five widths/overflow, axe, pause/reduced-motion, keyboard, sample/reset/register, protected attempt, forced fallback/context recovery and disposal | Playwright / Chromium with software WebGL |
| [Web browser regression](../apps/web/e2e/browser.spec.ts)                                        | 4     | public/auth errors, exam save/conflict/frozen version/result, hidden admin navigation and capability revocation, missing metrics, live no-fixture fallback          | Playwright / Chromium                     |

Full frontend unit run: **73 cases /16 files PASS**, including the9 new public sample cases. The public sample has no Assessment API calls or official scoring. Browser evidence and scope limits are recorded in [the implementation review](web-ui/vao-nhip-thi-implementation-2026-10-07.md); these checks do not close production or AWS gates.


## Identity browser HTTPS — 2026-10-07

[Current RED/GREEN evidence](evidence/identity-https-2026-10-07/README.md) and [runbook](runbooks/identity-https.md) record the local ID-07/WEB-02 closure. Fresh root100 + actual PG/HTTP/SMTP53 + web73 + browser HTTPS10 cases PASS. The web total includes9 concurrent public-experience cases from the separate increment above; it is not64 additional cases on top of73. Broader public/Web/Firefox/WebKit/SES/AWS acceptance remains separate.

| Added/expanded suite | Cases / scope | Evidence |
| --- | --- | --- |
| [Streamed HTTP body](../apps/web/src/shared/api/__tests__/http-parse.test.ts) | Two new regressions within73: body I/O classification and original timeout through body | Both reproduced RED before transport fix, full web suite GREEN |
| [Session coordinator](../apps/web/src/features/auth/__tests__/session-coordinator.test.ts) | Two new regressions within73: confirmed login reset and late-generation outcome | RED before fix; ordinary probes cannot reset unknown-outcome latch |
| [Identity HTTP integration](../apps/api/tests/integration/identity.spec.ts) | Existing cases expanded,22 total, not extra cases: fresh anonymous CSRF logout retry, live-family rejection and anonymous-only verification | Actual restricted PostgreSQL and HTTP/SMTP,53 full integration cases PASS |
| [Identity HTTPS browser](../apps/web/e2e/identity-https/identity.spec.mjs) | Ten actual Chromium cases H01–H10 | Live API/PG/worker SMTP; TLS/security, verification, shared-cookie tabs, lost ACK,10s body timeout, restart/revocation |

No migration or production gate newly accepted. The HTTPS runner snapshots static assets and stores output separately from the default UI suite; zero automatic retries and no raw auth trace/cookie/link artifacts. See [manifest](evidence/identity-https-2026-10-07/manifest.json) for runtime/build digests and limits.

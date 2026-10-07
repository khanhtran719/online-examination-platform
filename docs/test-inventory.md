# Test inventory

Baseline cases are not permanently skipped/disabled. Historical review-only probes retain the original RED evidence; current Catalog regressions pass after the fixes below.

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
| [Response unit](../apps/api/src/shared/common/interceptors/__tests__/api-response.interceptor.unit.spec.ts) | 1 | null success fields/health bypass and list metadata lift | Jest |
| [Catalog policy unit](../apps/api/src/modules/catalog/domain/__tests__/catalog-policy.unit.spec.ts) | 23 | choice/points/key rules, strict UTC calendar/leap/fraction cases, Unicode code-point boundaries for question/exam/import, publication completeness and UUIDv7 freshness | Jest / pure TypeScript |
| [Catalog diagnostic tooling unit](../scripts/__tests__/catalog-diagnostic-report.unit.spec.mjs) | 3 | summary generated from raw, absent samples are null/not measured, frozen evidence cannot be overwritten | Node test / actual temporary files |
| [Error filter unit](../apps/api/src/shared/common/filters/__tests__/domain-exception.filter.unit.spec.ts) | 2 | semantic/framework/unknown safe mapping | Jest |
| [PostgreSQL integration](../apps/api/tests/integration/database.spec.ts) | 31 | schema/privileges/frozen membership/category/completion/submission identity, ALS/joined rollback, async isolation, locks/pool/server timeouts, safe observations/pg_stat_statements, atomic/checksum/concurrent migrations and zero-connection cleanup | PostgreSQL 17 / real restricted logins |
| [Identity integration](../apps/api/tests/integration/identity.spec.ts) | 22 | activation/resend/refresh/reuse/current permissions, audit rollback/profile receipts, HTTP CSRF/cookies/logout/drain, actual SMTP through public worker factory, lease/park/backoff/maintenance locks, operator bootstrap/key revoke/replay/least privilege/retention, concurrent failure admission/expiry | PostgreSQL17 / restricted roles, HTTP/SMTP local |
| [Catalog integration](../apps/api/tests/integration/catalog.spec.ts) | 11 | revision/lost-ACK receipts, audit rollback, archive references, immutable publish/unpublish/republish, uncommitted visibility, publish/replace race, import reports, permission revoke, HTTP CSRF/body limit, exact SQL/read/publish diagnostic with provenance | PostgreSQL 17 / restricted roles, local HTTP |
| [Catalog publication regression](../apps/api/tests/integration/catalog-publication.spec.ts) | 6 | initial/republish × exam/question lock crossing close; timeout rollback, repair/same-key retry and receipt replay after close | PostgreSQL 17 / actual concurrent connections |
| [Catalog HTTP regression](../apps/api/tests/integration/catalog-http.spec.ts) | 13 | maximum BMP/astral UTF-8/escaped POST/PUT question and500-membership exam, route overflow, exact OpenAPI responses, impossible dates, auth/RBAC/CSRF | Actual Nest/Fastify / restricted PostgreSQL |

Historical normalization:66 Jest/12 suites +34 Node =100 unit/tooling;30 foundation +22 Identity =52 integration; **152 PASS, none skipped**. Current database suite adds one queued-work drain regression after the persistence evaluation, so the table now lists31 foundation cases. The Catalog increment adds5 policy cases and11 PostgreSQL cases. Focused RED commands temporarily select individual regressions, no permanently skipped baseline. Actual entry-point smoke/operator CLI/diagnostic benchmark are additional script checks, not counted as cases. [Review closure](api-architecture-review.md#7-closure-sau-source-normalization) and [normalization experiment](../experiments/architecture-normalization/README.md) record earlier evidence; [Phase04 review](phase-04-review.md) retains historical142-test evidence. Exam start/save/submit/inbox/SQS and AWS/restore/SLO/cost remain pending; local browser HTTPS was subsequently checked below; local fixtures do not replace those gates.

## Catalog local — 2026-10-07

Grok implementation run: **13 suites / 71 tests PASS**, including the5 Catalog policy cases. Node script tests: **34 PASS**. Together that is105 unit/tooling cases. Root `npm test` also matches two committed Vitest files in `apps/web` and exits1 before the script tests; those files were not edited. One PostgreSQL command then passed **64/64**: database31, Identity22, Catalog11. The first combined run failed only the Identity SMTP case because Mailpit was stopped; after `docker compose up -d --wait mailpit` the same Identity file passed22/22 and the following full run passed64/64. Disposable databases and logins are dropped by the specs. The development database on port55432 was not used.

[Diagnostic](evidence/catalog-2026-10-07/README.md) records25 browse and25 detail projection calls, one `catalog.read` statement each, plus one extra browse, for51 observations,0 errors. It does not include session authentication. It is not an SLO, RPS or AWS result. CAT-10 stays partial until an Assessment start transaction exists.

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

## Independent Catalog review — 2026-10-07

[Review suite](evidence/catalog-review-2026-10-07/review.spec.ts) has6 explicit review cases: post-lock close, valid large question, valid500-question exam, exact detail fields, impossible calendar date, and keyset pagination control. **5 RED / 1 PASS**, outside default Jest discovery; not added to the successful baseline count. [Portable config and commands](evidence/catalog-review-2026-10-07/README.md), [raw expected/actual](evidence/catalog-review-2026-10-07/probes.json).

Fresh review ran63 existing PostgreSQL integration cases PASS; one evidence-writing diagnostic was deliberately deselected to preserve the historical file. Root `npm test` still exits1:71 API cases pass and two Web suites fail under the wrong runner. Node tooling was run independently:34 PASS. Correct Web runner:73 PASS /16 files. Actual Identity HTTPS regression:10 PASS. These checks leave Catalog correctness/contract findings OPEN; historical64/64 evidence above is not a fresh full-suite acceptance of the new negative cases.

## Catalog fixes — 2026-10-07

[Fresh evidence](evidence/catalog-fixes-2026-10-07/README.md) supersedes the open acceptance outcome above while preserving original RED artifacts. Root npm test correctly orchestrates Jest/Node/Vitest:89 API/13 suites +37 tooling +73 Web/16 files =199 PASS. Full restricted PostgreSQL/SMTP:83 PASS/5 suites,0 skipped (31 database,22 Identity,11 Catalog,6 publication,13 HTTP). Shared HTTP regression through actual Identity HTTPS:10 PASS, built migrationCount9. Focused RED selections and the quiet one-case diagnostic select only their targets; they are separate from the complete83-case run.

Catalog policy grew from5 to23 cases (15 calendar,3 Unicode); tooling adds3 report/freeze cases; integration adds19 actual HTTP/concurrency cases. The diagnostic now writes a unique ignored UUID output and never overwrites historical evidence; its generated frozen summary and exact-query plans are [here](evidence/catalog-fixes-2026-10-07/diagnostic/README.md). CAT-10 remains partial for the real Assessment start race, not for diagnostic gaps. AWS/capacity/cost/restore and broader Web acceptance remain separate.

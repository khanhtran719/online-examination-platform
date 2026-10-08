# Test inventory

Baseline cases are not permanently skipped/disabled. Historical review-only probes retain the original RED evidence; current Catalog regressions pass after the fixes below.

| Suite | Cases | Purpose | Runtime |
| --- | --- | --- | --- |
| [Attempt unit](../apps/api/src/modules/assessment/domain/__tests__/attempt.unit.spec.ts) | 13 | restored status/expiration provenance, CREATED/start, exact deadline save/submit, submit duplication, invalid transitions/time, defensive snapshot, grading retry | Jest / pure TypeScript |
| [Assessment policy unit](../apps/api/src/modules/assessment/domain/__tests__/assessment-policy.unit.spec.ts) | 4 | pruned/future idempotency key, selection cardinality, byte-truncated cursor, submission event without answers | Jest / pure TypeScript |
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
| [Assessment integration](../apps/api/tests/integration/assessment.spec.ts) | 10 | concurrent start/quota, observed publish/unpublish locks, frozen republish, atomic save/replay/rollback, submit/outbox failure, deadline after lock, revoked session, byte page, HTTP envelopes/redaction, auth-inclusive diagnostic | PostgreSQL 17 / restricted roles, local HTTP |

Historical normalization:66 Jest/12 suites +34 Node =100 unit/tooling;30 foundation +22 Identity =52 integration; **152 PASS, none skipped**. Current database suite adds one queued-work drain regression after the persistence evaluation, so the table now lists31 foundation cases. The Catalog increment adds5 policy cases and11 PostgreSQL cases. Focused RED commands temporarily select individual regressions, no permanently skipped baseline. Actual entry-point smoke/operator CLI/diagnostic benchmark are additional script checks, not counted as cases. [Review closure](api-architecture-review.md#7-closure-sau-source-normalization) and [normalization experiment](../experiments/architecture-normalization/README.md) record earlier evidence; [Phase04 review](phase-04-review.md) retains historical142-test evidence. Exam start/save/submit now have the Assessment integration row below. Inbox/SQS and AWS/restore/SLO/cost remain pending; local browser HTTPS was subsequently checked below; local fixtures do not replace those gates.

## Catalog local — 2026-10-07

Grok implementation run: **13 suites / 71 tests PASS**, including the5 Catalog policy cases. Node script tests: **34 PASS**. Together that is105 unit/tooling cases. Root `npm test` also matches two committed Vitest files in `apps/web` and exits1 before the script tests; those files were not edited. One PostgreSQL command then passed **64/64**: database31, Identity22, Catalog11. The first combined run failed only the Identity SMTP case because Mailpit was stopped; after `docker compose up -d --wait mailpit` the same Identity file passed22/22 and the following full run passed64/64. Disposable databases and logins are dropped by the specs. The development database on port55432 was not used.

[Diagnostic](evidence/catalog-2026-10-07/README.md) records25 browse and25 detail projection calls, one `catalog.read` statement each, plus one extra browse, for51 observations,0 errors. It does not include session authentication. It is not an SLO, RPS or AWS result. CAT-10 was later closed by the Assessment start race below.

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

Catalog policy grew from5 to23 cases (15 calendar,3 Unicode); tooling adds3 report/freeze cases; integration adds19 actual HTTP/concurrency cases. The diagnostic now writes a unique ignored UUID output and never overwrites historical evidence; its generated frozen summary and exact-query plans are [here](evidence/catalog-fixes-2026-10-07/diagnostic/README.md). At this Catalog-fix point CAT-10 was still partial. The Assessment section below closes that race. AWS/capacity/cost/restore and broader Web acceptance remain separate.

## Assessment core — 2026-10-07

Fresh root `npm test`: 94 API Jest / 14 suites + 37 Node tooling + 85 Web Vitest / 21 files = 216 PASS. The Web count includes uncommitted UI work already in the tree; this increment did not add those UI cases. API growth from the prior 89 is the 4 assessment-policy cases and 1 exact-deadline submit case.

Full restricted PostgreSQL/SMTP on loopback 55438: 93 PASS / 6 suites, 0 skipped. That is the prior 83 plus 10 Assessment cases. Mailpit 11025/18025 was healthy, so the Identity SMTP case passed in the same run. Port 55432 was not used. The development database was not migrated or truncated.

[Diagnostic summary](evidence/assessment-2026-10-07/summary.md) is generated from raw run `32982df5-10c4-4e5d-aecc-fb0e3cde5938`. Two earlier JSON files from the same day stay in that directory. Queries include auth, CSRF, admission and the unit of work. Actual/ceiling: start 13/12, questions 4/4, answers 4/4, save 18/11, submit 13/10, status 3/3. Sample sizes are 1, 6, 4, 6, 1 and 18 because the actor write burst is 20 and the read burst is 30. Missing larger samples were not padded. This is not capacity, SLO or AWS evidence. OpenAPI ceilings were not raised.


## Web UI increments — 2026-10-07

The [foundation](web-ui/foundation-implementation-2026-10-07.md), [onboarding/catalog](web-ui/onboarding-catalog-implementation-2026-10-07.md) and [assessment/results](web-ui/assessment-results-implementation-2026-10-07.md) reports retain their named scopes. Phase3 final run observed **86 Web cases /22 files** and20 default Chromium browser cases. Root run observed94 API +37 tooling +86 Web =217; API includes simultaneous Assessment work outside this Web UI scope. Earlier counts remain historical.

| Added/expanded suite | Cases / scope | Runtime |
| --- | --- | --- |
| [Shared fields](../apps/web/src/shared/ui/__tests__/fields.unit.spec.ts) | 3 added in foundation: native fields, helpers/errors and password controls | Vitest / React Testing Library |
| [Check email](../apps/web/src/features/auth/__tests__/check-email.test.tsx) | 2: generic recovery without an address and generic202 resend | Vitest / React Testing Library |
| [Dashboard](../apps/web/src/features/catalog/__tests__/dashboard.test.tsx) | 2: partial history has no invented totals; frozen title respects exam owner | Vitest / React Testing Library |
| [Question view](../apps/web/src/features/assessment/__tests__/question-view.test.tsx) | 3 total, one added: native fieldset/legend and locked selection; plain-text and clear regressions retained | Vitest / React Testing Library |
| [Status](../apps/web/src/features/results/__tests__/status-page.test.tsx) | 2: route change clears prior attempt; stopped failed polling restarts only on manual request | Vitest / React Testing Library |
| [Released review access](../apps/web/src/features/results/__tests__/review-access.test.tsx) | 1:403 clears released keys/explanations and cached payload after permission revocation | Vitest / React Testing Library |
| [Leaderboard refresh/access](../apps/web/src/features/results/__tests__/leaderboard-refresh.test.tsx) | 2: refresh resets paged snapshot;403 removes rendered and cached rows | Vitest / React Testing Library |
| [Foundation browser](../apps/web/e2e/foundation.e2e-spec.ts) | 4: mobile navigation/capability and keyboard controls/table/dialog focus | Playwright / Chromium |
| [Onboarding/catalog browser](../apps/web/e2e/onboarding-catalog.e2e-spec.ts) | 2: verification recovery and catalog Back/filter/start cancellation | Playwright / Chromium |
| [Assessment/results browser](../apps/web/e2e/assessment-results.e2e-spec.ts) | 2: native three-type answers→ACK→submit→result→released review; narrow keyboard tables and pseudonym boundary | Playwright / Chromium / synthetic fixtures |

Browser20 includes4 existing regression +8 public experience +4 foundation +2 onboarding/catalog +2 assessment/results cases. Identity HTTPS10 are a separate suite and were not rerun by phase3. These increments do not accept live Assessment/Reporting UI, WCAG/CWV, AWS or production gates.

## Web UI Admin increment — final2026-10-08

[Phase4 report](web-ui/admin-implementation-2026-10-07.md) / [evidence](web-ui/evidence/admin-2026-10-07/README.md): fresh root run **94 API +37 tooling +93 Web /23 files =224 PASS**. The new [Admin workflow suite](../apps/web/src/features/admin/__tests__/admin-workflows.unit.spec.ts) has7 cases: state/picker duplicate protection; edit-route hydration;403 DOM/cache removal; native keys/type-loss confirmation; oversized file before read; dry-run→explicit import/distinct key; question archive confirmation/revision. Six cases observed RED before implementation, archive observed RED separately, all7 GREEN.

[Admin browser suite](../apps/web/e2e/admin-workflows.e2e-spec.ts) adds4 flows to the20 previous cases: create/reorder/save/publish/unpublish/archive; keyboard keys/type conversion/question archive; import invalidation/confirmation/report; audit focus/table scroll and replay pending/capability filtering. Final Chromium **24 PASS,0 skipped/flaky/retries**. Visual **31 states ×5 widths =155 probes**,62 axe scans with0 serious/critical,0 document overflow/page errors/external requests; CSS zoom200% and reduced motion verified for3 states. Live Admin/Reporting, full lost-ACK/conflict browser matrix, option reorder, Firefox/WebKit, WCAG/CWV and production remain open. Identity HTTPS10 and PG integration were not rerun in this UI increment.

## Independent Assessment review — 2026-10-08

[Review fixture](evidence/assessment-review-2026-10-07/review.spec.ts) is evidence-only and separately selected by [config](evidence/assessment-review-2026-10-07/review.jest.cjs); not a new default green suite. Final9 cases:6 expected RED assertions for5 findings and3 passing controls (one control contains4 observed save/submit races). Fixes must bring these regressions into supported suites and close with new evidence. Fresh root217 (94 API/37 tooling/86 Web), existing PG/SMTP90 with3 diagnostic writers deliberately deselected, HTTPS10 PASS. The review adds real two-UnitOfWork save competition but does not accept Assessment process restart/lost ACK, scheduler or full result/worker flows.

## Assessment fixes — 2026-10-08

[Supported Assessment suite](../apps/api/tests/integration/assessment.spec.ts) now23 cases:10 existing,12 transferred/expanded review regressions and controls,1 real HTTP admission-security matrix. It binds each Identity service to its own UoW; diagnostics use25 actors/independent attempts/100 questions and append-only ignored outputs. Archived harness remains evidence-only. Final full PG/HTTP/SMTP105 PASS/6 suites with1 historical Catalog writer deselected; actual Identity HTTPS10 PASS. [Evidence](evidence/assessment-fixes-2026-10-08/README.md).

[Identity admission unit](../apps/api/src/modules/identity/application/services/__tests__/identity-write-admission.unit.spec.ts) adds8 authorization/fallback/credential checks; Assessment policy adds2 canonicalization/byte-bound cases. API104 PASS/15 suites; tooling37 PASS; Web93 PASS/23 files, including unrelated concurrent UI additions. Root234 PASS. These checks close AR-01–05 local acceptance and CAT-09/10, ATT-01–04, not Assessment process-restart/lost-ACK or AWS acceptance.

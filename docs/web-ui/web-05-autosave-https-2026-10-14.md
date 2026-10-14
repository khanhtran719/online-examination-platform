# WEB-05 — Autosave HTTPS/API/PostgreSQL

Ngày2026-10-14. COMPLETE locally. Web/tablet, mobile/app deferred.
Owning feature Assessment; transport live adapter. API save authority Assessment
via Identity, UoW + attempt lock + frozen option validation + durable idempotency.
No endpoint/schema/dependency/resource change.

- [x] S1 — Inspect coordinator/contracts/tests/rules/retention; plan bounded scope.
- [x] S2 — Named actual HTTPS fixture/test config, safe observation and fault control.
- [x] S3 — Clean-room budget, debounce/periodic flush, bounded batches/single flight,
  exact ACK/new local draft and durable PostgreSQL witnesses.
- [x] S4 — Actual dependency503/admission429, hinted backoff/bounded exhaustion,
  offline/explicit recovery; reproduce and fix defects at owning feature if found.
- [x] S5 — Relevant checks/self-review, status/evidence, cleanup/protected assets.

## Execution plan

Reuse WEB-04 actual registration/SMTP verification/UI login and23-question
published seed, with immutable live/API snapshots and disposable migrated PG/
restricted runtime. No fake accepted responses. Selected options/marks remain
memory drafts until real save receipt. Compare PG version/selection/mark and
request payload/key only in test memory; retained observations are counts,
normalized labels/status and timings, not answers/body/cookies/credentials.

Exercise deterministic browser scheduler using Playwright clock only after
loaded attempt scope; server keeps real database time. Test real wall-time clean
and debounce separately. Delay a real backend ACK to witness durable PG effect
without falsely labeling newer local intent saved. Use actual PG privilege fault
for503 and actor.write admission state for429; optional Retry-After inserted by
test proxy is explicit because current API omits it. Restore faults in finally.
No production fault or AWS deployment is authorized by these disposable tests.

Capture1–20 dirty questions, one transport at a time, stop retries after configured
1/2/4/8/16s + jitter schedule, preserve immutable intent through explicit recovery.
Full multi-tab conflicts/lost submit ACK/deadline/worker/results gates remain
WEB-06+. Basic immutable save retry is required to prove this pipeline, not closing
all mutation race combinations. Raw outputs ignored/local, inspected and retired;
approved templates/source/previous reports retained. No baseline reset to hide diffs.

## Result and fix

WEB-05 is locally complete. Autosave keeps a bounded request schedule and labels
saved only after the captured intent is acknowledged. The discovered defect was
in retry recovery: final exhaustion discarded Retry-After, while online and
same-actor reauthentication could silently restart a consumed retry budget.

Independent TDD reproduction in `autosave-backpressure.unit.spec.ts`:7 cases,
**5 FAIL/2 PASS** before correction, reproduced again by the main agent. Fix stays
in pure Assessment `autosave.ts`, using its existing retryAtMs/exhausted fields:

- Keep the latest server minimum even when automatic attempts are exhausted.
- Online and same-actor reauth restore transport eligibility without clearing
  exhausted. A non-exhausted401 still resumes the same intent after reauth.
- Explicit rearm keeps key/body/captured sequences, with retry time at least
  max(now, server minimum). An early click schedules recovery without early PUT.
- ACK continues to clear only captured local sequences; a newer edit survives
  and the next new intent uses the confirmed version and a new key.

After correction,61 Assessment unit cases PASS including all7 new regressions.
Existing tests/thresholds were preserved. No new retry layer, global state store,
persistence abstraction, feature capability or technical dependency was added.
Save retry behavior remains bounded; an explicit attempt that fails after the
consumed budget returns to unconfirmed rather than creating another automatic cycle.

## Harness and authority

Added named `scripts/autosave-https.mjs`, root/Web npm commands, Playwright config,
fixture/spec/reporter and isolated `playwright.web05-regression.config.ts`.
Reuses WEB-04 actual23-question published dataset, registration/email worker SMTP,
browser login and immutable API/live assets. Seed permissions use existing audited
server-side operator function; all question/exam publication writes remain actual
Catalog API calls. Browser never grants a role or fabricates acknowledged answers.

Shared test fixture now exposes finite actor.write and actor.read fault helpers
through one parameterized local function. Scope strings are internal constants;
subject is HMAC-derived using fixture-memory key, not a metric label/raw actor ID.
Existing actor.read behavior was checked by all7 Catalog HTTPS cases, including
actual429/full60-second fallback and explicit recovery. Runtime limiter unchanged.

Faults are explicit: revoke SELECT on one disposable DB's Assessment answers table
for actual503; alter actor.write admission state for actual429; hold an actual200
ACK; control browser online state. Each permission/admission fault is restored in
finally. Server still authenticates/authorizes, obtains current PostgreSQL time,
locks the attempt and commits answer + receipt atomically through existing ports.

Initial actual suite had6 cases: first run3 PASS/3 FAIL. Clean/debounce,20+3 batching
and offline were green; other failures were harness assumptions, not product proof.
Playwright Node route.fetch did not share Chromium's leaf-SPKI trust, and the new
write-admission helper was absent. TLS validation remained enabled. Controlled
fault forwarding now uses the existing Node helper with ephemeral CA/SAN validation,
exact browser body/idempotency key/CSRF context and actual backend response.
No generated accepted DTO or fake durable state is fulfilled. Only response timing
or advertised Retry-After is modified by the test. Browser/native200 paths remain
unintercepted in clean/batch/offline/conflict cases.

Current API omits Retry-After on429 and this PG503. Tests inject3s/60s advice only
into the controlled response to exercise client minimums. They do not prove that
production API advertises those waits. Without advice, current bounded jittered
schedule still applies. No OS CA install or global certificate bypass.

Playwright clock controls only client timers/performance time after scope loading,
for periodic flush and long retry schedules. PostgreSQL/server clock and admission
remain real;425ms real gaps prevent accidental seed/retry admission collisions.
The clean/debounce, held ACK, offline and409 cases use real wall time. A clock
accelerated test is not latency/load/recovery-time evidence for production.

## Actual HTTPS observations

Final **7/7 PASS**, recorded2026-10-14 06:16:46 UTC, one worker/retries0.
Earlier corrected6-case run also passed; it is not six additional distinct cases.
Final basic409 was added before the full7 run. Final measured debounce613ms;
previous6-case run688ms records ordinary local variation, not an optimization gain.
Configured500ms debounce is observed through the250ms scheduler and UI timing.

| Gate | Observation and PostgreSQL witness |
| --- | --- |
| Clean/debounce |2.5s clean:0 PUT. Rapid choice/mark/choice edits:1 PUT for1 dirty question,162-byte JSON, after613ms from last completed UI interaction. ACK leaves version1/mark/latest option;1.5s later0 extra PUT |
| Batch/flush |23 dirty marks:20+3 distinct questions,2 keys,2233/346-byte JSON bodies.500ms gate then bounded periodic flush;23 rows version1,marked=true, no selected options.20s controlled clean interval adds0 PUT |
| One flight/late ACK | Real backend commits A version1 while its200 response is held; UI shows saving. New B stays local, no second flight before release/no false saved. After release, new key/version1 mutation ACKs B version2 |
|503/back-pressure |6 actual failed saves = initial +5 retries. Exact key/body reused. Final60s advice retained; online event does not auto rearm. Early explicit retry sends0 early PUT; later same intent succeeds once, version1 |
|429/admission | Actual denied save creates0 answers; test3s hint blocks early retry across online event. Restored admission + same key/body succeeds once, version1 |
| Offline/tablet |768px offline choices remain memory-only with warning,0 PUT and0 PG rows. Reconnect sends1 request, ACK/version1 |
|409/conflict | Prior real API answer version1 followed by stale UI expectedVersion0 returns409. Compare dialog retains local B/server A and enables explicit decision; conflicted control disabled.0 automatic overwrite, server selection/mark/version1 intact |

Final sanitized proxy observations:237 actual HTTP completions and237 requests,
including save statuses200×9,409×1,429×1,503×6. These include setup/protocol witness
writes; do not confuse them with candidate interaction-only counts. No raw ID,
query/body/answers/cookie/password/email link appears in retained diagnostic labels.
Immutable keys/payload comparisons remain test-memory only.

Payload sizes are JSON body bytes, not wire cost or a complete bandwidth budget.
Bounded query traffic was checked in WEB-04's explicit question/answer pages and
existing controller tests; this increment measures autosave write requests, not
SQL statements/DB round trips, CPU/request or sustained RPS. Those performance/
query-plan/pool/FinOps gates remain pending. No AWS savings claim.

## Validation and self-review

- Root `npm test`: **965 PASS** =492 API/53 suites +70 tooling +403 Web/71 files.
  The7 new reducer cases are included, not counted again. Assessment61 subset PASS.
- Final root lint/quality/contracts48 operations/445 examples, format check,
  scoped E2E ESLint/Prettier and API/live/demo build PASS. Typechecks are in builds.
- Actual regression: Assessment8 PASS (06:14:33 UTC), Catalog7 PASS (06:19:54 UTC),
  Identity10 PASS on the changed shared fixture. Separate receipts, not demo proof.
  Identity checks include TLS/cookies/CSRF, verification, shared-cookie refresh,
  lost ACK, profile, disable and API restart; no new Identity behavior.
- Full UI Chromium: **81 PASS**,0 skipped/unexpected/flaky,retries0,1 worker;
  391.923s starting2026-10-14 06:13:53 UTC. Expected API-unavailable live preview
  probes log ECONNREFUSED and pass honest fallback assertions. No live-to-demo fallback.
- 26 Exam Room visual probes have0 WCAG-tagged axe violations. Representative
  1440px room and768px question-sheet images directly inspected, no layout change.
  Existing narrow-screen regression cases remain in the suite; they do not accept
  new mobile/app scope or manual assistive technology/other browser engines.
- Full427 backend PostgreSQL integration tests were not rerun: backend business/
  SQL adapters/migrations unchanged. Actual HTTP/PG checks here do not replace them.
- SQL in new test witnesses and admission helper follows conventions102.1;
  scope parameterization was intentional, not described as formatting-only.
  Applied/checksummed migrations and archived benchmark evidence unchanged.
- R-58/59/workflow47–48 reviewed: owning feature pure coordinator, infrastructure
  behind existing live adapter, no Application/Domain framework leak, no direct
  browser DB access, no scoring/deadline authority change. Event/outbox unchanged.
- **1.867 protected files retain SHA-256**: approved templates/prompts/images,
 existing source/tests, backend/contracts/migrations/lockfiles and prior reports.
 Only declared mutable reducer/shared test fixture/manifests/status docs changed;
 new test/config/runner/report files reviewed separately. No baseline reset.

## Cleanup and reproduction

Normal complete runs removed all disposable databases/roles/temp keys/assets.
Final read-only local audit: **0 fixture databases,0 fixture roles,0 temporary
fixture folders**. PostgreSQL/Mailpit stopped; existing Docker volume retained.
Hard kill can interrupt finally: inspect exact owned `identity_https_` DB,
`https_ddl_/api_/mail_` roles and `exam-identity-https-*` temp folders before cleanup;
remove only verified owned leftovers, never unrelated databases or secrets.

Inspected raw outputs retired: **762 files/54.746.777 bytes**,327 PNG/435 JSON from
WEB-05 UI/autosave, WEB-04/03 regressions and Identity. Additional5 local validation
logs/snapshot files/267.340 bytes retired. Approved templates, source tests/config,
authored Markdown and historical security/DB/benchmark evidence retained. These
reports retain run results; no current raw gallery or Git-history purge claim.

Environment: Node24.17.0, Chromium153.0.8010.12, darwin/arm64, PostgreSQL17 and19
built migrations. Requires Docker and installed pinned browser/dependencies.

```sh
npm run test:autosave:https
npm run test:assessment:https
npm run test:catalog:https
npm run test:identity:https
npm test
npm run lint
npm run format:check
npm run web:build:demo
```

After fresh live/demo builds, from `apps/web`:

```sh
npm run test:e2e -- --config playwright.web05-regression.config.ts
```

Run actual HTTPS suites serially because each owns the shared local Compose stack.
Normal runner builds actual API/live assets, starts PG/Mailpit, runs tests and stops
dependencies. Ignored WEB-05 output is `.local/web-evidence/web-05`; corresponding
regression/Identity outputs follow their existing named configs. Inspect then retire;
keep authored reports/runbooks and source. No commit/deploy performed.

## Delivery status and next scope

WEB-05 checked locally; product **92/217 checked,125 pending**. FE7/32 remains:
FE-15 still has actual timeout/deadline matrix in WEB-06/07, despite batching,
back-pressure/ACK/offline now verified; FE-16 full two-tab reconciliation is open.
Basic409 presentation here does not close conflict decisions or concurrent races.

Next bounded **WEB-06**: actual lost start/save ACK and immutable receipt retry,
API restart/late ACK with new intent, same-actor two-tab stale versions and explicit
conflict reconciliation. Full save-submit concurrency belongs with WEB-06/07;
countdown/deadline/manual/auto-submit WEB-07; scoring/status/result/review/history/
leaderboard WEB-08. Live Admin authority, RV-06, browser/manual AT/zoom, mobile/app,
AWS/SLO/capacity/pool/cost/restore/production remain open. Production NOT ACCEPTED.

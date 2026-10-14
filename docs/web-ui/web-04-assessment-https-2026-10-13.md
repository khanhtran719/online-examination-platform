# WEB-04 — Actual Assessment browser integration

Ngày2026-10-13. COMPLETE locally. Web/tablet768/1024/1280/1440; mobile/app deferred.
Owning feature `assessment`; start orchestration `catalog`; actual authority
Assessment/Identity with Catalog-owned frozen publication. No new endpoint,
resource, schema or runtime abstraction was added.

- [x] A1 — Read rules/contracts/controllers/tests/retention; classify and plan.
- [x] A2 — Reuse disposable TLS/AppModule/PG fixture; actual verified actors,
  Catalog publication provisioning and sanitized Assessment observation labels.
- [x] A3 — Native three-type answer/mark/clear/empty, section navigation,
  explicit bounded question/answer pages and server-acknowledged reload at4 widths.
- [x] A4 — Frozen publication after republish, active/idempotent start/resume,
  API restart and ownership/permission denials without private-data leakage.
- [x] A5 — Relevant checks/self-review; record exact results, synchronize status,
  inspect/retire local artifacts and verify cleanup/protected source/templates.

## Execution plan

Add a named Assessment HTTPS runner/config with one serial worker/retries0.
Use immutable actual API/live assets, disposable migrated PostgreSQL and restricted
runtime roles, real registration/verification SMTP and browser login. Seed admin
is authorized server-side with audited operator function; all question/exam writes
and publication changes use actual API. No fake API fulfillment or Web role preset.

Keep question IDs/options from frozen responses distinct from bank identities.
Inspect actual HTTP envelope/no-store/correlation metadata and persisted answers,
selections/version/marked state. Pagination is explicit, bounded and actor/attempt/
page-size scoped. Frozen attempts must keep their original prompt/options/deadline
when a new exam version is published. Direct reload may use safe version/section-ID
fallback labels because the current API does not return frozen title metadata.

Do not widen WEB-04 into full debounce/backoff/multi-tab/save-submit races/lost
mutation ACK/deadline expiry/scoring/result delivery. Basic durable save ACK is
necessary here to prove controls and reload, not full WEB-05 acceptance. Reproduce
any discovered defect before correction at its owning boundary, then expand checks.
Never claim DB round-trip/saturation/performance/cost results from browser counts.

Preserve previous uncommitted work and approved templates. Retain only authored
Markdown reports/runbooks and source test/config; raw outputs go to ignored
`.local/web-evidence/web-04` and are inspected then deleted. Normal finally must
close servers/DB/roles/temp keys; audit interruption leftovers explicitly.

## Implementation và authority

Added `scripts/assessment-https.mjs`, named Playwright config và Assessment-owned
E2E fixture/spec/reporter; root/Web npm scripts expose `test:assessment:https`.
Reuse existing Identity HTTPS fixture and pure Catalog account/login/request-key
helpers without changing them. No runtime API/frontend source, dependency,
lockfile, SQL adapter, migration, permission contract or AWS resource changes.
The only shared tooling behavior change is normalized test-observation routes for
attempt/questions/answers/status/submit/result/review and Admin question writes.
New tooling case first failed with `unmatched`, then all4 route-label cases PASS.

Fixture provisions23 bank questions and3 published exams using actual Catalog
writes/publish, respecting real actor.write admission intervals. A server-side
operator grants only the disposable seed actor Admin via audited existing function.
Candidates register/verify through actual API/SMTP worker and log in through UI.
Native exam:3 questions across2 sections,2 points each. Paged exam:23 across12/11;
frozen exam:1 question. Options and question IDs are taken from frozen responses,
not bank identities. Duration1800s, open schedule/attemptLimit2; no backend clock
or immutable publication mutation. Republish uses real bank/exam edit + publish.

Same-origin HTTPS reverse proxy forwards to actual AppModule with migrated
PostgreSQL/restricted runtime role; immutable live build and API digests captured.
Ephemeral asymmetric/TLS keys, SAN validation and one-leaf browser SPKI trust;
no global certificate-error bypass, OS trust installation or external email.
No route.fulfill response or fabricated durable state. PostgreSQL reads witness
answers/selections/version/mark; only permission revocation is an explicit DB
fault fixture. Neither scoring nor result worker is simulated to close this gate.

## Actual results

Final full suite: **8/8 PASS**, one Chromium worker/retries0, recorded2026-10-13
15:11:33 UTC. Includes four separately isolated candidate/viewport cases;
35,293s is the sum of test durations, not wall time, throughput or a benchmark.
Four WCAG-tagged axe scans report0 violations, document overflow0 and page errors0.
No screenshots/traces/video/auth-form snapshots were captured.

| Gate | Actual behavior and durable evidence |
| --- | --- |
| Start/empty | Browser confirmation receives201; no initial persisted answers, native controls unchecked and Clear disabled |
| Three types | Single B, Multiple A+B and True/False Sai persist matching frozen option IDs; only server ACK reaches saved state |
| Mark/clear | Multiple mark persists; clearing removes all selections, retains mark and advances version; marked-only sheet shows exactly that question |
| Navigation | Keyboard Next focuses the new prompt; section shortcut selects first question of the second section; tablet uses real question-sheet dialog |
| Reload | Acknowledged choices/mark/cleared state restored at all4 widths; original deadline/version retained; missing exact metadata uses explicit version/section-ID fallback |
| Pagination |20 questions/20 persisted answers first; explicit load produces23 questions/21 answers via exactly2 browser GETs per collection; no eager full read |
| Cursors | Wrong pageSize and question-cursor used for answer collection return400; ordinals remain global23 across12/11 sections; known absence enables unchecked empty controls |
| Active/idempotent start | A second browser start resumes same attempt; a fresh key returns same active attempt; repeated same key returns201 + replay header and equal DTO; PG count1 |
| API restart | Same durable attempt/deadline and acknowledged selection restored after restarting actual AppModule |
| Frozen publication | Old browser attempt keeps original prompt/options/version/deadline after republish; a separately verified actor starts new version with changed prompt |
| Privacy | Anonymous attempt/questions/answers return401; nonowner returns404 for all3 and browser hides the room; question JSON contains no answer key/explanation/official score |
| Permission | Revoked actor's mounted save returns403; loaded question/controls disappear; resume/questions/answers also403 |

Request counts are bounded browser-call observations; no claim about SQL query
counts, CPU/request, database saturation, sustained capacity or AWS savings.
Large500-question/byte-budget and wider faults retain their existing source tests
and separate acceptance scope; this dataset has23 questions, not millions of rows.

Initial harness run:6 PASS,1 assertion FAIL,1 timeout. The failing assertion
compared serialized JSON property order; replay from PostgreSQL JSONB preserves
DTO values, not insertion order. It now compares parsed DTOs. Reload after role
revocation correctly failed `/v1/me`403 before any attempt read, so waiting for
an attempt response was wrong. The corrected case revokes while mounted, triggers
actual save403 and asserts private-data removal plus denied direct reads. These
were test assumptions; no application defect/fix was required. A subsequent8-case
suite passed. Final suite reran after SQL-only formatting and adding anonymous401
and nonowner-browser assertions; all8 passed again, not16 distinct cases.

## Validation and self-review

- Root `npm test`: **958 PASS** =492 API/53 suites +70 tooling +396 Web/70 files.
  The new route-label case is included, not an extra case counted twice.
- Root lint/quality/contracts48 operations/445 examples and format check PASS.
  Scoped E2E ESLint and Prettier checks PASS on final test source.
- API/live Web build PASS through final runner; live typecheck included in build.
  No app source changes; demo build/full81 UI, Identity10 and Catalog7 were not
  rerun in WEB-04. Their WEB-03 receipts remain historical, not fresh results.
- Full427 PostgreSQL integration cases were not rerun; actual HTTP/PG witnesses
  above cover this increment, not the whole backend matrix.
- SQL fixture layout follows conventions102.1; token comparison for3 formatted
  executable queries PASS. Applied/checksummed migrations untouched.
- R-58/59 and workflow47/48 reviewed: Assessment retains ownership, UoW/locks/
  idempotency/frozen-version boundaries unchanged; no direct Web DB access or
  business import of technical implementation. SQL witness is test code only.
- 1.546 initially protected source/template/binary-evidence files retain SHA-256;
  315 untouched document/template/report files were also protected before status
  updates. All **1.861** unchanged, including prior uncommitted PORT-06C/WEB-03,
  Identity fixtures, approved design prompts/images, backend and lockfiles.

Normal finally closes disposable servers, DB/roles and temporary keys/assets;
new diagnostic writing is wrapped so a write failure still invokes harness close.
Final read-only namespace audit:0 fixture databases,0 fixture roles,0 temporary
fixture folders. Owned PostgreSQL/Mailpit stopped; existing Docker volume retained.
Hard termination can still interrupt finally: inspect exact `identity_https_` DB,
`https_ddl_/api_/mail_` roles and `exam-identity-https-*` temp resources before
removing only confirmed owned leftovers. Never blanket-drop unrelated resources.

Raw browser outputs inspected then retired:4 files/252.855 bytes. Local validation
logs/snapshot/token witness also removed:5 files/274.726 bytes. Keep this authored
report, source tests/config, prior reports and all approved templates. No current
raw screenshots/gallery, no Git history rewrite or commit/deploy.

## Reproduction and remaining gates

Requires Node24, Docker and installed pinned Chromium/dependencies. From root:

```sh
npm run test:assessment:https
npm test
npm run lint
npm run format:check
```

The runner builds API/live Web, starts local PG/Mailpit, runs serial actual-browser
cases and stops dependencies. Redacted summary/boundaries/observations live only
under ignored `.local/web-evidence/web-04`; inspect and retire after use. Source
fixtures recreate the dataset; do not reuse production URLs or real user data.

WEB-04 closed locally; product **91/217 checked,126 pending**. FE7/32 remains:
FE-13 still needs actual lost-start-ACK; FE-14 retains broader read-fault/session/
late-response matrix, despite owned loading/three types now verified. Next bounded
**WEB-05**: actual debounce/batch/write budget, no-write clean room, saving/saved/
failure/back-pressure recovery. Immutable retries, multi-tab conflicts and submit
races remain WEB-06; deadline/reconnect/manual/auto-submit WEB-07; scoring/polling/
results/review/history/leaderboard WEB-08. Live Admin authority, RV-06, broader
browser/manual AT/zoom, mobile/app, AWS/SLO/FinOps/production remain open.
Production NOT ACCEPTED; local HTTPS success is not public PKI or AWS acceptance.

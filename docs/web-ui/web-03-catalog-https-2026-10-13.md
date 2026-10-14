# WEB-03 — Actual Catalog browser integration

Ngày 2026-10-13. COMPLETE locally. Web/tablet768/1024/1280/1440; mobile/app deferred.
Owning frontend: `features/catalog`, existing live adapter; backend read authority:
Catalog + Identity. Harness + feature read-control fix; no new endpoint/schema/resource/permissions
discovery. WEB-04+ full attempt workflow and live Admin stay separate.

- [x] W1 — Inspect contracts/controllers/SQL projections, existing HTTPS fixture,
  source/tests/retention; classify and plan scope.
- [x] W2 — Disposable actual HTTPS/AppModule/PG fixtures with verified accounts,
  operator-authorized seed via API, safe observation labels; isolated cleanup.
- [x] W3 — Browser browse/detail/category/pageSize/cursor/loaded-only search,
  empty and publication replacement; no N+1 reads or leaked keys/explanations.
- [x] W4 — Actual401/403/429/unavailable/invalid-expired cursor recovery;
  open/close/attempt-limit start rejection without creating extra attempts.
- [x] W5 — Relevant regression/static/build checks, self-review, report/status;
  inspect and retire local raw outputs, preserve templates/prior work.

## Execution plan

Reuse existing local Identity HTTPS boundary with immutable live/API build
snapshot, complete migrations, restricted runtime role, ephemeral certificate
SPKI pin and disposable DB/roles. Preserve Identity10 tests and existing cookie/
CSRF authority. Extend test observations with normalized Catalog route labels,
never IDs/query tokens/body/cookies. Start Docker's existing PostgreSQL/Mailpit
dependencies; stop owned test stack after run. No public PKI/AWS acceptance.

Register/verify through actual API + worker SMTP, log in using actual browser
UI. Fixture operator grants only server-side seed actor; live Web still cannot
infer Admin rights. Publish seed questions/exams through actual Catalog API.
Use database mutations only for explicit controlled fault fixtures (revocation,
rate admission and unavailable dependency), record them separately from natural
runtime behavior. Never call route.fulfill to claim actual backend acceptance.

Meaningful harness unit tests before new observation logic. Browser tests inspect
real JSON/header/status, native UI and PG state; transport fault injections must
still reach real backend where claimed. Scope checks include future/closed
schedule and exhausted quota on start, not full scoring/worker/autosave acceptance.
Current Public/PORT-06C uncommitted work is protected and not reverted/committed.

If runtime checks reveal product defects, reproduce first and fix at owning
controller/adapter boundary. Expand required reads/checks before widening scope.
Do not tick WEB-03 solely because scripts exist or demo suite passes.

## Implementation và dữ liệu

`npm run test:catalog:https` builds actual API/live Web, starts existing local
PostgreSQL/Mailpit compose, runs serial Chromium tests and stops the dependencies.
Fixture copies immutable asset/API digests, migrates a disposable database with
restricted runtime/mail roles and creates ephemeral asymmetric signing/TLS keys.
Chromium trusts only one leaf SPKI; Node verifies the CA/SAN. No global certificate-error
bypass, OS CA installation, AWS resource, public domain or dependency is added.

Seed actor is registered/verified by real HTTP + worker SMTP, then granted Admin
server-side through existing audited `identity.operator_admin`. Seed uses actual
Catalog create/publish APIs and respects write-admission timing. Browser candidates
are verified separately and log in through UI; no Web role preset or JWT role parsing.
Dataset:1 private bank question,22 regular published exams +3 scheduled/quota
publications,1 draft and1 archive.25 visible publications exercise default20 and
pageSize100. An additional short-lived publication closes naturally for start
rejection. Neither frozen publications nor backend clocks are edited to simulate
expiry. Initial attempt to publish an already-closed fixture correctly returned422;
the fixture was corrected, not the invariant.

Faults are explicit: permission/session revocation and actor.read admission state
in the disposable DB; expired signed cursor injected into a browser request that
still reaches the actual backend; REVOKE/GRANT of one Catalog SELECT privilege to
exercise actual PG failure/503 safely. There is no route.fulfill of API responses.
The cursor signing key stays in fixture memory, never browser JS/artifacts. Proxy
observations retain normalized route labels/status, no query tokens/body/cookies.

## Findings và remediation

Browse/detail, bounded pageSize/cursor, loaded-only search, category/Back/empty,
new publication reads, permission403 and session401 already worked on actual
HTTPS/PG. Last-successful detail retained after publication404 is explicitly
labeled; starting is checked again by the server and rejected422. Republish
returns version2 with the new title; old frozen data is not overwritten.

Runtime429 exposed missing Catalog cooldown: manual refresh stayed enabled and
filter/page-size/reconnect could bypass a wait. Actual focused RED reproduced
enabled refresh after429. Independent unit reproduction against the pre-fix
`use-catalog.ts` HEAD snapshot:9 FAIL/2 PASS; the owned new controller was restored
in finally. GREEN:11/11 tests, then full root suite955 PASS (492 API/69 tooling/
394 Web). Includes immediate double refresh, preserved cursor snapshots, URL
Back, category/pageSize, reconnect,2/3s wait,60s fallback, detail refresh and old
actor late-response fencing. Existing tests were not weakened.

New feature-owned `use-catalog-wait` keeps a monotonic, actor/auth-scoped mounted
deadline and rejects late wait updates. HTTP work remains behind PlatformApi.
QueryFn and synchronous handlers gate early requests; expiration only enables
explicit retry. No default reconnect/focus/expiry retry, global store, permission
authority or shared UI runtime dependency is introduced. Detail exposes finite
`refresh()` instead of views calling raw query.refetch. Read controls respect
wait; loaded-only local search stays usable.503 with advertised wait also uses
this gate;503 without advice remains an explicit bounded read retry.

Actual API currently omits Retry-After on429; OpenAPI declares it but does not
require it. Fixture initially assumed the header was mandatory and was corrected.
Client applies a conservative60s fallback when absent/invalid; exact advertised
waits are verified by unit cases. No API/body/header contract change or limiter
policy change. A future server admission-wait projection needs its own contract/
evidence; this increment does not claim optimal retry latency or cross-tab/route
coordination. No bank keys/explanations are exposed by Catalog reads.

## Actual browser results

Full actual Catalog run:7/7 PASS, recorded2026-10-13 14:14:41 UTC. Serial/retries0;
positive browse/detail probes at768/1024/1280/1440 have0 full-axe findings and0
document overflow. Browser request count proves no per-row detail fetch; only4
explicit detail reads for4 widths. This is not a measured DB saturation/query
plan or performance/cost benchmark. Existing optimized SQL/read projection remains.

| Gate | Actual behavior / durable observation |
| --- | --- |
| Browse/detail |20 first-page rows,25 unique after cursor;100 page ends without phantom next; no-store JSON/correlation header; exact version/section/point totals |
| Filter/search |3 TOEIC,0 IELTS, URL Back restores filter; local search sends no request; draft/archive absent |
| Cursor | Actor/filter/pageSize-bound; tampered/expired400; explicit restart from page1 recovers without duplicated rows |
| Publication | Unpublished404, stale projection labeled, start422/no new attempt; republish new title/version2 |
| Permission/session | Actual role revoke403 and family revoke401 clear rows; no denied refetch; explicit new scope required |
| Back-pressure | Actual429 lacks header;60s fallback blocks early retry; only explicit later refresh, no automatic requests |
| Dependency | Actual PG SELECT denial503 returns safe text, preserves labeled snapshot; restored privilege + explicit retry recovers |
| Start guards | Server not-open/closed/attempt-limit422 visible; one real started/submitted fixture attempt, no extra starts |

Identity HTTPS regression:10/10 PASS on the same updated shared fixture. Covers
TLS/API-vs-SPA, Secure/HttpOnly cookies, explicit mail verification/final password,
Origin/signed CSRF, shared-cookie refresh, lost ACK, profile receipt, disable,
API restart and stalled response body. This is local TLS/PG/SMTP proof, not AWS SES
or public-PKI acceptance. Full427 backend PG integration suite was not rerun;
no backend business source/SQL/migration changed.

After adding anonymous401 and actual API404-vs-SPA assertions, affected browse/
detail case rerun PASS. Full7 run is retained separately; the final focused JSON
reporter is1 case, not another7. UI regression on final live/demo builds:81/81 PASS,
0 skipped/unexpected/flaky,retries0,1 worker;359,98s starting2026-10-13 14:23:01 UTC.
Root lint/quality/contracts48/445, scoped browser lint, format and API/live/demo
builds PASS. Final self-review added2 service-unavailable controls (503 with/without
retry advice):13 Catalog wait regressions PASS, final full root957 PASS (492 API/
69 tooling/396 Web in70 files). Earlier955 result above keeps its original scope;
the final13 are included in957, not additional tests. No application source changed
after the81-case UI/7-case Catalog/10-case Identity receipts.
Two representative demo Catalog captures1280/768 reviewed without layout change;
actual HTTPS gate uses DOM/headers/network/PG assertions and no screenshots.

## Reproduction và limits

Requires local Docker/Node24, pinned installed browser/dependencies. From root:

```sh
npm run test:catalog:https
npm run test:identity:https
npm test
npm run lint
npm run format:check
npm run web:build:demo
```

From `apps/web`, after fresh live/demo builds:

```sh
npm run test:e2e -- --config playwright.web03-regression.config.ts
```

New Catalog reporter/captures go into ignored `.local/web-evidence/web-03`, with
no screenshots/traces/video/auth-form snapshots. Generic UI regression output is
isolated under its `regression` subfolder. Inspect then retire raw outputs; keep
tests/config, this report/runbook and approved templates. No commit/deploy.

WEB-04+ start/lost ACK/reload/two-tab/answer/submit/deadline/scoring/release/board
workflow still pending. This gate checks start rejection, not full exam completion.
Live Admin permission/replay gaps, richer frozen metadata, RV-06, browser engines/
manual AT/zoom, mobile/app, AWS/SLO/FinOps/production stay separate and open.

## Self-review, protection và teardown

R-58/59, workflow47/48: Catalog read control stays in its owning feature; reusable
UI remains independent of session/runtime/transport. No changes to backend Domain/
Application/SQL/UoW, server authorizations, critical mutation receipts, migration,
outbox/event/worker or infrastructure service. Existing actual start/submit calls
are fixture setup/rejection witnesses, not accepted scoring/deadline workflow.
Only npm scripts were added to package manifests; dependency/engine fields and
both lockfiles unchanged. Existing shared capability marker still lists9 Identity
operations and has no runtime caller; RV-06 remains a separate maintainability item.

1.514 protected source/template/evidence files retain SHA-256, including prior
uncommitted PORT-06C implementation, API, shared/session/live/demo, Identity tests,
approved design assets and historical backend evidence. Three mutable Catalog
owners were declared before fixing; new tests/helper/harness files are reviewed
separately. No baseline refresh to hide source differences. Imports/layers passed
the existing architecture guard; SQL added to fixtures follows conventions102.1.

Normal complete runs remove their DB/roles/temp keys. The initial interrupted
run stopped while teardown was underway:0 DB but3 login roles/no owned objects/
no sessions and1 temp TLS/key/web folder remained. Inspected exact resources,
dropped only the3 matching owned roles and removed only that folder; final query
confirmed0 fixture DB/roles, temp inventory0. Hard termination can interrupt
finally; this report does not claim crash-proof cleanup. Before retrying an
interrupted suite, stop its processes, inspect these namespaces with the local
admin and remove only confirmed owned resources. Never blanket-drop unrelated
databases/roles or print key/cookie/email-link content. Existing Docker volume is
retained; PostgreSQL/Mailpit are stopped and previews4173/4174 have no listeners.

Raw outputs inspected and retired:754 files/54.254.982 bytes (51,74MiB), including
327 PNG/427 JSON from owned WEB-03 UI/Catalog and Identity runs. Temporary2-file
protected snapshot/full-summary note also removed. Approved templates/Markdown/
source tests/config retained; all owned artifact folders absent. Existing narrow
Identity screenshots are included in cleanup, not new mobile acceptance. Environment:
Node24.17.0, Chromium153.0.8010.12, darwin/arm64,19 built migrations. No commit/deploy
or AWS/performance/cost claim. Production NOT ACCEPTED; product90/217,127 pending.

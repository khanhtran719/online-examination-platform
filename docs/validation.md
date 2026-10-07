# Validation log

Updated 2026-10-06. Latest scope: Web UI documentation/task/prompt handoff for Grok before ORM evaluation; no frontend implementation. Source normalization12/12 and152 tests are prior runtime evidence. ID-07/browser and ID-11/live SES remain PARTIAL. Historical sections remain below; fresh documentation checks are in the final Web UI section. No AWS capacity/cost/production claim.

| Check / command | Result | Detail |
| --- | --- | --- |
| Initial repository inspection | done | only AGENTS.md + .ai existed; no Git/source/project profile |
| RED domain `npm test` | expected fail | TS2307: Attempt/scoring source did not yet exist |
| RED tooling `node --test scripts/__tests__/quality.unit.spec.mjs` | expected fail | quality.mjs did not yet exist |
| GREEN `npm test` | passed | 28 domain cases across 2 Jest suites + 9 Node tooling cases; none skipped |
| `npm run typecheck` | passed | strict TypeScript check |
| `npm run build` | passed | compiles pure domain helpers; no API/worker runtime |
| `npm run lint` | passed | ESLint + quality command |
| `npm run quality` | passed | local Markdown links/anchors, project section IDs/context, literal source import boundaries including TS import-type/import-equals and technical barrels, test placement |
| Prettier on source/config/tooling | applied | formats existing bootstrap; no product UI exists |
| `npm audit --audit-level=high` | exited 0 with findings | 0 high/critical; 20 moderate dev findings rooted in sprintf-js/Jest dependency chain; unresolved, no forced downgrade/override |
| `docker compose config --quiet` | passed | dependency-only Compose configuration |
| `docker compose ps` | passed | PostgreSQL healthy; ElasticMQ running; localhost-only bindings |
| `docker compose exec -T postgres psql ...` | passed | current DB/user query; PostgreSQL 17.11, aarch64 |
| Local `ListQueues` through Compose network | passed | scoring + scoring-dlq present |
| Application PostgreSQL/SQS integration | not run | UoW/repositories/schema/session/worker not implemented |
| Terraform/k6/application Docker/browser | not run | not implemented under narrowed scope |
| AWS deploy/load/failure/restore/cost | not run | no selected account/region/deployment/data |

Watchman on the host has a missing shared library; Jest explicitly uses `watchman:false`, and the actual test suites ran successfully. Initial unused runtime dependencies were removed; runtime security cannot be assessed before application dependencies are selected. The remaining dev dependency advisories are recorded, not treated as production security acceptance. No production secret was read or stored.

The checker does not prove dynamic runtime consistency, transaction atomicity, exported public capabilities or authorization. Alias import resolution is not yet configured; future aliases require extending checks/tests. Real integration/failure tests remain required in [contract test matrix](contract-tests.md).

Repository is not initialized as Git; no commit/branch/PR/diff review is claimed. Standards were self-reviewed for conflicting POS local policy, cursor contract, Nest-free Application examples, nested rollback-only semantics and truthful roadmap/evidence states. Local containers are stopped after checks, with data volume retained.

## Review rerun

[Completed-checklist review](completed-checklist-review.md) records every one of the 18 items and all five corrected findings. Domain regressions had 8 failing assertions before correction; tooling regressions had 4 failing tests before correction. After fixes, `npm test` passed **37 cases** (28 domain + 9 tooling); typecheck/build/lint/quality passed. Manifest/lockfile dependency declarations match by structural comparison. Local PostgreSQL query, queue ListQueues and GetQueueUrl were checked again; GetQueueUrl responds with localhost for a localhost Host header and `sqs` for Docker-network requests. These checks ran through the Compose network; no AWS test or actual outside-host application client is claimed. `npm audit --audit-level=high` repeated the same 20 moderate dev findings, with no high/critical. Application/race/queue durability/production security checks remain pending.

## Phase 02 specification/contract tooling

[Phase 02 review](phase-02-review.md) maps all 11 SPEC artifacts and repaired findings. Checks ran on 2026-10-06:

| Check | Result / evidence |
| --- | --- |
| Initial RED contract test | Failed because contracts.mjs did not exist; tests written first for new validator logic |
| Focused RED regressions | Origin omission, operationId public-route spoof and non-finite datetime each failed before guard correction |
| Parser/Ajv during development | Rejected missing schema ref and expectedRevision-less inherited example; artifacts corrected before acceptance |
| Final `npm test` | **48 PASS**, no skipped: 28 Jest domain +9 Node quality +11 Node contract cases |
| `npm run typecheck` / `npm run build` | PASS; still pure helper build, not Nest runtime |
| `npm run lint` / quality | PASS; quality now also runs contracts:check |
| Contract validation | PASS: 44 operations, 75 referenced schemas, 411 example occurrences including repeated shared response examples; valid manual/deadline event fixtures and selected boundary metadata |
| Prettier | Applied to new scripts/tests, OpenAPI/event JSON and package manifest |
| Manifest/lock structural comparison | PASS, dev dependency declarations match, runtime dependencies=0 |
| `npm audit --audit-level=high` | Network sandbox attempt failed; retried with network permission, exit0. 20 moderate dev findings /0 high/critical; tracked SEC-06, no force downgrade |
| Application/DB/SQS/browser/AWS/k6/restore/cost | NOT RUN: future phases, no runtime implementation or selected AWS configuration |

No Git diff/commit/PR is claimed. Policy defaults/SLI/query budgets are specified but unverified; receipt/CSRF/session/ranking/replay controls are not implemented by the schema checker. Specs can now drive DB/application tests; AC system cases remain planned. Roadmap SPEC ticks represent specification completion only.

## Phase 03 PostgreSQL foundation

[Phase 03 review](phase-03-review.md) maps DB-01–11 and explains pending DB-12. Checks on 2026-10-06:

| Check | Actual result / scope |
| --- | --- |
| Fail-first config suite | TS2307 before configuration source existed; then13 config/budget cases PASS |
| Initial integration setup | Failed before migration files existed; host socket EPERM in sandbox, retried with permission |
| Regression RED | Completion without result, ownership mutation, missing frozen category, mutable accepted submission each failed before added guards; repaired without rewriting applied checksums |
| Final unit/tooling `npm test` | **67 PASS**:47 Jest (28 domain+13 config+6 migration guard),20 Node (9 quality+11 contract); no skipped |
| Final `npm run test:integration:local` | **30 PASS** on PostgreSQL17.11/aarch64 through host TCP using restricted runtime/migration logins; separate disposable DB/roles;29 earlier assertions passed but teardown failed, fixed by waiting for zero server connections and no fixture pool errors instead of FORCE |
| Local `db:local`, `db:migrate` / `db:migrate:local` | PASS: administrator roles/extension bootstrap, six ordered migration receipts applied through owner-bound migration login;34 base tables including migration history |
| Runtime privileges | actual tests deny DDL/history writes/audit changes/snapshot UPDATE/DELETE/owner SET ROLE and ownership/outbox identity reassignment; local owner/runtime/migrator/app role flags all non-superuser/non-createdb/non-createrole |
| `typecheck` / `build` | PASS; compiled infrastructure CLIs/helpers, not a Nest application |
| `lint` / quality/contracts | PASS, links/import/test-placement and44 HTTP operations/411 example occurrences unchanged |
| `db:budget` local example | required56/max_connections100/headroom44; arithmetic test, no optimal pool/utilization claim |
| `docker compose config --quiet` | PASS; PG preload/log settings and localhost-only bindings |
| pg_stat_statements / observations | PASS restricted no-query-text view + pool/query/lock/transaction timing, safe error/parameter omission and collector failure test; not CloudWatch exporter/traces |
| `npm audit --omit=dev --audit-level=high` | Initial sandbox registry DNS failure, retried with permission: **0 runtime vulnerabilities reported** |
| Full `npm audit --audit-level=high` | exit0;20 moderate dev-tooling advisories,0 high/critical; no forced downgrade/overrides |
| Manifest/lock | dependency declarations match: pg runtime +dev tooling/@types/pg; scripts are executable advertised CLIs |
| Business API/Identity/start-save-submit/inbox/SQS/browser/image compatibility | NOT RUN/not implemented yet; technical fixture tests do not replace these flows |
| RDS/Terraform/k6/large seed/saturation/PITR/restore/AWS performance-cost | NOT RUN; no deployment/account/region and no measurements |

No Git diff/commit/PR is claimed. Main local data/schema volume retained; dependency containers stopped after checks. No test database or active test connection remains. DB-01–11 ticks describe delivered foundation, not production acceptance. DB-12 remains unchecked despite the runbook. Connection/timeouts/indexes are local design candidates until measured against the specified workload.

## Phase04 planning/auth contract amendment — 2026-10-06

User selected email/password + single-use verification link now, asymmetric private/public signing for access and refresh, magic link/GitHub later. [ADR-005](adr/005-email-verification-and-signed-tokens.md), [Phase04 plan](phase-04-plan.md) and [contract review](phase-04-contract-review.md) record policy, activation/final password, key lifecycle, durable encrypted mail intent and remaining runtime checks. No SQL migration/DB driver/UoW/runtime dependency changed.

| Command/check | Actual result |
| --- | --- |
| Initial `node --test scripts/__tests__/contracts.unit.spec.mjs` | **12 PASS /3 FAIL** expected RED: missing verification POST, missing signed-token policy, shared audience not rejected. Then implemented contract/guard. |
| Final `npm test` | **72 PASS**:47 Jest +25 Node (16 contract/9 quality), none skipped; five new focused contract tests. |
| `npm run typecheck` / `npm run build` | PASS. Existing technical sources build, not an Identity API runtime. |
| `npm run lint` including `quality`/`contracts:check` | PASS: links/anchors/project references/import boundaries/test placement;46 operations,79 schemas,425 example occurrences plus event schema and selected metadata. Shared fixtures count repeatedly. |
| Focused Prettier | PASS for `scripts/contracts.mjs`, its test and OpenAPI. |
| Roadmap count CLI | Actual40 checked +176 unchecked =216. ID-10–13 added; no runtime task newly ticked. |
| PostgreSQL/integration | NOT RERUN; previous30 Phase03 integration results remain evidence for unchanged DB source/schema, not Identity activation/session. |
| API/browser/JOSE/keys/SMTP/SES/GitHub/magic link/AWS/load | NOT RUN/not implemented. No real email, key material, credentials or AWS resource created. |

Manifest/lock unchanged; previous audit findings remain historical, not a newly executed dependency scan. Typecheck/build passed before final docs/test-only refinements; tests/lint/contracts passed again after those refinements. Git/remote remain unconfigured. Runtime Phase04 implementation is next; contract amendment cannot close production security, delivery, performance or cost gates.

## Phase04 runtime and folder adjustment — 2026-10-06

[Review](phase-04-review.md), [runbook](runbooks/identity-operations.md), [raw experiment](../experiments/identity-local/README.md). Inspected the user's moved ports/errors/persistence/security/mail/http/DTO folders and module factories; kept generic platform HTTP, extracted technical idempotency, semantic DomainError categories and null success envelope. Quality enforces platform no-business imports/Presentation no-infrastructure imports. No capability ownership change or microservice introduced.

| Check / command | Actual result / scope |
| --- | --- |
| Fail-first domain/crypto/config/application tests | Initial missing/incorrect sources failed before implementation; actual Argon2/JOSE, key/claim/purpose/overlap and config tests now pass |
| Logout old-cookie retry RED→GREEN | HTTP retry initially403 after family revoke; logout-specific CSRF known-family context restores idempotent200 without authorizing other mutations |
| Concurrent login RED→GREEN | Six simultaneous wrong credentials initially all401; atomic independent reservation now five401/one429 across two instances; success releases slots |
| Failure bucket expiry RED→GREEN | Reservation in existing minute bucket left998ms after fixture shortening, expected≥899999ms; expiry extension corrected; full PG suite passed |
| Maintenance lock RED→GREEN | Held challenge plus cleanup caused email-intent lock timeout; parking now commits before challenge cleanup. Test synchronization permits SKIP LOCKED completion or wait;52 final cases passed |
| Final-attempt crash / audit rollback / operator | Crash attempt10 parked after expired lease; fencing/retry bounds, profile/audit/receipt rollback, audited bootstrap/key-revoke/email-replay and mail least privilege tested |
| `npm test` | **90 PASS**:64 Jest/11 suites +26 Node (10 quality/16 contract); none skipped in complete run |
| `npm run test:integration:local` | **52 PASS**:30 foundation +22 Identity/2 suites, PostgreSQL17.11 through restricted roles, HTTP/SMTP actual local; fixture DBs/logins removed after zero connections |
| `npm run typecheck` / build | PASS strict TypeScript and clean generated-output build, actual Node24 CommonJS entry points |
| `npm run lint` / quality/contracts | PASS source boundaries/links/anchors/test placement and46 HTTP operations/425 example occurrences; only nine Identity operations implemented |
| Local key generation | PASS exclusive600 ignored files; signing pair, public ring, separate email/CSRF/rate keys. No production credential created or secret material logged |
| `db:local` / `db:migrate:local` | PASS:app/migrator/operator/mail roles,8 migration receipts, preserved first-six checksums |
| SMTP Mailpit | Actual loopback capture of fragment verification link; no external email |
| SES request/abort tests | PASS provider boundary and5s timeout; no AWS sender/quota/bounce/delivery evidence |
| `smoke:identity:local` | Actual main/worker live/ready PASS, both SIGTERM exit0; latest idle combined640.634875ms, [raw summary](../experiments/identity-local/smoke.json); child processes stopped |
| `bench:identity:local` | PASS final two HTTP instances/pool4 each/32 users/0 unexpected errors; latest raw samples stored; no sustainable RPS or AWS cost inference |
| Runtime dependency remediation | Aligned Nest12.1.2/Fastify5.12.5 after nested vulnerable Fastify dependency; actual API/startup passed |
| `npm audit --omit=dev --audit-level=high` | 0 runtime vulnerabilities reported; current lockfile scanned |
| Full audit | 20 moderate dev findings,0 high/critical; no force fix or hidden downgrade |
| Roadmap count |50 checked/166 unchecked =216; BOOT-10 and nine Identity items added; ID-07/11 PARTIAL, ID-12/13 LATER |
| Browser HTTPS/frontend/ARM64 Linux images/old-new compatibility | NOT RUN; verification landing404 is documented, Secure cookie behavior not proven by manual local cookie jars |
| AWS/Terraform/k6/scoring/SQS/large seed/saturation/PITR/restore/cost curve | NOT RUN; account/profile/region/sender/domain and deployment/evidence remain absent |

Benchmark initially sent application/json with empty bodies causing96 refresh/logout errors; corrected client, retained invalid raw run and excluded it from comparisons. Valid baseline/CSRF-projection/latest runs had0 unexpected errors. Refresh query count15→10, logout13→9 including added audit. Final login19.5 average includes atomic security admission/release; do not accept a cheaper racy path. Raw CPU includes API/client process, excludes PG; RSS delta is not per-request allocation, sequential RPS is not saturation. Invalid-credential timing groups are ordered small samples and do not close enumeration resistance.

No Git diff/commit/PR claimed; repository still has no Git remote. No AWS deploy/price saving/production acceptance claimed. Remaining browser/live-provider/production gates are explicit in roadmap and acceptance ledger; test/script existence alone never ticks them.

Final manifest/lock dependency comparison matched; roadmap count CLI confirmed50/166/216. Final document/source quality and contract validation passed after report updates. Actual API/worker smoke processes exited; PostgreSQL/Mailpit stopped through Compose with PostgreSQL data volume retained. No implementation or test task remains running in the background.


## Architecture §5 normalization — documentation/review increment

2026-10-06. [ADR-006](adr/006-source-layout-normalization.md), [API review](api-architecture-review.md) and [marked plan](architecture-normalization-plan.md) deliver the user-requested standards adjustment before further implementation. Updated architecture §5/15/24/77, rules R-76, related conventions/workflow/examples/overview/AGENTS/profile/README/roadmap/database/runbooks. Seven actionable review findings record placement/guard gaps and remaining browser/SES/observability acceptance. The pg choice is documented as an implementation decision without an ORM comparison; TypeORM/raw projections is a proposed candidate, not an installed dependency or measured winner.

| Fresh check | Actual result / limit |
| --- | --- |
| `npm run quality` | PASS local Markdown links/anchors, section/context, current source import/test placement; new-layout guard extension remains N-04 |
| `contracts:check` through quality | PASS46 operations/425 examples and event boundary metadata; only9 Identity business routes implemented |
| `node --test scripts/__tests__/*.unit.spec.mjs` | **26 PASS**,0 failures/0 skipped:16 contract +10 quality tooling regressions |
| `git diff --check` | PASS whitespace review; source/build/package/SQL/HTTP contract files unchanged |
| Git inspection | Repository now exists, baseline commit `cac9416`, remote name `origin`; network/PR workflow not tested, BOOT-09 updated PARTIAL without changing product completed count |
| Runtime unit/integration/build/browser/smoke/load | NOT RERUN for docs-only increment; prior142 PASS stays historical runtime evidence, not a fresh test result |
| ORM/ARM64/AWS comparison, cost, sustainable capacity | NOT RUN; raw local diagnostics do not establish an ORM or AWS performance/cost winner |

Self-review distinguishes target layout from the explicit legacy-source transition, pure shared ports from Nest common, business outbox port from infrastructure relay port, domain write models from application projection/crypto types, worker factories from private repositories and SQL schema names from source folders. Preserve eight immutable migration checksums and build-asset inclusion at N-09; no database change is made here.

Normalization **N-01–03 complete (3/12)**, N-04–12 pending; ORM evaluation0/4. Product status remains50/216. No new runtime package, source relocation, infrastructure resource or fabricated benchmark is included. Historical validation/experiment artifacts remain unchanged.

## Architecture §5 normalization — source/tooling closure

2026-10-06. User authorized completion after the documentation increment. [Checklist](architecture-normalization-plan.md) **N-01–12 complete**, [ADR-006](adr/006-source-layout-normalization.md) implemented locally, [API review](api-architecture-review.md#7-closure-sau-source-normalization) RV-01–05 CLOSED. Product remains50/216; ORM evaluation0/4, RV-06/07 pending.

| Fresh check / command | Actual result / scope |
| --- | --- |
| Guard regressions RED → GREEN | Four new boundary tests failed before checker extension; legacy/root-barrel regressions then failed before closure guard. Final self-review reproduced a controller→public composition factory bypass and repaired it before acceptance.16 quality cases PASS; imports/type imports/barrels/private cross-module boundaries and factory caller scope checked |
| Pure config RED → GREEN | New settings suite failed before config.validation existed; now2 PASS, preserving existing secret/key/TLS/config suites |
| Migration assets RED → GREEN | Missing module failed before copy implementation;2 cases PASS for byte copy and absent/empty/symlink rejection |
| Public factory SMTP RED → GREEN | New factory import failed before implementation; actual SMTP integration now calls the public worker factory and retains consumed-job assertions |
| `npm test` | **100 PASS**,0 skipped:66 Jest/12 suites +34 Node (16 quality +16 contracts +2 migration assets) |
| Actual PG integration command | `node --experimental-vm-modules --env-file=/tmp/examination-normalization-api.env node_modules/jest/bin/jest.js --config jest.integration.cjs --runInBand`: **52 PASS**,0 skipped,2 suites (30 foundation +22 Identity); PostgreSQL17.11 ARM64/restricted roles, real HTTP/SMTP. Fixture DBs/logins cleaned after sockets closed |
| `npm run typecheck` / `npm run build` | PASS strict TypeScript and clean build; all new compiled API/worker/operator/DB entry points present; legacy generated paths absent |
| `npm run lint` / quality/contracts | PASS;46 operations/425 example occurrences remain contract inventory,9 Identity business routes implemented |
| Migration checksums |8 source +8 built SQL files match baseline SHA-256 exactly; no schema/content/grant/history change |
| Actual compiled migration CLI | Fresh task-owned database:8 applied. Rerun compiled CLI from `/tmp`:0 applied, exit0; bundle resolution is independent of cwd. DB-12 Linux image compatibility drill remains pending |
| Actual API/worker smoke | Compiled main and worker `/live`/`/ready` PASS, both SIGTERM exit0; combined idle shutdown581.813833ms. [Record](../experiments/architecture-normalization/smoke.json); no deployment-under-load claim |
| Actual operator CLI | Moved root bootstrap/grant/revoke exit0 through dedicated operator login;3 audit records,0 admin roles after revoke; repeated bootstrap rejected with exit1 and no extra audit. [Record](../experiments/architecture-normalization/operator-cli.json), isolated test DB only |
| Before/after diagnostic |3 before +3 after runs, same pool/security/dataset/traffic,13 operations. Ten explicit error counters report0 errors;3 completed Argon microbenchmarks have no separate error field. [Raw comparison/report](../experiments/architecture-normalization/README.md) retains percentiles, sequential RPS, CPU/RSS/query/pool/transaction observations |
| Source self-review | [Record](../experiments/architecture-normalization/self-review.json): six moved runtime/controller non-import bodies unchanged;24 Identity SQL literals unchanged across write/query split; same executor preserved; no legacy source/build paths |
| Dependencies/contracts/history | No new runtime dependency or lockfile/HTTP/event schema change; prior audit results remain historical, not a fresh scan |
| Browser HTTPS/live SES/AWS/ORM/k6/image/restore/cost | NOT RUN; no production acceptance, sustainable capacity, optimum pool, ORM winner or AWS savings inferred |

Baseline runtime is `cac9416`; existing docs were committed by the user during work as `9cc07bc`. This source increment does not create a commit/PR or modify staging. The new experiment stores a current source worktree digest and baseline migration digests; historical Identity JSON is preserved. Operator placement was corrected from the proposed global infrastructure path to `workers/operator`, avoiding technical infrastructure→business imports; ADR-006 explains the decision. No empty module/config wrapper/integration was created.

Query counts remain identical; median-of-run p95 increases on me/refresh/logout are recorded alongside decreases elsewhere. Shared-host noise, development activity during baseline runs, sequential non-interleaved execution and small samples prevent a causal performance conclusion. Worker measurements use a provider stub; CPU includes client/API in one process; RSS delta is not allocation/request. Accept the structure/correctness adjustment with observed local behavior; retain concurrency/AWS SLO and performance–cost verification as separate open gates.

Final `npm test` passed100 again after factory-caller guard repair; `npm run lint` including quality/contracts and `git diff --check` passed after documentation updates. Roadmap count verified50 checked/166 unchecked; normalization12 checked and ORM4 unchecked. Task-owned `examination-normalization` PostgreSQL and the Mailpit started for this run were stopped through Compose, with volumes retained; the existing service on55432 was not touched. All smoke/test/benchmark child processes had exited; no task remains running.

## Web UI brief/task/prompt handoff — 2026-10-06

The user requests a detailed implementable UI specification and tasks for Grok before the persistence comparison. Delivered [handoff package](web-ui/README.md), [visual/screen spec](web-ui/design-spec.md), [API/state contract](web-ui/api-and-state-contract.md), [32 frontend tasks](web-ui/implementation-tasks.md), [24 scenarios](web-ui/acceptance-checklist.md), [prompt](web-ui/grok-implementation-prompt.md) and ADR-007. Updated README/profile/roadmap/active plan. Frontend-design/frontend-ui-engineering skills informed the brief; relevant official framework/accessibility references are linked in the documents. No dependency, source, migration, HTTP/event schema, backend or AWS resource changed in this increment.

| Fresh documentation check | Actual result / scope |
| --- | --- |
| Repository/API inspection | Product/security/SLO/profile/roadmap/OpenAPI and actual Identity controller/session port inspected;9 implemented Identity business routes versus44 specified business +2 health operations |
| API mapping cross-check | PASS: SwaggerParser-dereferenced OpenAPI; all44 business operationIds and exact API paths represented in handoff table; health grouped separately |
| DTO dependency review | Profile/Session no permissions; frozen attempt presentation metadata missing; current exam may be a different version; browse/search/total/version-list/history labels/replay revision/metrics/media gaps recorded UI-GAP-01–08 |
| Task/scenario inventory | PASS:32 unique contiguous FE IDs,all unchecked;24 unique W scenarios planned;5 documentation deliverables checked separately |
| Prompt length | **1,000 whitespace-delimited words** in the copyable body after the separator; heading/instructions excluded |
| `npm run quality` | PASS local links/anchors/project context/source boundaries/test placement; includes contract check46 operations/425 examples |
| `node --test scripts/__tests__/*.unit.spec.mjs` | **34 PASS**,0 failed/skipped:16 contracts +16 quality +2 migration assets; fresh tooling check, not browser implementation evidence |
| Targeted Markdown Prettier | PASS/applied to six web-ui docs and ADR-007 |
| `git diff --check` | PASS whitespace validation; previous runtime changes are not part of this documentation increment |
| Product count |50 checked/166 pending remains216; WEB-01 PARTIAL, frontend0/32 and ORM0/4; no product checkbox newly completed |
| Frontend install/build/unit/E2E/visual/HTTPS/a11y/performance | NOT RUN: no app was implemented; task/spec budgets and screenshots are planned, not measured |
| Backend unit/integration/smoke/audit/AWS/ORM | NOT RERUN: existing152 test evidence remains historical for unchanged runtime; no live comparison/deploy/cost/SLO claim |

Self-review separated browser routes from API paths, demo adapters from live failures, consented review data from Candidate questions, authoritative session/permissions from client guesses, frozen metadata from current publications, committed ACKs from local draft and processing text from durable lifecycle. The brief includes one-in-flight stable-key saves, monotonic ACK reconciliation, conflict resolution, server deadlines, no-answer submit, bounded polling and privacy/cache isolation. Unsupported backend capabilities are explicitly blocked live; the prompt does not authorize Grok to invent fields or change the backend to bypass them.

Outcome: documentation5/5 complete,32 implementation tasks pending. Static SPA/design direction is accepted for the brief with operational reasoning, not a measured cheapest/fastest frontend claim. No frontend/AWS process or background task was started.


## Persistence evaluation closure — 2026-10-07

User authorizes the TypeORM/Sequelize comparison. [Protocol/evidence/reproduction](../experiments/persistence-comparison/README.md), [all measurements](../experiments/persistence-comparison/measurements.md), [provenance](../experiments/persistence-comparison/provenance.json) and [ADR-008](adr/008-persistence-evaluation.md). O-01–04 complete locally; retain pg for current Identity, no production performance/cost winner. Existing Web UI work/root package changes/staging are outside this task and not accepted by these checks.

| Fresh check | Actual result / limits |
| --- | --- |
| Fail-first transaction gates | Candidate import absent before implementation; real-PG spike exposed pg queued-work shutdown failure, plus fixture and Sequelize metadata adaptation defects. No assertions/security controls were removed to pass |
| pg drain regression RED → GREEN | Targeted Jest test first failed DB_ACQUIRE_TIMEOUT. Fix rejects new admissions, drains active/queued work, then pool.end; repeated close shares one promise. Full53 integration cases later PASS,0 skipped |
| ORM hard gates / stats | `npm test --prefix experiments/persistence-comparison`:42 PASS,0 skipped;36 behavioral leaves +3 parent results +3 statistics cases. Actual PostgreSQL locks/rollback/receipt/audit/refresh/backend-kill and Nest HTTP envelope/CSRF/cookies; not browser HTTPS |
| Existing unit/tooling | `npm test`:100 PASS (66 Jest +34 Node),0 skipped |
| Existing PG/HTTP/SMTP | Full integration command with task-local env:53 PASS,0 skipped. Initial run had52 PASS/1 SMTP ECONNREFUSED; task-owned Mailpit was then started and full suite passed |
| TypeScript/build | `npm run typecheck` and `npm run build` PASS;67 compiled JS files byte-identical after formatting/rebuild. PoCs are JS spikes against the actual compiled application; strict production ORM typing/full conversion is not claimed |
| Lint/quality/contracts | `npm run lint` PASS, including quality/links/anchors/boundaries/test placement and46 operations/425 examples. Explicit ESLint for experiment mjs PASS after unused destructuring cleanup |
| Dependency provenance/audit | Separate experiment package/lockfile pins pg8.23.1/TypeORM1.1.1/Sequelize6.37.8. Audit before:2 moderate through uuid; scoped uuid11.1.1 override then audit0 findings. No root ORM install or audit downgrade/fix-force |
| Native diagnostics caveat | Sequelize logs a native failed-rollback console warning despite logging=false. Observed message contained no SQL/credential, but structured redaction/lifecycle controls remain adoption gaps; not silently suppressed |
| Comparable local measurement |100,000 users/roles/families/sessions, pool4, concurrency1/8/32,5 rotated blocks:75 configs/76,800 timed application operations,0 errors. Raw samples/percentiles/success RPS/CPU/RSS/GC/query/pool/lock/transaction/DB counters/startup/EXPLAIN retained |
| Migration/schema/HTTP preservation |8 source +8 built SQL bytes/checksums match HEAD and raw measurement manifest. No schema/grant/history/HTTP/event contract change. Startup hooks/model definitions do not synchronize or run migrations |
| Measurement provenance | Raw SHA-256 and67 compiled JS checks in provenance.json. Timed source digest is from measurement time; later timed-source edits are formatting only, compiled runtime JS remains byte-identical |
| Scope/status | Normalization12/12; persistence evaluation4/4; product roadmap50 checked/166 pending remains216. UI progress, AWS SLO/capacity/pool/TCO and acceptance gates are not ticked by the experiment |
| AWS/k6/exam dataset/cost/restore/HTTPS/image | NOT RUN: no AWS account/region/domain selected, no full exam load, saturation/optimal pool, x86_64/Linux image, HTTPS browser, RDS failover/PITR restore, cost curve or future developer-hours claim |

Self-review: one active ORM manager/connection resolves every repository/raw/audit/receipt call; no new pool inside a UoW, no ORM import into business layers and no schema/contract rewrite. Query counts1/1/8/10 remain equal across modes. Account mapper/read-only projection and write locks are separate. Native warning, private pool counters, non-equivalent connection lifetime and incomplete whole-Identity production adapter coverage remain explicit. Cold memory, noisy short closed-loop latencies and client-inclusive CPU do not establish AWS savings. Retain pg with a concrete current-scope ADR, not a universal ORM ban; TypeORM can be reopened with demonstrated CRUD/TCO benefit and full hard gates.


Final scope checks: experiment containers PostgreSQL/Mailpit were stopped through their dedicated Compose project, volumes retained; test/benchmark/startup child sessions exited and disposable databases/logins were cleaned. `git diff --check` and final quality/contracts passed after the closure documentation. No Git stage/commit/PR action was taken. Existing staged UI handoff and unstaged Web UI/package/ESLint work were preserved. Native Sequelize rollback diagnostics remain explicit, so no candidate is reported as production-ready.

## SQL readability normalization — 2026-10-07

User confirms provisional retention of pg and requests a SQL format rule plus normalization of existing queries. Adopted [conventions §102.1](../.ai/conventions.md#1021-postgresql-query-layout)/[R-77](../.ai/rules.md#77-sql-readability-and-formatting-preservation-rule-r-77); updated AGENTS, validation workflow and database guide. QF-01–03 are complete; [verification ledger](evidence/sql-format-2026-10-07.json) records scope, normalized hashes and the unchanged migration bundle. Current runtime, integration fixtures, local scripts and operational SQL were formatted; archived experiment source/evidence and all eight applied migrations were intentionally preserved.

| Check | Executed evidence |
| --- | --- |
| SQL/code preservation | PASS:84 TypeScript/MJS files inspected,274 SQL literals/fragments plus3 operational SQL files. SQL token/literal sequences, recursive PL/pgSQL body tokens, template expression order, parameter arrays and surrounding semantic AST match the captured pre-edit working tree.14 code/SQL files changed layout; no statement, binding, alias, result shape or lock/UoW change |
| Migration/historical assets | PASS:53 scoped historical files preserve SHA-256, including8 migrations and archived experiment source/raw reports. All8 built SQL files also match the captured source bytes. No checksum regeneration, schema/grant change or benchmark rerun |
| Formatting | PASS:Prettier check for11 touched TS/MJS files; manual SQL review corrects locking-clause wrapping, EXTRACT, JSON key/value pairs, long assignments and PL/pgSQL blocks. Formatter15.9.0 was installed under `/tmp` only; no repository dependency or request-time formatting added |
| Lint/quality/contracts | PASS:`npm run lint`; source boundaries, document links/anchors,46 OpenAPI operations and425 examples |
| TypeScript/build | PASS:`npm run typecheck`, `npm run build`; migrations packaged byte-identically. Compiled query strings now contain the new whitespace, so earlier benchmark runtime digests remain historical |
| Unit/tooling | PASS:`npm test`:66 Jest +34 Node cases =100,0 skipped |
| PostgreSQL/Identity | PASS:`npm run test:integration` against dedicated PostgreSQL:55434:53 cases,0 skipped. Includes locks, transaction rollback/nesting, idempotency/audit, refresh races, SMTP delivery, migration integrity and queued-work drain |
| Operational SQL | PASS:formatted local bootstrap and all diagnostics statements run against dedicated PostgreSQL with ON_ERROR_STOP=1. Existing development DB on55432 is not used |
| Diff/scope | PASS:`git diff --check`; root package/lockfile, separate UI work and Git staging unchanged by this increment. QF3/3 complete; no product/production acceptance task newly checked |

Self-review: this is source readability maintenance, not a query-plan/performance optimization or a fresh ORM comparison. No SQL builder or abstraction was introduced; owned SQL remains in Infrastructure. Structural keywords and two-space clause bodies, separate projections/predicates/assignments, explicit CTEs/subqueries and adjacent bindings now form the authoring convention. Applied migrations and archived benchmark evidence remain exceptions for immutability. Existing tests were reused; no implementation-mirroring test was added. Production/AWS performance-cost, browser HTTPS and other delivery gates remain unchanged.

Cleanup: dedicated PostgreSQL/Mailpit containers stopped with volumes retained; unit/integration child processes exited. No Git stage/commit/PR action occurred. Separate UI changes appearing during this increment were preserved and are outside this review.

## Web UI review fix — 2026-10-07

The user asked to repair the existing `apps/web` SPA from the independent review. Scope stayed frontend, web tests and Web UI documents. Backend, ORM, migrations and AWS were not changed so the UI would pass. The SQL readability scope and the persistence evaluation above stay as recorded. Stored RED artifacts in [review evidence](web-ui/evidence/review-2026-10-07/README.md) were not edited.

| Fresh check | Actual result / limits |
| --- | --- |
| Web eslint and Vitest | PASS: `eslint src` silent, 14 files, 60 tests. Includes deadline transport and autosave regressions |
| Web live and demo builds | PASS before this documentation pass. Live home gzip level 9: initial JS 129916 bytes, CSS 3370 bytes, shipped fonts 100600 bytes raw. Hashes in [fix evidence](web-ui/evidence/fix-2026-10-07/README.md) |
| Stored Playwright suite on a separate output path | 7 PASS, 2 FAIL. FAIL are the stored `UI-GAP-02` copy assertion and the candidate “Quản trị” link. W-14, W-06, W-16, FE-23 and W-18 PASS. W-16 was not replayed after the later brand-only rebuild |
| Browser script | PASS for five home widths, exam 320, focus versus dock, keyboard radio/sheet, layout viewports 720 and 384, and a 500-question live fixture with 0 clean PUTs in 2.5 seconds. CSS zoom 2 on a fixed 320 viewport clips the dock and is not counted as browser zoom |
| CSRF / Retry-After probe | One Node realm: lastStatus 200, delay 10000 ms. Not two browser tabs and not HTTPS cookie proof |
| Checklist | Still 3/32 FE tasks checked. WEB-01–10 unticked. Identity HTTPS and live Catalog/Assessment/Reporting remain BLOCKED |
| LCP/CLS, Firefox/WebKit, dirty autosave HAR, manual submit browser | NOT RUN |
| Root quality after these document edits | PASS: local Markdown links/anchors, project context, import boundaries and unit-test placement, then contracts 46 operations and 425 examples. The previously reported persistence placement failure did not appear. No guard was bypassed |


## Identity browser HTTPS — 2026-10-07

User authorizes the next increment after retaining pg/query formatting: close local ID-07/WEB-02 with the current live SPA, actual Nest AppModule, restricted PostgreSQL roles, all eight immutable migrations and the actual verification worker delivering SMTP into Mailpit. [Evidence and RED/GREEN mapping](evidence/identity-https-2026-10-07/README.md), [manifest](evidence/identity-https-2026-10-07/manifest.json) and [reproduction runbook](runbooks/identity-https.md). This closes named local Identity tasks, not production acceptance or the concurrent public visual implementation.

| Fresh check | Executed result / limits |
| --- | --- |
| Browser HTTPS | `npm run test:identity:https`: **10 PASS**, zero retries. Real Chromium153.0.8010.12, Node24.17.0/macOS ARM64, live static assets, actual API/PG/SMTP; no route fulfillment or mocked business responses |
| Register/verification/login | Browser generic duplicate202/one durable intent, delayed actual worker mail, resend suppression/cooldown, inert GET, fragment scrub/reload loses secret, missing/malformed/expired links, explicit final-owner password, replay preserves established password/no automatic login |
| Cookie/security/session | Secure/HttpOnly/host-only access/refresh; metadata-only JSON; exact Origin and signed cookie/header CSRF/context rejects. Authenticated verification request/confirm now reject per the existing anonymous contract |
| Shared-cookie multi-tab | Two pages in one BrowserContext, real Web Locks: one refresh POST200, one consumed session, zero revocations. Concurrent profile update200/409, one revision increment. Actual API restart, logout broadcast/cookie clearing and account disable on next request PASS |
| Commit lost ACK / timeout | Refresh never blindly replayed; explicit confirmed SPA login restores future refresh. Logout retries with fresh anonymous CSRF after revoke. Profile same-receipt retry produces one write. Body stall after headers settles at the existing10s timeout; uncertain outcome retained |
| RED → GREEN | Corrected initial harness assumptions first. H06/07/08 reproduced product failures; H04 accepted authenticated verification202 instead of403; profile direct reauth link missing. Two stream-body and two coordinator-generation unit regressions reproduced before repair. Stored RED remains unchanged |
| Root unit/tooling | `npm test`: **100 PASS** (66 Jest +34 Node), zero skipped |
| Actual PostgreSQL/HTTP/SMTP integration | `TEST_DATABASE_ADMIN_URL=<isolated PostgreSQL55435 administrator> npm run test:integration`: **53 PASS**, two suites, zero skipped; root Mailpit used only for the existing SMTP test. No development database truncation |
| Web unit | `npm run web:test`: **73 PASS /16 files**.64 existing/auth cases plus9 public-experience cases from concurrent UI work; this does not accept its full visual/performance phase |
| Lint/typecheck/build | Root `npm run lint`/`npm run typecheck`, Web lint/typecheck, API and live Web builds PASS. Final dedicated runner rebuilds both. Current dependencies include concurrent UI Three.js; no new runtime auth dependency |
| Formatting / migration preservation | Prettier check PASS for19 owned/touched code/config files. All8 source/built/tested-build migration SHA-256 match HEAD; no schema, grant, history or SQL change |
| Accessibility / visual scope | One verification form has zero serious/critical axe violations; empty-form desktop1440×960/mobile390×844 screenshots visually inspected. No token/email/password content. Whole-app WCAG, other browsers, full visual layouts and performance budgets remain open |
| Output/provenance/privacy | Dedicated ignored `apps/web/.local/identity-https-results` avoids default-suite cleanup. Static assets snapshot per run; API/Web SHA-256 recorded at fixture start. Safe metadata only; JSON evidence scan found no private key/JWT/raw verification fragment/recipient/password. No HAR/trace/video/auth DOM snapshot saved |
| Product status | Roadmap **52 checked /164 pending =216**; FE **7 checked /25 pending =32**. ID-04 repaired and checked; ID-07, WEB-02, FE-07–10 closed locally. RV-06 closed, RV-07 live SES pending. Phase04 remains partial at ID-11 |
| AWS/SES/public PKI/performance-cost | NOT RUN. No domain/account/region provisioned, public viewer/origin/private DB TLS, live SES, sustained capacity, SLO, cost curve, recovery or restore acceptance inferred |

Prerequisite/fixture failures are explicit: sandbox EPERM needed the permitted local socket run; the first existing integration run lacked pg_stat_statements preload (52 PASS/1 failure), then the dedicated Compose prerequisite was fixed and the full53 passed. An intermediate Web build encountered a missing public-scene file while the other UI task was creating it; final builds pass. Initial browser diagnostic4 PASS/5 FAIL reflected fixture revision expectations, in-document hash navigation and Chromium automatic socket retry before headers; corrected harness then isolated three product regressions. Later public navigation exposed a missing direct profile reauth action, reproduced and fixed. Default UI output cleanup removed an earlier HTTPS artifact folder, so the output was isolated and tests rerun; a concurrent build then required test-time digests/static snapshots. Final stored GREEN uses the isolated snapshot and10 passing cases.

Self-review under R-58/R-59/workflow47: Identity transport/controller retains ownership and business/Application/Domain independence. No transaction/lock/outbox/receipt/JWT/public JSON or migration rewrite, runtime test endpoint, new service/cache/ORM or blind refresh retry. Anonymous logout retry cannot revoke a live family; old signed family nonce is accepted only for the same already-revoked logout. Explicit confirmed login resets browser recovery with generation protection against a late outcome; generic probes do not unlock it. Timeout applies through the response body. Correlation route/status observations are redacted; test durations are not p95/SLO/FinOps measurements. The logout recovery fix can add an authoritative lookup, with no latency/cost improvement claimed.

Cleanup: normal fixture teardown closes browser/gateway/API/worker/pools, drops its disposable database/logins, restores environment and removes temporary key/certificate/static snapshot files. Dedicated PostgreSQL/Mailpit and the root Mailpit opened for integration are stopped, volumes retained. No Git staging/commit/PR occurred; concurrent public-experience source/tests/design documents were preserved. Final document guards and whitespace check are recorded below.

Final closure: `npm run lint`/quality/contracts, root and Web typecheck/lint,19-file Prettier check and `git diff --check` PASS after implementation/evidence updates. Counts verified52/164 product and7/25 FE. Final GREEN preserves10/10 cases in the isolated snapshot run; manifest JSON/credential scan and all8 tested-build migration digests PASS. Both safe screenshots were visually inspected. Historical ORM measurements and RED files remain unchanged.


## Grok Catalog prompt handoff — 2026-10-07

Delivered [997-word copyable prompt](grok-catalog-implementation-prompt.md), counted by whitespace in the body after the separator. Scope is the next Catalog backend increment, CAT-01–10 staged; no runtime work started by this handoff. Prompt preserves current pg/SQL architecture, immutable migrations, authenticated projections, admin permissions/audit/receipts, atomic frozen publication, bounded JSON import and real-PG evidence requirements. It explicitly keeps full publish/start race acceptance pending until actual Assessment integration exists, and records local Catalog scope separately from the open ID-11/SES/production gate.

Fresh documentation checks: `npm run quality` PASS (links/anchors/context/boundaries/contracts46 operations/425 examples) and `git diff --check` PASS. No dependency/source/schema/roadmap checkbox or historical benchmark artifact changed; runtime/browser tests were not rerun for this documentation-only task. Existing user/UI/Identity worktree changes preserved.

## Catalog local 2026-10-07

Implemented Catalog draft, question bank, immutable publication, projections, Assessment capabilities and JSON import v1. Migration `0009_catalog_question_points.sql` is forward-only. `git diff` shows no change to 0001–0008. Build copies all nine SQL files byte-for-byte into `dist/infrastructure/database/migrations`.

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| `npm run lint` (ESLint, quality, contracts 46 operations / 425 examples) | PASS before the documentation update in this section |
| API Jest, `testPath` not including the two web Vitest files | 13 suites, 71 tests PASS |
| `node --test scripts/__tests__/*.unit.spec.mjs` | 34 PASS |
| Root `npm test` | exits 1 because Jest also loads `apps/web/src/features/experience/__tests__/*.unit.spec.ts`; those committed Vitest files were not edited |
| `npm run build` | PASS; nine migration files match source |
| Integration on disposable PostgreSQL 17, Mailpit stopped | database PASS, Catalog 11 PASS, Identity 21 PASS and 1 SMTP `ECONNREFUSED` on port 18025 |
| `docker compose up -d --wait mailpit`, then Identity spec | 22 PASS |
| Full integration after Mailpit was healthy | 64 PASS (database 31, Identity 22, Catalog 11) |
| Port 55432 | not used; it belongs to another running Postgres. Catalog tests used a task-owned Postgres 17 on 127.0.0.1:55436 with `pg_stat_statements` |
| Development database | not migrated and not truncated |
| `npm run test:identity:https` | 10/10 Chromium cases H01–H10 PASS after API and live web builds; the harness stopped its own Postgres and Mailpit |

Catalog integration covers revision and lost-ACK receipts, audit rollback, archive references, immutable publish/unpublish/republish, a second connection hiding an uncommitted version, publish against replace, semantic and dry-run import, permission revoke inside the write transaction, and HTTP Origin/CSRF, envelope and the 1MiB import limit. [Diagnostic](evidence/catalog-2026-10-07/README.md) is not capacity evidence. CAT-10 stays open because Assessment start does not exist. ID-11 and Phase04 stay open. No Redis, Kafka, RDS Proxy or AWS service was added. User web-ui evidence and this handoff section were left intact. Nothing was staged or committed.

## Independent review of Grok Catalog — 2026-10-07

Outcome: **NOT ACCEPTED locally until GR-01–06 are addressed**; see [report](catalog-review-2026-10-07.md) and [evidence](evidence/catalog-review-2026-10-07/README.md). Source baseline `b057c3d`, Node24.17/darwinARM64, dedicated loopback PostgreSQL17 on55435, restricted runtime role/all9 migrations. DevelopmentDB55432 untouched. All original0001–0008 bytes matchHEAD; built9-file bundle matches source.

| Review check | Actual result |
| --- | --- |
| Lint/architecture quality/OpenAPI, typecheck, API build | PASS |
| Root `npm test` | FAIL;71 API cases PASS but2 committed Web/Vitest suites fail under Jest; Node tail not run |
| Node tooling separately |34 PASS |
| `npm run web:test` |73 PASS /16 files |
| Existing integration, diagnostic writer deliberately filtered out |63 PASS,1 deselected /3 suites |
| Actual Identity Chromium HTTPS |10 PASS; actual AppModule/SMTP worker/restricted PG |
| Independent review suite/default500ms lock and2000ms statement timeouts |5 RED,1 PASS; expected exit1 |
| Migration hashes/diff checks | Preserved immutable migrations,9 built assets identical |

Review reproductions: closed publication commits1 late version; valid36,377-byte question and42,231-byte500-question draft return400; detail emits undocumented`publishedAt`; February30 normalizes toMarch2/201. Pagination control sees503/503 bank IDs. No correctness fix was made during review. Root runner defect predates Catalog; Grok disclosed it. Historical diagnostic remains unmodified: only browse/detail measured, simplified EXPLAIN and summary/raw mismatch require new run evidence. HTTPS environment's “eight migrations” string is stale; fixture loads all9 built files.

Reopened BOOT-01 andCAT-01/03/04/06/08; roadmap55/216 checked,161 pending. CAT-10 remainsPARTIAL with Assessment race and diagnostic gaps. Phase04/ID-11/AWS/production ledger unchanged. Review-owned containers stopped after checks, volumes preserved; disposable DB/logins removed. No stage/commit or unrelated Web edits.

Final review closure: `npm run quality` PASS after report/status/evidence updates (46 operations/425 examples); review fixture/config Prettier check and `git diff --check` PASS. Recounted55 checked/161 pending. PostgreSQL cleanup check found0 extra databases and0 temporary Catalog logins; dedicated Postgres and root Mailpit stopped with volumes retained.

## Catalog fixes and architecture conformance — 2026-10-07

[Report](catalog-fixes-2026-10-07.md)/[new evidence](evidence/catalog-fixes-2026-10-07/README.md) close GR-01–06 locally. Correctness fixes preserve pure business layers, public facades, UoW/lock order, receipt replay, pg/SQL decision and immutable migrations. Presentation declares128KiB exam/512KiB question/1MiB import caps; global HTTP has only generic bounded metadata. Unicode counting aligns with JSON Schema, UTC calendars reject impossible dates and public projections match exact OpenAPI DTOs.

| Check | Fresh result |
| --- | --- |
| Publication RED/GREEN |4 failed/2 passed before clock fix →6 PASS; real blocked connections, initial/republish, exam/question lock-close, timeout/rollback/same-key retry/replay |
| Calendar RED/GREEN |4 failed/16 passed →20 PASS; final23 Catalog policy cases include3 later Unicode regressions |
| HTTP RED/GREEN |5 failed/6 passed →11 PASS; Unicode extension2 failed →final13 PASS |
| Root npm test |PASS:89 API Jest/13 suites +37 Node +73 Web Vitest/16 files =199 cases |
| Full real-PG/HTTP/SMTP |83 PASS/5 suites,0 skipped; all9 migrations/restricted roles |
| Identity browser HTTPS |10 PASS; actual latest AppModule/Web live build/SMTP; migrationCount9 derived from built provenance |
| Lint/quality/contracts/typecheck/build |PASS;46 operations/425 examples and normalized import boundaries |
| Fresh focused diagnostic |1 PASS/10 intentionally deselected only for this additional measurement; full83-case run above has0 skipped |
| Formatting/assets/diff/cleanup |Recorded in new checks.json/manifest; nine source/built migrations match baseline, historical raw review/diagnostic hashes retained |

Final frozen run58451c3f-aa1e-4698-86e7-1c1218fad576 executed alone after the full suites.25 samples/operation,100 questions/2 sections per new publication: browse p95/p99=5.126/6.270ms; detail1.681/2.060ms; publish42.770/103.994ms.50 read statements,425 publish statements,0 errors,25 transaction/75 lock observations. Read transaction n0 has null percentiles, not0ms. Exact SQL capture/stripped plans/source/config hashes and generated README come from the same raw file. Not comparable to historical reduced-query/different-dataset runs; no SLO/RPS/AWS/cost improvement claim.

Harness corrections before acceptance: unused HTTP fixture variables fixed after lint failure; a missing TEST_DATABASE_ADMIN_URL invocation aborted before cases; CSRF expected403 matches existing contract; rounding fixture adjusted for floating-point tie. Old review fixture was not rerun because it writes archived probes. DevelopmentDB55432 and unrelated UI visual artifacts preserved. BOOT-01/CAT-01/03/04/06/08 restored:61/216 checked,155 pending. CAT-10 actual Assessment start race, ID-11/live SES, Phase04 and production ledger remain open.

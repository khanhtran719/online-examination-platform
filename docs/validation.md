# Validation log

Updated 2026-10-06. Latest scope: architecture §5 source/tooling normalization, complete12/12 with fresh152 test cases and actual API/worker/operator/migration checks. No ORM implementation. ID-07/browser and ID-11/live SES remain PARTIAL. Initial sections record historical checks; fresh evidence is in the final source-normalization section. No AWS capacity/cost/production claim.

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

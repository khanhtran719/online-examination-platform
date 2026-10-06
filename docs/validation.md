# Validation log

Updated 2026-10-06. Latest scope: DB-01–11 PostgreSQL foundation (Phase 03); DB-12 runbook partial. No application/AWS capacity claim is made. The initial table below records bootstrap checks; latest results are in the Phase 03 section.

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

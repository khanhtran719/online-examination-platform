# Validation log

Updated 2026-10-06. Latest scope: standards/bootstrap review plus Phase 02 specification and contract tooling. No application/AWS capacity claim is made. The initial table below records bootstrap checks; latest results are in the Phase 02 section.

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

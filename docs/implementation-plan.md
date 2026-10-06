# Implementation plan

## Active scope — architecture normalization review, 2026-10-06

The user requests updating architecture §5 and related standards, reviewing the existing API, explaining the `pg` choice, and planning normalization before further runtime work. Deliver documents and review only in this increment; source relocation and ORM installation are subsequent unchecked tasks.

Plan: (1) map `src/` to `apps/api/src`; reconcile shared pure contracts, Nest common helpers, repository ownership, infrastructure and worker entry points; (2) inspect Identity HTTP/application/persistence/UoW/config/worker code and regression tests; (3) adopt the requested placement guide through ADR-006 and update the owning standards/examples/profile; (4) record findings, current-to-target paths, dependency-ordered checklist, acceptance gates and persistence comparison protocol; (5) validate local links/anchors/contracts and review the documentation diff. Preserve API/session behavior, SQL schema names, immutable migration checksums and historical benchmark evidence. Do not claim an ORM performance/cost winner without a controlled comparison.

Progress and final checks are recorded in [normalization plan](architecture-normalization-plan.md) and [API architecture review](api-architecture-review.md). The existing 50/216 product checklist remains separate from this normalization increment.

Outcome: N-01–03 documentation/review/plan complete; runtime N-04–12 and persistence O-01–04 pending. Quality/contracts and26 tooling regressions pass; diff whitespace check passes. Source/SQL/package/HTTP contract unchanged. The next normalization step is the fail-first architecture guard extension before moving files.

The [marked roadmap](implementation-roadmap.md) is the delivery-status source. Initial narrowed work delivered standards/bootstrap, then user authorized contracts, PostgreSQL and Phase04 Identity runtime. Historical sections below record those increments; the Phase04 section records the prior runtime outcome. The active scope above records the new architecture review/documentation increment. AWS production acceptance remains pending.

Affected standards: AGENTS.md, architecture entry point, .ai architecture/rules/conventions/workflow/overview/module-template, project profile and ADR-001/002. New documentation: module guide, performance protocol, contract-test matrix, production acceptance ledger and experiment template.

Previously opened code work: pure Assessment Attempt lifecycle and exact-match scoring with fail-first Jest tests; TypeScript/ESLint/Prettier configs; local PostgreSQL/ElasticMQ Compose. These do not implement API/use cases/UoW/schema/session/worker/frontend/Terraform/k6. Unused runtime dependencies and nonexistent run commands are removed from the bootstrap so the current repository only advertises checks it can run.

Validation: domain unit tests, typecheck/build, lint, standards links/anchors/import/test placement, npm audit, Compose health/local queue. Record actual results in validation.md and tick matching roadmap IDs. No AWS resources are created or benchmark results fabricated. Git is not initialized; no diff/PR can be claimed.

Next implementation order after this scope: product contracts → database/UoW/Identity/Catalog → Assessment/scoring → reporting/browser/observability → Terraform/CI → dataset/load/failure/FinOps → evidence-based production acceptance. Each phase is split into small reviewable changes with tests and updated evidence/status.

## Review of completed checklist items

User requests reviewing the 18 completed items before advancing. Inspect each checked artifact and rule consistency, rerun appropriate local checks, and reopen/fix defects with regression tests before restoring completion status. Current findings: Attempt hydration permits inconsistent lifecycle/expiration state; import checker misses import-type/import-equals, bare Node network modules and technical-folder barrel imports; database task dependencies require later business flows too early. Check local SQS URL consistency and permanent guidance for stale turn-specific scope. Owner: Assessment domain for lifecycle invariants; quality tooling for literal import checks; standards/roadmap for documentation. No API/AWS implementation or migration/network production operation is included. Domain changes remain pure and transaction-independent. Required evidence: failing regressions, passing unit/tooling tests, lint/typecheck/build/quality, local Compose/DB/queue checks and explicit unresolved dev-audit findings. Record the final per-item verdict in docs/completed-checklist-review.md.

Review outcome: findings were repaired with regressions, the completed 18 items are retained with fresh evidence, and phase 02 is the next scoped work. See [completed-checklist review](completed-checklist-review.md).

## Detailed next-work report

The user requests a detailed report of the next work. Deliver [phase 02 plan](phase-02-plan.md), mapping SPEC-01–11 to decisions, owners, planned artifacts, acceptance examples, execution order and the gate before database/application implementation. This turn changes planning documentation only. The specification artifacts themselves remain pending; the roadmap retains 18 completed items. Validate document links and standards consistency with `npm run quality`; do not infer runtime or AWS verification from this report.

## Phase 02 execution — COMPLETE

The user authorizes implementing the reported next phase. Deliver SPEC-01–11: product/version/time/attempt/retry/release/ranking policies, permissions/import/retention, OpenAPI, versioned event schema, SLO/workload and acceptance-case traceability. Owners remain Identity, Catalog, Assessment and Reporting; writes retain the existing UoW/lock/outbox/inbox contract. Select and justify product defaults without changing architecture boundaries. Record any conflict as an ADR. Add dev-only OpenAPI/JSON Schema validation with fail-first tooling tests; validate schemas and examples, then run tests/typecheck/build/lint/quality. Update profile/ledger/roadmap with artifacts and measured local checks. API/SQL/worker/AWS implementations remain subsequent phases; no production commitment or benchmark is inferred from specification delivery.

Outcome: SPEC-01–11 artifacts delivered and [reviewed](phase-02-review.md), 48 tests/typecheck/build/lint/quality pass. ADR-003 bounds receipt storage without unsafe old-key replay. Roadmap now 29/212 complete; next phase is DB/migrations/UoW and the pending Git/bootstrap tasks, not AWS benchmarking without runtime/evidence.

## Phase 03 execution — DB-01–11 COMPLETE, DB-12 PARTIAL

User authorized continuation. Followed [Phase 03 plan](phase-03-plan.md): six immutable migrations, capability schema/snapshots/constraints, owner vs runtime roles, plain UoW with pg/AsyncLocalStorage, bounded pool/timeouts, connection-budget CLI, redacted observations/pg_stat_statements and real PostgreSQL tests. Applied local CLI migrations, performed [self-review](phase-03-review.md), repaired invariant gaps with failing regressions, and updated roadmap to40/212. [Database guide](database.md), ADR-004 and migration runbook explain implementation/limits. 67 unit/tooling +30 integration cases pass. Business use cases/AWS/benchmarks remain future phases. DB-12 is deliberately unchecked: runbook delivered, actual old/new image drill requires BOOT-10/CI. No background work remains. Next: Identity and composition roots; Git remote still unspecified.

## Phase 04 plan and authentication contract amendment

User requested a detailed implementation explanation, then amended Identity: email/password with single-use email verification links now, asymmetric private/public signed access/refresh, magic link and GitHub later. Deliver [Phase04 plan](phase-04-plan.md), [ADR-005](adr/005-email-verification-and-signed-tokens.md), updated rule/architecture/security/product/OpenAPI/SLO owners, roadmap ID-10–13 and focused fail-first contract tooling regressions. This amendment precedes Identity runtime implementation. Existing six migrations/UoW are inspected but unchanged; plan new forward migrations, schema/privacy/grant restrictions and Identity-owned durable encrypted mail outbox. Retain PG session authority, cookies/CSRF and bounded hashing; no auth cache, external provider framework or unnecessary mail queue. Final password at activation protects against attacker pre-registration. Signature algorithm ES256/P-256 is an unmeasured standards choice, not a FinOps result.

Review/evidence: [auth contract amendment](phase-04-contract-review.md). Roadmap remains40 delivered, now216 total/176 pending due to four new Identity items. Runtime ID-01–11/BOOT-10 remain pending; ID-12/13 LATER. Git remote/AWS account/region/sender and domain are unselected; no real mail or key material is generated in this amendment. Contract-only validation does not close crypto/session/email/browser/AWS gates.

## Phase04 runtime execution — LOCAL CORE DELIVERED, ID-07/11 PARTIAL

User authorized implementation, then requested rereading changed folders. Inspected and adopted module-level composition, grouped Identity ports/errors/persistence/security/mail/http/DTOs, technical platform error categories/idempotency, generic HTTP setup and null success envelope. Updated conventions/architecture placement guide and quality boundary tests without changing capability ownership.

Implemented BOOT-10/ID-01–06/08–10: two new forward migrations, private/public ES256 credentials, bounded Argon2, email activation/final owner password, sessions/refresh/reuse/logout/current permissions/profile receipts, audited operator bootstrap, encrypted email outbox/SMTP/SES adapters, least-privilege worker, fencing/retries/park/replay/maintenance. Hash/provider I/O outside UoW; user-first locks and durable security effects. Real regression tests repaired logout lost-ACK CSRF, concurrent login limit, bucket lifetime and final-attempt crash handling.

[Runtime review](phase-04-review.md), [operations runbook](runbooks/identity-operations.md), [experiment](../experiments/identity-local/README.md) and validation inventory record evidence. Roadmap50/216 completed; ID-07 browser HTTPS/WEB-02 and ID-11 live SES operations remain PARTIAL, ID-12/13 LATER. No Catalog work automatically started; no Git/remote/AWS resources. Full SLO/cost/restore acceptance is not inferred from local tests.

# Implementation plan

The detailed [marked roadmap](implementation-roadmap.md) supersedes the initial broad implementation plan after the user narrowed this turn to standards first. Initial delivered scope: update the supplied contract's project context and enforceable rules, write detailed work items/status/acceptance criteria, and finish already-started domain/test/dependency bootstrap. Application/AWS work remains planned.

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

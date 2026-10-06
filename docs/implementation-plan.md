# Implementation plan

The detailed [marked roadmap](implementation-roadmap.md) supersedes the initial broad implementation plan after the user narrowed this turn to standards first. Current scope: update the supplied contract's project context and enforceable rules, write detailed work items/status/acceptance criteria, and finish already-started domain/test/dependency bootstrap. Application/AWS work remains planned.

Affected standards: AGENTS.md, architecture entry point, .ai architecture/rules/conventions/workflow/overview/module-template, project profile and ADR-001/002. New documentation: module guide, performance protocol, contract-test matrix, production acceptance ledger and experiment template.

Previously opened code work: pure Assessment Attempt lifecycle and exact-match scoring with fail-first Jest tests; TypeScript/ESLint/Prettier configs; local PostgreSQL/ElasticMQ Compose. These do not implement API/use cases/UoW/schema/session/worker/frontend/Terraform/k6. Unused runtime dependencies and nonexistent run commands are removed from the bootstrap so the current repository only advertises checks it can run.

Validation: domain unit tests, typecheck/build, lint, standards links/anchors/import/test placement, npm audit, Compose health/local queue. Record actual results in validation.md and tick matching roadmap IDs. No AWS resources are created or benchmark results fabricated. Git is not initialized; no diff/PR can be claimed.

Next implementation order after this scope: product contracts → database/UoW/Identity/Catalog → Assessment/scoring → reporting/browser/observability → Terraform/CI → dataset/load/failure/FinOps → evidence-based production acceptance. Each phase is split into small reviewable changes with tests and updated evidence/status.

## Review of completed checklist items

User requests reviewing the 18 completed items before advancing. Inspect each checked artifact and rule consistency, rerun appropriate local checks, and reopen/fix defects with regression tests before restoring completion status. Current findings: Attempt hydration permits inconsistent lifecycle/expiration state; import checker misses import-type/import-equals, bare Node network modules and technical-folder barrel imports; database task dependencies require later business flows too early. Check local SQS URL consistency and permanent guidance for stale turn-specific scope. Owner: Assessment domain for lifecycle invariants; quality tooling for literal import checks; standards/roadmap for documentation. No API/AWS implementation or migration/network production operation is included. Domain changes remain pure and transaction-independent. Required evidence: failing regressions, passing unit/tooling tests, lint/typecheck/build/quality, local Compose/DB/queue checks and explicit unresolved dev-audit findings. Record the final per-item verdict in docs/completed-checklist-review.md.

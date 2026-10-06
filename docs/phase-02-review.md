# Review Phần 02 — Product/public contracts

Ngày: 2026-10-06. Phạm vi SPEC-01–11 và tooling kiểm tra contract. **Review và final validation PASS; đủ điều kiện chuyển Phần 03 database/UoW.** Đây không phải review application/AWS production chưa tồn tại.

## Artifact / gate evidence

| Checklist | Artifact và nội dung được đối chiếu |
| --- | --- |
| SPEC-01 | [Product §2](product-specification.md#2-scoring-and-question-validation--spec-01): ba loại câu hỏi, exact-match, points/section totals/rounding và ví dụ. Không có certificate conversion chưa xác định. |
| SPEC-02 | [Product §3](product-specification.md#3-publication-and-immutable-snapshots--spec-02): immutable publication, revisions/archive/unpublish, public snapshot capability. |
| SPEC-03 | [Product §4](product-specification.md#4-time-policy--spec-03): UTC/window/clipped deadline/time sau lock và các mốc biên. |
| SPEC-04 | [Product §5](product-specification.md#5-start-limit-and-resume--spec-04): một active attempt, quota xuyên version, FAILED/EXPIRED/replay/resume. |
| SPEC-05 | [Product §6](product-specification.md#6-autosave-marks-and-retries--spec-05), [ADR-003](adr/003-idempotency-retention.md): batch/version/conflict/receipt/window/retry và UI ACK monotonic. |
| SPEC-06 | [Product §7](product-specification.md#7-lifecycle-submit-and-recovery--spec-06): lifecycle/expiry/atomic outbox, transaction-local PROCESSING, FAILED replayPending/recovery. |
| SPEC-07 | [Product §8](product-specification.md#8-status-results-and-explanation-release--spec-07): status/result/review gates, freshness và polling. |
| SPEC-08 | [Product §9](product-specification.md#9-ranking-and-statistics--spec-08): best/ties/version/privacy/cursor/denominator, declared Reporting read sources. |
| SPEC-09 | [Permissions/import/retention](security-and-permissions.md): action/object matrix, sessions/CSRF/admin/import/audit/retention/restore controls. |
| SPEC-10 | [OpenAPI](contracts/openapi.yaml), [event schema](contracts/attempt-submitted.v1.schema.json), [HTTP/events guide](contracts/README.md): 44 operations, authorized DTOs/error/cursor/event/version compatibility. |
| SPEC-11 | [SLO/workload](slo-and-workload.md): all hot-route p95/p99, SLI/error population/query budgets, data/traffic and cost protocol. Targets unverified. |

Acceptance traceability: [AC-01–32](contract-tests.md). These cases are planned at DB/Identity/Catalog/Assessment/Async/Reporting/security/load/recovery phases; partial pure helper coverage is distinguished from future integration evidence.

## Findings repaired during self-review

| ID | Finding / impact | Correction / evidence |
| --- | --- | --- |
| P02-01 | OpenAPI example inherited an input without expectedRevision; factoring shared errors temporarily left a missing schema ref | Parser/Ajv rejected the contract. Added revision fixture and preserved referenced ErrorEnvelope; schema/example validation required by quality. |
| P02-02 | Validator used operationId as public allowlist; renaming admin operation to login could skip static authentication guard | Added failing regression; allowlist now binds method+path and rejects duplicate/missing operation IDs. |
| P02-03 | CSRF metadata alone omitted an Origin requirement; parseable-format but non-finite timestamp could be treated as manual submit | Separate RED regressions; enforce required Origin for unsafe methods and finite timestamp before deadline comparison. |
| P02-04 | Initial +20% capacity gate would invent extra permanent capacity without evidence | 2,000 remains required; 2,400 is measured headroom experiment, not an automatic provisioning requirement. |
| P02-05 | FAILED polling could stop despite an accepted operator replay | Durable replayPending metadata, same submission identity, atomic pending-clear and polling rule added to product/OpenAPI. |
| P02-06 | Leaderboard opt-in scope/read ownership needed precision | Global profile opt-in + per-version publication enablement; Reporting public read projection declares visibility sources and avoids private repository access. |
| P02-07 | Hot-path budgets originally omitted authoritative distributed rate-limit DB work | Baseline bounded PostgreSQL counter port, explicit extra security query in SLO/OpenAPI budgets; no hidden/free Redis or network operation assumed. |

No Domain/Application imports or runtime logic were changed. ADR-003 specializes previously unspecified receipt TTL/pruning/retry semantics; no framework/UoW/outbox/inbox boundary exception. New dependencies are dev-only Swagger Parser/Ajv/format validation; no AWS resource/cache/runtime abstraction added.

## Validation and remaining limits

Final commands/results are recorded in [validation log](validation.md): **48 tests pass** (28 domain +9 quality +11 contract), typecheck/build/lint/quality pass; 44 operations, 411 schema/media example occurrences (shared examples repeat across operations), two valid event fixtures and selected boundary metadata validated. Manifest/lock match, zero runtime dependencies. Audit exit0 at high threshold, **20 moderate dev findings /0 high/critical**, unresolved under SEC-06. No Docker/DB/SQS runtime rerun is needed for this documentation/tooling scope; no migration/API/worker/browser/AWS/k6 has been implemented.

Static checks prove schema/example constraints and selected declared metadata, not RBAC execution, cookies, CSRF runtime, transaction consistency, receipt clock logic, leases, ranking privacy, SLOs or cost. Public contracts contain finite bounded payloads and concrete policy defaults; they are not a production security/performance acceptance. New unit tests do not replace AC integration/failure cases.

Open deployment inputs remain AWS account/profile/region, origin TLS/certificate/network/compute/DB sizing and measured traffic/cost/telemetry budgets. No blocking product decision remains for Phần 03; defaults can be changed through explicit versioned decisions/tests. Database phase must implement constraints, migration/UoW and integration checks before application flows; BOOT-09/10 remain pending.

# ADR-004: PostgreSQL durable boundaries and initial schema

Status: accepted, 2026-10-06. Implements ADR-001 and the Phase 02 contract without changing module boundaries.

Use capability-owned PostgreSQL schemas, normalized frozen question/options/keys and answer selections, composite FKs and a partial unique active-attempt index. Scalar historical bank provenance survives mutable bank changes. Text with CHECK constraints supports explicit staged value changes; PostgreSQL enums/extensions/JSONB GIN/partitioning are not added without a query or operational need.

Freeze snapshot creation to the server-assigned publication transaction (xid8) and permit runtime INSERT/SELECT only. Deferred publication validation checks complete immutable content. Deferred completion constraints protect result/COMPLETED atomicity and reject durable PROCESSING in the adopted transaction-local grading model. Runtime column privileges and a submission guard preserve ownership, deadlines, accepted identity and outbox intent. These database safeguards complement domain/application checks; they do not move scoring/authorization/retry policy into a database business module.

Separate owner/migration and runtime roles. Use one infrastructure-owned pg pool/context per process, bounded admission/timeouts and verified production TLS; application sees only the UnitOfWork port. No managed proxy/cache/new AWS service is justified by local correctness tests. Guards add bounded server work; benchmark this work and indexes with the real workload before sizing. Removing a safeguard for performance requires an equally strong verified guarantee.

Initial bundle has no deployed predecessor. Category correction is a new immutable migration, fails rather than guessing historical data and removes the inappropriate draft-category public browse index. Any production schema evolution after this baseline must follow the expand/contract runbook and old/new image test. That test remains pending; no compatibility, RPO/RTO, SLO or cost conclusion is inferred from this ADR.

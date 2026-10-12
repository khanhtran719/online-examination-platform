# ADR-016 — bounded report responses and source review

Status: accepted for local REP-07 implementation,2026-10-12.

Context: Architecture §§13C/28/29 and rules R-33/R-45 allow optimized private
Reporting SQL while requiring explicit DTOs and review of cross-module sources.
Three services forwarded query objects or object-rest values. TypeScript does not
strip undeclared runtime properties; adapter changes could expose additional PII
or answer review. Comments alone did not enforce migration consumer review.

Decision: construct active-candidate, submission, completed-score/section and
candidate best/latest DTOs explicitly in Reporting Application. Keep null pending
scores and force Admin score `review:null`. Other reports already select their
public fields explicitly. Enforce requested rows+1 before slicing, max20 score
sections and max10 statistic options. Fail through the existing safe503 error
boundary before a successful access audit when a projection exceeds its contract.
No transport/infrastructure import is introduced into Application or Domain.

The current extraction contract is paged JSON, default20/max100 and existing
scoped cursor TTLs. It remains a live read. CSV/XLSX, all-records requests, PII
expansion and arbitrary offset/filter inputs remain unsupported400. A future bulk
export needs its own purpose, permission, consistency, lifecycle and cost review;
this decision does not create that feature or an unlimited export permission.

Tooling inventories all7 private Reporting SQL adapters/ports, their exact reviewed
checksums and schema-qualified physical sources. All forward migrations require
renewed consumer review receipts. Disposable PostgreSQL tests compare the full
consumed table column/type/typmod/nullability signatures after the migration chain,
exercise drift/rollback and execute every adapter with the restricted API role.
Existing integration tests cover nonempty joins, scoring, permissions, freshness
and audit rollback. Full table signatures deliberately require review even for an
unused newly added column; explicit response mapping prevents automatic exposure.

Consequences: extra bounded DTO allocations; O(page size) and O(sections/options)
work, no additional SQL/network round trips. No new resource, migration, index,
dependency, event, cache, worker or public endpoint. The source manifest is build
tooling, never a runtime query registry. Hashes document review and detect changes;
they cannot prove semantics. The simple fixed FROM/JOIN inventory is not a SQL
parser. Constraints, triggers, grants, query plans and dynamic SQL require human
review and appropriate integration tests. Full migration hashes intentionally gate
even an apparently unrelated migration so ownership impact is assessed explicitly.

Validation and limitations: [plan/review](../reporting-limits-2026-10-12.md),
[runbook](../runbooks/reporting-limits.md). Existing SQL and19 migration files are
unchanged. No comparison winner, sustainable capacity, HTTP SLO, AWS savings or
production acceptance is inferred from these correctness checks.

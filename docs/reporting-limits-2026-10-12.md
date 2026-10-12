# REP-07 — bounded reports and schema consumer review

Active scope2026-10-12: **COMPLETE locally**. Production NOT ACCEPTED.

Reporting owns these read projections; Identity owns current authorization,
Catalog frozen scope and Assessment lifecycle/scoring. Existing private query
ports remain read-only. Admin revalidation, projection and mandatory safe access
audit share the existing UoW; no new locks, writes to business sources, outbox,
cache, AWS resource, migration, dependency or public endpoint is required.

V1 extraction means existing JSON pages, default20/max100, opaque scoped cursor.
No CSV/XLSX/all-records contract exists. Those formats, PII expansion and arbitrary
filters must remain rejected. Pagination is live, not a durable consistent export;
no automatic whole-dataset download or snapshot promise is added. A future bulk
export requires a separate permission, purpose/PII policy, retention, bounded job
and operational decision before implementation.

Invariants: responses select declared fields at every nested level; email, display
name, credentials, answers, scoring keys, question text and private audit reasons
never enter these DTOs. Candidate/admin identifiers remain permission-scoped;
public rankings retain version-scoped aliases. Source pages may contain at most
requested size+1, scores at most20 sections, statistics at most10 options. Invalid
source shape fails closed through the existing technical503 boundary before a
successful access audit. Validation must preserve authorization, audit atomicity,
cursor TTL, null scores and query budgets.

- [x] RL-01 Inspect contracts, rules, ownership and migration/history protection;
  record this bounded plan before implementation.
- [x] RL-02 Fail-first regressions for accidental top/nested PII, source overflow
  and unsupported export/query inputs; implement explicit private DTO mapping.
- [x] RL-03 Inventory all7 Reporting SQL consumers and physical schema signatures;
  executable reviewed-source/migration gate in quality with mutation regressions.
- [x] RL-04 Real PostgreSQL schema drift/rollback contract checks and HTTP paging,
  permission and output-limit evidence through existing production composition.
- [x] RL-05 Relevant/full checks, unchanged migration/history verification,
  cleanup, architecture/security self-review and evidence-backed checklist closure.

Source dependency gate is tooling only: explicit consumer/source lists, reviewed
query/port checksums, migration receipts and physical table signatures. New SQL
consumer, changed query/port or forward migration must be reviewed. PostgreSQL
tests verify consumed table column/type/nullability signatures after migration;
existing report integrations verify actual joins, source permissions and behavior.
This gate records review; it cannot establish semantic correctness by hashes alone.

Validation: RED→GREEN units, tooling mutations, real PostgreSQL schema drift in
rollback-only fixture, report HTTP tests, full root/integration, lint/typecheck/
build/contracts. No SQL performance optimization or AWS capacity/cost claim is
planned. Existing query count budgets remain enforceable. REP-08 wider scope,
freshness/index/rollback evaluation and REP-04 privacy lifecycle stay open.

## Closure review

Reporting Application owns explicit safe DTO mapping and technical projection
bounds. Domain score/counter policies remain unchanged; Infrastructure private
queries keep their optimized SQL. Current Identity permission, admission, UoW,
mandatory safe audit, cursor scope/TTL and source ownership remain intact. No
framework/client import, repository/UoW leak, new event/outbox/cache/lock or extra
network/query call is introduced. No public facade, endpoint or envelope expands.

[Evidence](evidence/reporting-limits-2026-10-12/README.md):644 root tests
(492 API +53 tooling +99 Web),418 full integration/24 suites/0 skipped, lint,
typecheck/build/quality/contracts48 operations/445 examples PASS.17 new Application,
11 tooling and8 PG/TCP cases.7 query adapters unchanged,19 source/build migrations
match and609 protected old files unchanged. Disposable databases/logins/connections
are0; test containers stopped/volumes retained. The first PG nullable-drift test
selected a nullable column and was corrected; retained logs distinguish fixture
failure from runtime behavior. No Web changes/browser rerun or SQL optimization.

R-58/R-59 and workflow §§47–48 review: owning read path/DTO/source/UoW/error/test
contracts explicit; no new abstraction beyond private response functions and a
build-only consumer gate. Local named deliverables complete; CSV/XLSX/consistent
bulk export need a future separate contract. REP-07 can be checked for these
report/extraction limits and query contracts; broader REP-08 and REP-04 remain
unchecked. Production NOT ACCEPTED; AWS capacity/cost/SLO and restore gates open.
No deploy, commit or PR. Next proposed bounded increment: REP-08 review of data
scope, projection freshness, query/index plans and audit rollback across reports.

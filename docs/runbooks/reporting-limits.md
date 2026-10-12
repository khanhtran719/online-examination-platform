# Report limits and migration consumer review

V1 returns authorized JSON pages. The same endpoint does not accept CSV/XLSX,
`export=all`, `includePii=true`, arbitrary filters or OFFSET pagination. Unknown
query keys return400; a missing session returns401 and missing permission403 before
query validation. Unsupported inputs do not create successful access audit events.
HTTP responses use the standard envelope, server correlation ID and `no-store`.

| Report | Access | Response limit | Freshness / cursor | Exposed identifiers |
| --- | --- | --- | --- | --- |
| Active candidates | `reporting.read` | Default20/max100 | Primary live deadline;60s scoped cursor | Candidate/attempt IDs |
| Submissions | `reporting.read` | Default20/max100 | Primary live ledger;15min actor/exam/version/size cursor | Candidate/attempt/version IDs |
| Completed score | `reporting.read` | One score/max20 sections | Primary durable score;no query parameters | Attempt/version/submission/section IDs |
| Candidate best/latest | `reporting.read` | Default20/max100 pairs | Primary retained selection;15min scoped cursor | Candidate/version/attempt IDs |
| Question statistics | `reporting.read` | Default20/max100 questions, max10 options each | Primary retained counters;15min scoped cursor | Frozen question/option IDs |
| Business metrics | `reporting.read` | One compact object, max7day paired window | Primary cohort/current backlog | No candidate identities |
| Audit | `audit.read` | Default20/max100 | Primary live keyset;15min actor/size cursor | Safe actor/target/correlation IDs |
| Public leaderboard | Current session + `leaderboard.read` | Default20/max100 | Primary visible best;15min epoch/scoped cursor | Version-scoped pseudonym only |

Candidate/admin IDs are restricted personal identifiers, not anonymous data.
Do not publish authorized report pages or forward them to third parties. Emails,
names, credential/session values, answer selections, scoring keys, question text,
operator identities and private audit reasons are excluded. Admin score review is
always null. Audit changed-field labels are allowlisted by the existing Domain
policy. Application response mapping also strips accidentally added adapter fields.

Each Admin request revalidates the current account/session/permission and writes
one safe access audit inside the existing UoW. Each projection uses one SQL
statement; auth/admission/audit-inclusive existing budget is8 statements per Admin
read. A page requests one extra row for continuation, never emits more than100.
Oversized source rows/options/sections fail503 with no returned report or committed
successful read audit. Operator investigation uses correlation IDs and bounded
technical logs; do not log the source payload to investigate a mapping error.

A cursor bounds ordering and scope; it does not reserve rows or create a consistent
multi-page export. Lifecycle, consent, retention, counters and audit entries can
change between pages. Expired/invalid cursors return400; restart from the first
page using the current session. No automatic all-pages extraction is implemented.
Bulk export requires a separate contract before adding a download or job: business
purpose, permission, PII columns, snapshot/freshness semantics, maximum records/
bytes/jobs, cancellation, expiry/encryption/access audit, restore/deletion behavior
and measured database/worker/resource cost. Avoid an unbounded request transaction.

For a source change:

1. Locate affected consumers in [dependency manifest](../contracts/reporting-dependencies.json)
   and their private query Port comments. Owners remain Identity/Catalog/Assessment
   or global audit; Reporting has read-only access.
2. Keep applied migration bytes unchanged. Add a forward migration. Review every
   consumer for join keys, lifecycle, purged/visibility semantics, schema types,
   source permissions, query plans, bounded output and PII implications.
3. Add relevant failing behavioral integration regressions. Update reviewed query/
   port checksums only after review. The quality gate rejects missing consumers,
   changed files, undeclared ordinary physical joins and unreviewed migrations.
4. Apply migrations to the disposable PostgreSQL fixture. Inspect physical columns,
   PostgreSQL types/typmods and nullability. Update affected table signatures
   deliberately; there is no automatic accept/update command. Signatures include
   all columns of consumed tables, even columns never selected for a response.
5. Update `migrationReview.files` exact SHA256 receipts and the complete reviewed
   query list, with a meaningful reason for the consumer review. Run quality,
   tooling mutations, Reporting/schema integrations and relevant/full regressions.
   Preserve earlier evidence; create a new dated evidence directory.

Repository checks: `npm run quality`, `npm run test:tooling`, `npm run test:api`.
Integration requires the existing disposable localhost55435 administrator and
actual restricted roles. Run `reporting-dependencies.spec.ts` plus affected Admin/
leaderboard integrations; full integration also needs the local SMTP fixture.
Never point these destructive fixture tests at a shared/production database.

This manifest is not a runtime health check or a proof of semantic correctness.
Dynamic SQL, constraints, triggers, grants, index/plans and response meaning need
review beyond the fixed FROM/JOIN inventory and shape comparison. A checksum can
record an incorrect review; runtime regressions remain required. No extra AWS
service is introduced. Cloud deployment, capacity, saturation and performance/cost
selection remain separate acceptance gates.

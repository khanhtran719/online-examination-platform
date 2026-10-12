# Import normalization — 2026-10-12

Status: COMPLETE locally. This is a developer-tooling/refactoring increment before
WEB-03. It preserves business behavior, public HTTP/event contracts, SQL,
transaction ownership and the dependency permissions in architecture §5/R-76.

## Checklist

- [x] **IMP-01** Shared deterministic ESLint import/export groups, duplicate/type
  import policy and a command that checks both API/tooling and Web.
- [x] **IMP-02** Canonical API aliases plus separate Web alias; guard resolves
  aliases before checking existing boundaries, with RED → GREEN regressions.
- [x] **IMP-03** API compiled rewrite/Jest mappings and Web Vite/Vitest mappings;
  compiled entry points resolve without runtime alias hooks.
- [x] **IMP-04** Normalize current source imports without changing business
  bodies, SQL literals, decorator metadata or CSS initialization order.
- [x] **IMP-05** Renew reviewed Reporting query/port source hashes only after
  preservation checks; applied migrations and historical evidence remain intact.
- [x] **IMP-06** Run lint, types, build, unit/regression and applicable compiled
  smoke checks; record exact outcomes and remaining limitations.

## Implementation decisions

Use simple-import-sort for import/export ordering and ESLint's duplicate import
rule with separate type imports allowed. TypeScript type-only import enforcement
must recognize legacy decorator metadata. Side-effect imports retain their order.
Do not enable another import sorter in parallel.

`tsconfig.paths.json` is the API mapping authority. Configure only shared/config/
global infrastructure roots and exact reviewed public facade entry points. Keep
same-module relative paths where they express local ownership. Web uses `@web/*`
within its own source root; plain Node `.mjs` tooling retains relative imports.

Extend the guard before rewriting source paths. Alias names never expand layer
permissions. Check static/type/re-export/import-equals/dynamic/require forms and
reject unsupported internal aliases or traversal. Preserve closed legacy paths.

Keep CommonJS API output and use the existing TypeScript compiler's module
resolver with a narrow emit transform in `scripts/compile.mjs`. Source maps are
emitted in the same pass; ts-jest maps the same aliases. Web config owns its
TypeScript/Vite/Vitest alias. Only the sorter plugin remains as a new development
dependency; no AWS/runtime resource is added.

Decision change after inspection: the proposed tsc-alias 1.9.7 trial introduced
six high audit findings through its braces/chokidar/globby dependency chain. It
was removed; root audit returned to its existing 20 moderate development findings.
The compiler approach is covered by executable static/dynamic/re-export/
import-equals resolution, ordinary-string preservation and source-map regressions.

## Review and evidence

Pre-change inspection found 119 deep imports among 648 API runtime imports
(maximum six parent levels), plus 37 in unit tests, and nine in Web source
including tests. Existing guard regressions passed 18/18. The expanded guard
passes 23/23, including alias traversal, protected-layer infrastructure access,
public facade permissions and static/type/re-export/dynamic/require forms.

| Scope, including unit tests | Before | After |
| --- | ---: | ---: |
| API imports with at least three parent levels | 156 | 28 |
| API maximum parent levels | 6 | 4 |
| API canonical alias imports | 0 | 252 |
| Web imports with at least three parent levels | 9 | 0 |
| Web maximum parent levels | 3 | 1 |
| Web canonical alias imports | 0 | 220 |

API counts cover 262 source/unit files; Web covers 123. Remaining deep API paths
describe same-module relationships. Total declarations change from 784 to 811
in API and 647 to 637 in Web because type/value splits and duplicate merging do
not preserve the number of declarations. These are readability measurements,
not throughput/latency or AWS savings measurements.

### Preservation and review

The read-only [preservation verifier](evidence/import-normalization-2026-10-12/verify-preservation.mjs)
compares a pre-edit digest baseline for 409 API source/integration and Web source
files. Normalized body syntax, SQL/other literals, canonical imported/exported
bindings and ordered explicit side-effect imports match. It intentionally permits
import order/type syntax and formatting changes. Comments/whitespace are outside
that comparison; compiled runtime checks additionally exercise Nest DI metadata.

All 1,121 protected old evidence/experiment/migration files remain byte-identical.
The 19 SQL migration source/build bundles match. Seven Reporting consumer query
hashes and the changed private-port hashes were explicitly reviewed and renewed
after that preservation proof; declared source tables/columns and migration
receipts did not change. There is no new migration, SQL logic, HTTP/event schema,
runtime dependency, AWS resource or cross-module permission.

### Accepted local validation

- Root tests: **653 PASS** = 492 API + 62 tooling + 99 Web. Nine new tooling
  regressions cover five alias-boundary cases, two compiler cases and two import
  autofix preservation cases. RED and GREEN outputs are retained.
- Lint for API/tooling/Web, safe format check, both typechecks, API build and live/
  demo Web builds pass. Quality checks validate 48 operations/445 examples.
- Node resolves all 387 literal dependencies across 209 emitted JavaScript files;
  configured source aliases do not remain as runtime `require` targets.
- Runtime dependency audits report zero findings in API and Web. Existing
  development findings remain: root 20 moderate, Web nine high. Final lockfile
  changes add only the pinned sorter in each application; the tsc-alias trial
  dependency chain was removed.
- Full unchanged integration rerun: **427/427 PASS, 24 suites**, 351.098 seconds.
  Includes compiled API/worker fault, graceful stop/restart and recovery checks.
- Actual compiled API/live Web + SMTP worker/PG + Chromium HTTPS: **10/10 PASS**;
  API/live Web rebuilt by the harness. Ephemeral SPKI trust is scoped to the test
  browser; this does not prove public PKI or SES delivery.

The first local integration invocation used the old development DB profile and
was rejected by disposable-database guards. The runner now uses a dedicated
[integration profile](../.env.integration.example); [database instructions](database.md)
describe dependencies and shell override behavior. The subsequent full run had
419/427 PASS: one deadline test timed out, followed by seven same-suite
ExamNotOpen failures. An unchanged focused rerun passed 17/17 in 4.564 seconds.
Host/DB clock difference measured after that failure was 2ms; this does not
establish the earlier cause. The unchanged full rerun then passed all 427 cases;
no assertion/timeout/runtime behavior was relaxed to hide that first failure.
The earlier failure remains a recorded environment/test-stability limitation,
not an attributed alias defect or a demonstrated production clock failure.

[Evidence index](evidence/import-normalization-2026-10-12/README.md) retains both
failed attempts and accepted runs, preservation proof, counts, audits and build
provenance. BOOT-11 closes this increment: **89/217 checked, 128 pending**.
No commit, PR or deploy was performed. The next proposed bounded increment is
WEB-03 real Catalog browse/detail integration.

No sustainable capacity, latency optimization, cost winner or production
acceptance claim follows from this refactor. WEB-03, REP-04 privacy lifecycle and
the broader AWS/security/reliability/performance acceptance gates remain open.

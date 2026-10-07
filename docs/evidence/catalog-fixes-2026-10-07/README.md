# Catalog fix evidence — 2026-10-07

Current local closure for GR-01–06: [report](../../catalog-fixes-2026-10-07.md), [checks](checks.json), [source/assets manifest](manifest.json), [safe HTTPS summary](identity-https-summary.json), [generated diagnostic](diagnostic/README.md) and [raw diagnostic](diagnostic/diagnostic.json). Historical [review RED](../catalog-review-2026-10-07/README.md) and [Grok diagnostic](../catalog-2026-10-07/README.md) are retained unchanged.

## Regressions and acceptance

| Area | RED reproduction | Final GREEN |
| --- | --- | --- |
| Publication lock-close |4 failed/2 control cases passed |6 concurrent real-PG cases |
| Calendar validation |4 failed/16 cases passed |20 after calendar fix; final23 with Unicode extension |
| HTTP body/schema/date |5 failed/6 cases passed |11 after initial fix; final13 with Unicode extension |
| Unicode boundaries |3 domain failed/20 passed;2 selected HTTP failed |23 Catalog domain +13 HTTP cases pass |
| Runner |Historical root npm test exited1 under mixed Jest/Vitest discovery |Root199 pass:89 API/37 tooling/73 Web |
| Full integration |Previous review63 pass with diagnostic deselected |83 pass/5 suites,0 skipped; diagnostic writes unique ignored output |
| Shared HTTPS |Latest API/Web build and actual Chromium/API/PG/mail worker |10 pass;9 built migrations, metadata derived from provenance |

No test is permanently disabled. Focused RED and diagnostic selections are separate commands from full integration. Current test sources are [Catalog policy](../../../apps/api/src/modules/catalog/domain/__tests__/catalog-policy.unit.spec.ts), [publication](../../../apps/api/tests/integration/catalog-publication.spec.ts), [HTTP](../../../apps/api/tests/integration/catalog-http.spec.ts), [core/diagnostic](../../../apps/api/tests/integration/catalog.spec.ts) and [freeze tooling](../../../scripts/__tests__/catalog-diagnostic-report.unit.spec.mjs). Archived review fixture was not rerun because it would overwrite probes.json.

## Reproduce with local test infrastructure

Node24/dependencies/Docker prerequisites follow [HTTPS runbook](../../runbooks/identity-https.md). Use a local TEST_DATABASE_ADMIN_URL configured for a disposable test cluster; never production credentials. Dedicated compose PostgreSQL binds only loopback55435. Root Mailpit11025/18025 supports the backend SMTP case; HTTPS suite uses its separate Mailpit13025/20025.

```sh
docker compose -f infra/identity-https/compose.yaml up -d --wait postgres
docker compose up -d --wait mailpit
# Set TEST_DATABASE_ADMIN_URL for the local disposable cluster before integration.
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run build
# Additional isolated diagnostic, after other load has ended:
npm run test:integration -- --runTestsByPath apps/api/tests/integration/catalog.spec.ts --testNamePattern='records exact projection'
# Pick its new UUID JSON; always choose a NEW destination directory.
node scripts/catalog-diagnostic-report.mjs .local/catalog-diagnostics/NEW_RUN_ID.json docs/evidence/NEW_RUN_DIRECTORY/diagnostic
npm run test:identity:https
git diff --check
docker compose -f infra/identity-https/compose.yaml stop
docker compose stop mailpit
```

HTTPS runner builds API/Web and drains/stops its dedicated containers automatically. Specs drop only their task-owned databases/logins. Final read-only cleanup verification found0 extra databases and0 temporary Catalog/Identity/test logins. Task-started containers stopped with volumes preserved; developmentDB55432 was not used.

## Provenance and privacy

Branch codex/catalog-review-fixes theo workflow§49; giữ nguyên working-tree edits, chưa stage/commit. HEAD baseline b057c3da4e8ab847c0af898120004484cf232e77; runtime Node24.17/darwinARM64, PostgreSQL17. Manifest hashes latest relevant source/tooling,9 source/built migrations and frozen artifacts. Original0001–0008 matchHEAD;0009 matches the review baseline. Historical diagnostic/probes/review fixture hashes match the preserved review manifest. No migration/checksum rewrite or new runtime dependency.

Diagnostic run58451c3f-aa1e-4698-86e7-1c1218fad576 was selected once after other suites ended; one sample per sequential call,25 calls per operation. It captures the actual adapter SQL/bindings in memory to EXPLAIN all aggregation work, then exports stripped plans/digests only. No raw SQL, parameters, keys, session cookies, email links or credentials. HTTPS summary contains only case names/status/duration and safe environment metadata. No raw auth traces or screenshot artifact is copied here.

Publication425 queries/25 calls,25 transactions/75 lock round trips; reads50 queries,0 errors. Missing transaction samples are null/not measured. Pool observations are event samples and lock round trips include SQL/network/wait; neither proves utilization or lock-hold duration. Generated README and raw share one run. Runtime fixtures can generate new ignored results repeatedly; freezing an existing destination fails rather than overwrites it.

## Acceptance limits

BOOT-01/CAT-01/03/04/06/08 restored; roadmap61/216 checked. CAT-10 actual Assessment start/publication race remains PARTIAL. ID-11/live SES, public PKI, AWS deployment, capacity/SLO/saturation/pool/FinOps/Performance–Cost Curve remain open. These diagnostics do not show an optimization improvement or production winner. Existing unrelated Web visual work is outside this acceptance.

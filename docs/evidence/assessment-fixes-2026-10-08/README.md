# Assessment fix evidence — 2026-10-08

Local AR-01–05 closure; [report](../../assessment-fixes-2026-10-08.md). No capacity/SLO/AWS cost acceptance.

| Artifact | Meaning |
| --- | --- |
| [baseline](baseline.json) | Pre-fix API source, ten migrations and protected archived evidence hashes |
| [RED](red.log) | Supported review regressions:7 failed/5 passed before runtime edits |
| [intermediate](intermediate.log) | After correctness fixes:11 passed, query gate still failed |
| [Assessment GREEN](assessment-green.log) | All23 supported Assessment cases passed, including security matrix |
| [full integration](integration-final.log) | 6 suites:105 passed;1 historical Catalog diagnostic deselected |
| [root checks](unit-tooling-web.log) | 104 API +37 tooling +93 Web passed |
| [lint/quality/contracts](lint.log) | Architecture/import/link/test guards and46 operations/425 examples |
| [HTTPS](identity-https.log) | Real AppModule/PG/SMTP/Chromium H01–H10 passed; also builds API/Web |
| [before raw](before/8b500b7f-f8ac-41f2-a536-a38f8b25442a.json) / [summary](before/8b500b7f-f8ac-41f2-a536-a38f8b25442a.summary.md) | 25 actors/100 questions/auth-inclusive baseline |
| [final raw](after/11e84464-706c-46ad-b0a7-827bf3c88feb.json) / [summary](after/11e84464-706c-46ad-b0a7-827bf3c88feb.summary.md) | Same configuration after final port separation; source hashes match |
| [comparison](comparison.json) | Generated from baseline/final raw, complete percentiles and transaction p95 |
| [preservation](preservation.json) | Archived artifacts and all10 source/built migrations unchanged |
| [manifest](manifest.json) | Final scoped source/evidence/check provenance |

The earlier after run9e712dfe-c0f4-485f-9510-fe3e262e2b28 is retained but predates final admission port separation. Final comparison uses11e84464. `added-security-test-harness-error.log` records one missing test Idempotency-Key; the fixture was fixed and23 cases passed. Other intermediate logs are retained rather than counted as final runs.

Reproduce on dedicated disposable local PostgreSQL with TEST_DATABASE_ADMIN_URL set by the operator. Run `npm run test:integration -- --runTestsByPath apps/api/tests/integration/assessment.spec.ts`; the diagnostic defaults to ignored `.local/assessment-diagnostics`. Set ASSESSMENT_EVIDENCE_DIR to a **new** directory for closure output. The writer uses UUID filenames and exclusive creation. Do not run the archived review harness, which writes its historical probes.

Each measured endpoint has25 sequential samples with offered/achieved concurrency1; DML EXPLAIN plans are planning-only. Same-process CPU/RSS include test/HTTP overhead. No optimum pool, saturation, AWS savings or production SLO can be inferred. Fixtures remove their databases/roles and services are stopped; retained Compose volumes are not deleted.

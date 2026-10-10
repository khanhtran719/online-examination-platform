# REP-01 evidence —2026-10-10

[Scope/closure](../../admin-monitor-2026-10-10.md),
[runbook](../../runbooks/admin-monitor.md),
[query experiment](../../../experiments/admin-monitor/README.md).
Local implementation; no production capacity/SLO/AWS cost acceptance.

- `protected-files.json`: before-edit hashes of451 prior files (18 applied source
  migrations +433 historical evidence files); new artifacts excluded.
- `diagnostic/diagnostic-*.json`: append-only independent query A/B/A and HTTP
  populations, exact SQL hash/natural plans, harness CPU/RSS, unavailable cost/
  capacity/allocation null. Earlier sample lacks HTTP window CPU/RPS; later sample
  adds those fields. Both retained; no missing metric inferred from the earlier run.
- `root-tests.log`: full API/tooling/Web unit checks.
- `typecheck.log`, `integration-tests.log`: closure checks and full restricted PG/
  HTTP/SMTP regression (status only accepted after successful completion).
- `post-format-integration.log`:18 focused cases pass after SQL layout changes,
  preserving tokens/bindings. New diagnostic sample remains independent.
- `final-lint-contracts.log`, `final-typecheck.log`: final code/document boundary,
  schema/example and type validation pass.
- `https-browser.log`, `https/{summary,environment,boundaries}.json`:10 actual
  AppModule/live Web/SMTP Chromium HTTPS cases pass; sanitized provenance/route
  boundary results,18 built migrations, no raw credentials/traces.
- `source-hashes.json`:24 current source/contract files for this closure.
- `verification.json`:419 root/299 integration/10 HTTPS,451 preserved files,
 18 source/build SQL bundles match; productionAccepted=false.
- `cleanup.json`:0 extra DB/LOGIN roles/client connections after all fixture runs;
  temporary fixture key directories0. Test containers stopped, volumes retained,
  development55432 untouched.

Fail-first Application run failed on missing new service before implementation;
first real HTTP run failed AJV because asOf was undeclared in metadata. Contract
now has route-specific fresh metadata/cursor expiry and IN_PROGRESS-only status.
Initial malformed EXPIRED seed was corrected to obey actual DB invariants.
Sandbox loopback EPERM and duplicate Jest config invocation were setup failures,
not runtime regressions or benchmark samples. No credentials, cookies, cursor
contents, request bodies or production personal data are stored here.

Remaining: concurrent poll/saturation, actual ALB/TLS/load, DB CPU/IOPS/WAL,
production sizing/cost/recovery, audit retention/browsing, other Admin reports
and Web integration. Only named REP-01 deliverable can close from these checks.

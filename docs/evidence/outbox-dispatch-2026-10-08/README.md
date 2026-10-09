# Local outbox dispatch evidence

Started2026-10-08, completed2026-10-09. [Report](../../outbox-dispatch-2026-10-08.md)
and [runbook](../../runbooks/submission-publisher.md). No live AWS evidence.

- `root-final.log`:280 PASS =144 API +40 tooling +96 Web.
- `integration-final.log`:173 PASS/11 suites/0 skips, clean exit.
- `dispatch-final.log`:29/29 publisher PG/SDK/independent fencing cases PASS after
  final SQL fixture layout changes. `dispatch-docker-offline.log` preserves the
  environment attempt with Docker stopped/ECONNREFUSED; it is not a product failure.
- `lint-final.log`, `typecheck-final.log`, `build.log`: source/contract/build checks.
- `dependency-audit.json`: successful production-only registry audit,0 advisories.
- `independent-fence-red.log`: independent original reproduction,2 FAIL/2 control PASS;
  final GREEN is part of full integration.
- `fence-red.log`, `ambient-red.log`, `sqs-red.log`, `supervisor-config-red.log`,
  `lifecycle-red.log`: fail-first controls and probes. Filtered probe skips are
  deliberate scope selection, not final acceptance skips.
- `postgres-red.log`, `postgres-check.log`, `dispatch-green.log`: early fixture
  construction failures before full-schema validity; do not count as behavioral RED.
- `integration-attempt-1.log`:172 PASS/1 fixture cleanup error; corrected final run above.
- `diagnostic-attempt-1.json`, `diagnostic-final.json`, `diagnostic-summary.json`:
  raw local no-network-queue diagnostics and nearest-rank derived summary. These
  are small finite runs, not sustainable capacity/SQS latency/cost measurements.
- `preservation-before.json`, `preservation.json`, `final-source-hashes.json`:
  immutable prior migration/expiry evidence checks and current source provenance.
- `cleanup.json`, `services.log`: disposable database/login/connection cleanup and
  owned local service shutdown. URLs, passwords, keys and message bodies are excluded.

The fixture uses PG17 plus real restricted roles. Transport tests use the installed
AWS SDK against a local HTTP fixture with synthetic credentials. No AWS service,
bill, DLQ, IAM/VPC deployment, grading result or production SLO is validated here.

# Grading consumer evidence — 2026-10-09

Local correctness/diagnostic evidence only. Final independent-boundary closure and
cleanup are captured; [report](../../grading-consumer-2026-10-09.md) owns the
scope. No live AWS/SQS/RDS/ECS, sustainable capacity, SLO or cost acceptance.

- `domain-red.log`, `transport-red.log`, `worker-red.log`, `architecture-red.log`:
  bounded captured fail-first scaffolding/contract runs. Invalid-selection unit
  assertions now require AssessmentError; self-review corrected Jest each-array
  wrapping so TypeError cannot falsely satisfy those cases.
- `migration-compatibility-failure.log`: bounded full-suite failure caused by the
  old upgrade test's exact expected migration list;0015 is now explicitly included.
  Migration rollback/provenance assertions and all old SQL bytes are retained.
- `root-final.log`:316 PASS (179 API/27 suites +41 tooling +96 Web),0 skipped.
  `integration-final.log`:197 PG/HTTP/SMTP/SDK cases/13 suites PASS before the extra
  independent ambient-UoW safety check. Subsequent closure is captured separately.
- `lint-final.log`, `typecheck-final.log`, `build-final.log`: repository checks pass
  at that captured source state; final post-boundary checks are separate artifacts.
- `boundary-red.log`: independent restricted-PG reproduction,2 FAIL/1 control PASS;
  joined quarantine and ACK-before-outer-rollback. `boundary-green.log`:3 PASS
  after the public root-transaction guard.
- `boundary-bootstrap-overlap-failure.log`: parent runner accidentally overlapped
  the independent runner's shared administrator-schema role bootstrap and failed
  with tuple concurrently updated. This is a harness concurrency failure, not
  behavioral RED. Both runners cleaned their DBs. Run bootstrap suites serially.
- `root-boundary-final.log`:316 PASS. `integration-boundary-final.log`:200 PASS/
  14 suites,0 skipped. `lint-boundary-final.log`, `typecheck-boundary-final.log`,
  `build-boundary-final.log` pass; contracts46 operations/425 examples unchanged.
  `build-formatting-final.log`: build after a comment indentation correction.
- `compute.json`: earlier diagnostic/source hash before TS formatting, preserved.
  `compute-final.json`: formatted Domain source;100/500 questions,10 options,
  300 warmups/2,000 samples. Heap delta is not allocated memory per job.
- `transaction-final.json`:10 sequential synthetic3-question PG jobs;15 statements
  per job including transaction boundaries. Observed short-run throughput is not
  sustainable jobs/task capacity.
- `maximum-final.json`: one500-question/5,000-selection PG correctness/timing
  observation,15 statements. It has no statistical transaction p95/p99 claim.
- `transaction-boundary-final.json`, `maximum-boundary-final.json`: full-suite
  rerun diagnostics saved separately. Observed3-question elapsed91.7→112.2ms and
  maximum transaction151.5→216.7ms vary; neither is an optimization/capacity claim.
- `sql-format-preservation.json`:55 current adapter/fixture query token sequences
  preserved during source layout formatting; parameter code stayed untouched.
- `preservation-before.json`:217 prior migration/evidence files captured before
  implementation. `preservation-final.json`: all217 unchanged.
- `source-hashes.json`: final changed source/config/test/report hashes, excluding
  concurrent Web docs and historical evidence. `migration-bundle-final.json`:
  all15 source/built SQL bytes match. `checks.json` records final command outcomes.
- `cleanup.json`, `cleanup-services.log`: zero temporary DBs/logins/connections,
  owned PG/Mailpit stopped with volumes preserved and development DB untouched.

Reproduction prerequisites: disposable PG17 on55435 and root Mailpit on11025/18025.
Never use the long-lived development DB on55432. Tests create/drop isolated DBs and
synthetic LOGINs; workers inherit narrow NOLOGIN groups. Build first for compiled
SIGTERM coverage, then run root and integration commands. The test-specific global
setup supplies TEST_DATABASE_ADMIN_URL; omit real secrets from saved logs. Optional
GRADING_EVIDENCE_FILE/GRADING_MAX_EVIDENCE_FILE write diagnostics to a fresh evidence
directory. Pure compute command:

```sh
npm run build
node --expose-gc scripts/grading-benchmark.mjs /private/tmp/grading-compute.json
```

No absolute timing threshold is imposed on a laptop correctness suite. The500-row
test asserts durable points/counts,5,000 option contributions and constant statement
count. SQL/broker/timeouts/rollback/ownership assertions determine correctness.

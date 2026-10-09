# ATT-07 review-fix evidence — 2026-10-08

[Closure report](../../assessment-expiry-fixes-2026-10-08.md): ER-01–04 CLOSED locally; ATT-07 restored,70/216 checked. All production gates remain separate. Original review/implementation raw bytes are immutable.

| Artifact | Meaning |
| --- | --- |
| [baseline-hashes.json](baseline-hashes.json) |228 existing source/historical files captured before changes;75 archived evidence files |
| [red-integration-corrected.log](red-integration-corrected.log) | Valid independent restricted-PG RED:6 failed/5 controls passed before fixes |
| [red-retry-unit.log](red-retry-unit.log) | Healthy row cannot progress after recomposition on the original sweep |
| [red-lag-unit.log](red-lag-unit.log) | New helper initially absent; this is not the original mislabeled-lag product proof, which remains in the independent review |
| [final-root-tests.log](final-root-tests.log) |254 PASS:118 API/40 tooling/96 existing Web |
| [final-integration.log](final-integration.log) |8 suites/144 PASS/0 skipped, including21 independent fix cases and real HTTP/SMTP/compiled process controls |
| [final-lint-with-regressions.log](final-lint-with-regressions.log), [final-typecheck-with-regressions.log](final-typecheck-with-regressions.log), [final-build.log](final-build.log), [final-measurement-lint.log](final-measurement-lint.log) | Supported code/architecture/contracts/build checks;46 operations/425 examples |
| [manual-query-budget.json](manual-query-budget.json) | Derived fresh auth-inclusive budget/source projection;25 calls/route,11/4/4/11/10/3 statements, ceilings unchanged |
| [before/raw](before/raw) | Four actual BEFORE healthy-sweep runs at baseline source/config; v1 commit field means acceptance only |
| [accepted/raw](accepted/raw) | Canonical final source:4 timed sweeps,1 compiled worker run,1 natural-index diagnostic with12 plans |
| [accepted generated summary](accepted/measurement-summary-2026-10-08T144904538Z.md) | Acceptance and calibrated COMMIT ACK observations separated; index and compiled modes not disguised as HTTP/commit measurements |
| [comparison.json](comparison.json) | Matching before/after datasets/configs, index counterfactual, worker durability and final raw source-hash verification |
| [preservation.json](preservation.json), [final-source-hashes.json](final-source-hashes.json) | Applied migration/history preservation, explicit source changes,13 built/source assets and final test/source hashes |
| [cleanup.json](cleanup.json), [cleanup-services.log](cleanup-services.log) |0 fixture DB/logins/connections; owned PostgreSQL/Mailpit stopped, volumes retained |
| [checks.json](checks.json), [delivery-quality.log](delivery-quality.log) |Final counters/scope/check outcomes and documentation/contract/diff validation |

Intermediate artifacts are deliberately retained. `red-integration.log` had an invalid publication fixture; `intermediate-retry-unit.log` had an outdated fake/constructor shape; the agent run was loopback EPERM, not GREEN. `intermediate-integration.log` had17 earlier cases and failed with pool teardown pg57P01/SMTP assertion. Final cleanup waits for zero sessions instead of FORCE; final whole-suite run used stable tests/fresh Mailpit and passed. Raw protocol keys in the new failure log were redacted, without altering archived evidence.

`after`, `after-final`, `closure`, `index` are intermediate harness runs, not the canonical final-source population. In particular, early observation totals included the post-run SKIP LOCKED probe. The final timed window freezes CPU/RSS/pool/query/lock/transaction observations before post-run calibration/probe; separate probe counts remain. Intermediate bytes are not overwritten. Only `accepted/raw` is checked against all final source hashes. Before v1 totals and current timed totals do not have identical populations; compare matched throughput/dataset/config, not their query totals as the same query/request metric.

## Reproduction

Node24, PostgreSQL17.11 disposable test cluster on loopback55435, Mailpit11025/18025. Never use development PostgreSQL55432. Set `TEST_DATABASE_ADMIN_URL` only for the process; do not write passwords/keys into evidence. Migrations/fixture writes run through the existing test administrator, while claims/submissions/plans use restricted logins.

```sh
npm run build
npm test
npm run lint
npm run typecheck
npm run test:integration
EXPIRY_EVIDENCE_DIR=.local/expiry-new-run EXPIRY_MEASURE_ONLY=index node scripts/assessment-expiry-measure.mjs
EXPIRY_EVIDENCE_DIR=.local/expiry-new-run node scripts/assessment-expiry-measure.mjs
```

Use a new output directory, never one of the archived evidence directories. Raw and generated summaries use exclusive timestamped writes; index/worker/sweep schemas can coexist in a new run directory. Supply PostgreSQL/Mailpit before integration. The fixture runner proves corrupt0011 upgrade rollback, then clean0012/0013 apply and no-op rerun. It does not repair a real corrupt database or migrate long-lived development data.

Before source is recoverable at Git revision `d2a34a52cfd03d55485da1282253a779a0a9e44c`; baseline and raw source hashes are retained. Current compiled/source migration assets are identical. Measurement setup/calibration/probe/teardown are outside the timed sweep. Final raw contains CPU/RSS, pool, lock/transaction distributions, lag sample counts, clock uncertainty/drift and source/configuration provenance. Archive source and runtime configuration when reproducing in a separate checkout; do not roll back the working tree just to regenerate a historical result.

## Interpretation limits

The optional synchronous observer is invoked after the scheduler-owned root UoW resolves successful COMMIT; collector exceptions cannot retry acceptance. It records caller COMMIT acknowledgement calibrated to DB UTC, not physical WAL commit time. Successful ACK transactions form the observation population; rollback/unknown acknowledgements are not successful samples. `submitted_at - deadline` remains the domain acceptance metric. Seeded overdue age1–60s affects both distributions. Compiled worker leaves ACK lag unmeasured. Current clock bounds/drift are local calibration observations, not proof of clock discipline on AWS.

These runs are expiry acceptance, not scoring jobs. No sustained saturation, HTTP RPS, optimal pool, memory allocation/request, RDS failover/outage/SIGKILL matrix, SQS/result latency, CloudWatch overhead or AWS dollar value was measured. Cost and sustainable RPS are null in comparison, not zero. No performance–cost configuration is selected. Read [performance protocol](../../performance.md) and the [production ledger](../../production-acceptance.md) before production acceptance.

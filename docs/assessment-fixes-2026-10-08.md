# Assessment API fixes and architecture conformance — 2026-10-08

**AR-01–05 CLOSED locally.** User authorized fixing the [independent review](assessment-review-2026-10-07.md). CAT-09/10 and ATT-01–04 are accepted again with new evidence: roadmap69/216 checked,147 pending. This is local correctness/contract acceptance; AWS production acceptance remains open.

## 1. Findings and fixes

| Finding | Implementation | Proof |
| --- | --- | --- |
| AR-03/P1 stale publication after lock | Catalog locks the exam with FOR SHARE, then reads its current version/policy in a separate READ COMMITTED statement. The second statement includes serverNow. The shared lock stays held until Assessment attempt and receipt commit. | First publication and republish use real Catalog publish transactions, pause after actual update, observe start waiting in pg_stat_activity, then commit. Both HTTP starts return201 with the committed current version and one attempt. |
| AR-01/P2 option-set fingerprint | Normalize UUID casing and sort only selectedOptionIds before fingerprint; answer batch order and other arrays retain their meaning. Original input is not mutated. | Same-key reversed option set replays200; changed selection conflicts409; old receipt cannot overwrite a newer answer. |
| AR-02/P2 response byte overflow | Application uses QuestionPageSizer; module HTTP adapter measures the complete global envelope, metadata and actual signed cursor. Prefix search keeps the last returned item as continuation. | The old262,664-byte boundary fixture now fits262,144 bytes. All UTF-8/escaped pages are bounded, without skips/duplicates or key/explanation leaks. Oversized single items fail instead of exceeding the cap. |
| AR-04/P2 UUID spelling | Resource UUIDs are lowercase before path fingerprints/cursor bindings/membership; question/option IDs normalize before semantic duplicate checks. Idempotency-Key still requires lowercase UUIDv7. | Mixed-case save and path replay work; mixed-case question/option duplicates fail400; uppercase path continues an existing cursor and submit replay. |
| AR-05/P2 query ceilings | One authenticated admission statement, post-lock clocks and one bounded answer mutation statement remove redundant client round trips. No ceiling/grant/security control is relaxed. | All25 samples per endpoint: start11≤12, save11≤11, submit10≤10; reads4/4/3 remain within contract. |

Supported [Assessment suite](../apps/api/tests/integration/assessment.spec.ts) contains the review regressions, additional security checks and existing behaviors. The archived review harness was never rerun or edited. [Evidence](evidence/assessment-fixes-2026-10-08/README.md) includes RED, intermediate, GREEN, final raw runs and preservation checks.

## 2. Architecture decisions

These choices conform to architecture §5/13B–E and rules R-09/10/18/50/76/77. No exception to the Architecture Contract is introduced.

**Identity owns authenticated admission.** Assessment Presentation invokes the public RequestGuard.authorizeWrite capability. HttpSession checks exact Origin, cookie/header equality, HMAC, expiry and claim shape. Identity verifies access/refresh credentials through its token port and calls AuthenticatedWriteAdmission, a technical Application write-workflow port. Its PostgreSQL adapter combines current account/session predicates, CSRF family selection, permission gating and the existing keyed actor.write counter in one statement. IdentityQuery stays read-only. The shared principal SQL avoids predicate drift between ordinary authentication and admission.

Missing/invalid refresh falls back to a live access family; consumed refresh still binds CSRF with a rotated current access. Consumed/invalid access is rejected. Forbidden requests cannot consume the admission counter. The new path uses the same scope/key/200ms interval/burst20 as ordinary shared admission. SecurityControls supplies only a keyed subject identifier. JWTs, raw subjects and SQL never cross into global technical business imports or logs.

Admission is outside the business transaction. It cannot replace revalidation: Application still starts UoW, takes the Identity user lock, then reads the principal in a fresh statement. Account/session/permission changes committed while waiting therefore affect the mutation. Assessment ownership, receipt, attempt locks, version validation, Catalog choices, domain invariant and durable writes follow normally.

**Catalog owns publication serialization.** Joining version children in the original locking statement was unsafe after waiting for a concurrent publication. The fresh second statement is necessary; reducing it back to one locking JOIN would restore AR-03. Its serverNow avoids another clock round trip. PostgreSQL READ COMMITTED uses a new command snapshot; see [official isolation documentation](https://www.postgresql.org/docs/17/transaction-iso.html).

**Attempt repository remains the domain write port.** LockedAttempt returns a database clock evaluated outside a MATERIALIZED locking CTE, after LockRows has produced its row. Existing deadline-wait regressions and submit-at-deadline checks pass. No EntityManager, driver object, SQL or HTTP DTO enters Domain/Application. The now-only repository method is removed because callers no longer need it.

**Answer persistence stays inside the Assessment adapter.** At most20 validated answers enter one statement: delete old selections, UPSERT answer metadata through existing column grants, insert the selected set, and increment attempt revision. RETURNING dependencies order the effects. The statement does not delete and recreate the same answer row. Receipt is still a separate write in the same UoW; submit state/outbox/receipt still commit together. A version conflict or persistence failure rolls back all effects. This is one actual driver statement with multiple database operators, not hidden statements relabeled for the budget. [PostgreSQL WITH documentation](https://www.postgresql.org/docs/17/queries-with.html) explains shared snapshots and RETURNING communication for data-modifying CTEs.

**HTTP encoding stays outside business logic.** QuestionPageSizer is justified by the demonstrated complete-response cap. The Application controls item selection and cursor continuation; the HTTP adapter reuses the actual global envelope. Domain helper only compares measured byte counts. A bounded prefix search reduces repeated full serialization compared with testing every growing prefix.

## 3. Before/after observations

Same configuration digest, Node24/macOS ARM64/PostgreSQL17.11, pool maximum10, offered/achieved concurrency1. Each run has25 actors, one independent attempt per actor, one100-question publication, pageSize100 and one-answer save. Fixture/session setup is excluded; timings include HTTP authentication/admission/UoW and same-process test overhead. Final run:11e84464-706c-46ad-b0a7-827bf3c88feb. Baseline:8b500b7f-f8ac-41f2-a536-a38f8b25442a.

| Endpoint | Queries before → after | p50 ms | p95 ms | p99 ms |
| --- | --- | --- | --- | --- |
| start | 13 → 11 | 11.29 → 11.69 | 23.25 → 14.99 | 23.84 → 16.67 |
| questions | 4 → 4 | 11.99 → 7.23 | 23.34 → 17.73 | 56.00 → 30.77 |
| answers | 4 → 4 | 5.17 → 5.65 | 9.47 → 11.25 | 9.51 → 11.37 |
| save | 18 → 11 | 14.11 → 12.73 | 24.44 → 17.85 | 30.07 → 20.59 |
| submit | 13 → 10 | 10.41 → 11.08 | 25.56 → 18.32 | 236.46 → 18.93 |
| status | 3 → 3 | 3.61 → 3.90 | 6.33 → 7.14 | 15.85 → 8.70 |

The deterministic improvement is fewer client statements/round trips: start13→11, save18→11, submit13→10. Four pool acquisitions per write become two. Each run reached only one open pool connection and zero queued acquisition; this does not identify an optimal production pool. Read query counts stay unchanged.

Latency varies: start/submit medians and answers/status p95 increase in the final observation, while save p95 decreases. These small sequential samples do not prove causal latency improvement, sustainable RPS, capacity, SLO acceptance or cost savings. p99 at n25 is effectively the observed maximum. Raw CPU/RSS/query/lock/transaction observations and stripped exact-query plans are retained; RSS differences are not memory allocation/request. DML plans are planning-only; they are not EXPLAIN ANALYZE execution measurements. Plans are collected after the workload changes fixture state, so even read-plan row counts are not a reconstruction of the measured request. No saturation or Performance–Cost Curve claim is made.

## 4. Validation and preservation

- RED supported regression selection:7 FAIL/5 PASS; no runtime change yet. AR-04 additional path case explains the extra failure beyond the archived six.
- Intermediate after correctness/answer fixes:11 PASS/1 FAIL; only query-budget gate remained.
- Final supported Assessment:23 PASS. Includes concurrent saves on correctly bound independent UoWs, observed save/submit in both orders, receipt/outbox rollback, owner404, post-lock revoke and deadlines, plus real HTTP security fallback/throttle checks.
- Final six restricted-PG/HTTP/SMTP suites:105 PASS; exactly1 Catalog diagnostic writer deliberately deselected to preserve its historical output. Assessment diagnostic writes unique ignored outputs by default.
- Root npm test:234 PASS =104 API/37 tooling/93 Web. Web totals include unrelated concurrent UI work; this increment does not accept that UI.
- Actual AppModule/Chromium HTTPS:10 PASS, including existing Identity restart/lost-ACK cases. Those are Identity checks, not Assessment restart acceptance.
- Lint/quality/contracts, typecheck/build and diff check PASS.46 operations/425 contract examples remain unchanged.
- All10 migrations and archived Assessment review/original evidence retain captured checksums; compiled migration bundle matches. No new migration, grants, dependency or AWS resource.

One added security test initially omitted the required UUIDv7 fixture argument; the retained harness-error log and corrected full GREEN distinguish that test setup error from runtime defects. A preservation check raced the HTTPS runner's rebuilding of dist; its sequential final verification passes. Disposable DBs/logins are removed by fixture cleanup. Owned PostgreSQL/Mailpit services are stopped, volumes retained. No stage/commit or unrelated Web edit.

## 5. Marked closure and remaining work

- [x] AF-01 Baseline hashes, supported RED and comparable diagnostic before runtime edits.
- [x] AF-02 Catalog fresh post-lock publication and server time.
- [x] AF-03 Canonical option sets/UUIDs and full encoded question page bound.
- [x] AF-04 Architecture-aligned query reduction within unchanged ceilings.
- [x] AF-05 Regression/security/concurrency/HTTPS, comparable final diagnostic and preservation/self-review.
- [x] AF-06 Status/evidence updated together: CAT-09/10 and ATT-01–04 restored;69/216.

ATT-07 scheduler, ATT-08 full results/history, ATT-09 retention, full ATT-10/11 timeout/restart/scheduler coverage, grading/SQS/Reporting, ID-11 live SES, Phase04 and production acceptance remain open. Logical next increment is bounded deadline auto-submit using the same submission/UoW contract, with scheduler/manual-submit races and truthful status. It is not implemented by this fix.

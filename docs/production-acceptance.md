# Production acceptance ledger

REP-05 update2026-10-10: [Business metrics](admin-business-metrics-2026-10-10.md)
BM-01–06 COMPLETE locally; **85/216 checked,131 pending**. Additive Reporting
start-time cohort/current durable counts plus global pending/replay backlog,
primary asOf, paired max7day UTC window, current permission and safe access audit.
Combined HTTP/SQS metrics and Web parser unchanged/specification-only.38 new units/
18 PG cases;559 root/379 integration22 suites/0 skipped,18 post-format PG PASS;
lint/typecheck/build/quality/contracts48 operations/445 examples. SQL format
preserves435 tokens/bindings;18 source/build migrations match,521 prior files
unchanged,65 source hashes. SQS happy-path fixture timing separated from its100ms
deadline test; original first-full failure cause unconfirmed, runtime unchanged.
Cleanup0, test containers stopped/volumes retained. Natural100k/1M sequential
scan baselines,8 SQL/507–511bytes;1M HTTP p95≈571–646ms across independent runs
excludes TCP/TLS/ALB and proves no sustainable capacity/SLO/AWS savings. No new
schema/resource or browser HTTPS rerun. REP-04 privacy ledger/deletion/restore
stays SUBSET/unchecked. Next proposed REP-06 audit lifecycle; Web, technical
providers and AWS gates remain open, production NOT ACCEPTED. No commit/deploy;
prior workspace preserved on local codex/rep05-business-metrics branch.
[Evidence](evidence/admin-business-metrics-2026-10-10/README.md). Previous paragraphs
below retain their historical source/test states.

Latest REP-04 Admin subset update2026-10-10: [Best/latest candidate report](admin-candidate-results-2026-10-10.md)
BL-01–06 COMPLETE locally; roadmap84/216 checked,132 pending. Reporting-owned
exact frozen-version pairs select retained best COMPLETED by score/submit/UUID
and latest submitted including pending/FAILED with null scores. Current permission,
exact-version audit, stable candidate keyset and grading/replay/purge verified.
521 root/361 integration21 suites/0 skipped PASS; lint/typecheck/build/quality/
contracts47 operations/435 examples.35 new units/18 PG cases; deterministic SMTP
retry regression fixes the local test harness only, with no Identity runtime change.
18 source/build migrations match,493 prior files unchanged,56 source hashes;
cleanup0 and test containers stopped with volumes retained. Natural100k-attempt
fixture,8 SQL/page,44,604bytes; paced local inject p95/p99≈46.380/50.591ms excludes
TCP/TLS/ALB and proves no sustainable capacity/AWS savings/SLO. No new schema or
resource; no browser HTTPS rerun. REP-04 remains SUBSET and unchecked: independent
privacy ledger/deletion/restore still open. Web, audit lifecycle and AWS gates remain
open; production NOT ACCEPTED. Next proposed: REP-05 business metrics.
[Evidence](evidence/admin-candidate-results-2026-10-10/README.md).

Latest REP-03 update2026-10-10: [Admin question statistics](admin-question-statistics-2026-10-10.md)
accepted locally;roadmap84/216 checked,132 pending. Exact frozen version/all retained
COMPLETED attempts, zero counts, atomic replay/purge semantics, current permission
and exact-version access audit verified. Private Reporting projection/cursor/pure
count policy;8 SQL/page, no new migration/index/grant/key/package/resource.486 root/
342 integration20 suites/0 skipped PASS; lint/typecheck/build/quality/contracts46/425.
18 source/build migration hashes match,481 prior files unchanged, fixture cleanup0.
Maximum100/10-option local inject p95/p99≈39.297/39.854ms,92,313bytes;10k-question/
100k-option synthetic projection fixture and raw natural plans. No sustained
capacity/production SLO/AWS savings claim; no browser HTTPS rerun. Production NOT
ACCEPTED. REP-04 stays SUBSET; next proposed Admin best/latest reporting semantics.
Independent privacy ledger/deletion/restore, audit retention, Web and AWS gates
remain open. [Evidence](evidence/admin-question-statistics-2026-10-10/README.md).

Latest REP-02 update2026-10-10: [Admin submissions/scores](admin-submissions-2026-10-10.md)
accepted locally;roadmap83/216. Reporting private primary projections include
all unpurged attempts, optional frozen version filter and completed section scores;
current permission, mandatory audit and opaque15min keyset,8 SQL/read.452 root/
320 integration19 suites/0 skipped PASS; lint/typecheck/build/quality/contracts
46/425.18 source/build migrations match,472 prior files unchanged, fixture cleanup0.
No new schema/index/grant/resource/secret; no HTTPS rerun or AWS capacity/cost/SLO
claim. REP-04 remains SUBSET; next REP-03. Production NOT ACCEPTED. Web/Admin
review/audit retention/concurrent load/saturation/restore and AWS gates stay open.

REP-01 local update2026-10-10: [Admin active monitor](admin-monitor-2026-10-10.md)
has current permission/audit, primary DB freshness/deadline and bounded ID-only
cursor page.419 root/299 integration18 suites/10 HTTPS PASS;451 prior files preserved,
18 built migrations match, cleanup0. Scoped100k/2000-active A/B/A accepts no new
index/resource; diagnostic p95/p99 is not capacity, AWS cost or SLO acceptance.
Other Admin reports, audit retention/browsing, Web integration, independent privacy
ledger/restore, managed load/failure/rollout/FinOps remain open. **NOT ACCEPTED.**

Local update2026-10-10: [Public leaderboard](public-leaderboard-2026-10-09.md)
LB-01–05 delivered; REP-04 remains SUBSET. Current primary opt-out visibility,
frozen enabled version/best rank, pseudonyms/opaque cursors and transactional0018
epoch invalidation verified;396 root/281 integration17 suites/10 HTTPS PASS.
3 SQL/read; matched100k first/deep query p95≈300→248/355→271ms is scoped local
evidence, not sustainable capacity or AWS savings.18 built migrations match and
386 prior files unchanged; cleanup0. Admin Reporting, independent privacy ledger/
deletion/restore, Web business integration, k6 full lifecycle/varied distributions,
managed failover/rollout/images/FinOps remain open. **Production stays NOT ACCEPTED.**

Local update2026-10-09: [ATT-10/11 HTTP fault closure](assessment-http-faults-2026-10-09.md) adds26 compiled API/real socket/restricted-PG cases;375 root/268 integration/16 suites PASS,0 skipped. Start/save/submit ACK-loss, client timeout/commit ambiguity, API/backend pre-COMMIT kill, restart, lock/statement/pool timeout and bounded back-pressure verified, plus two-task duplicate/stale-tab and SIGTERM drain.17 migrations and364 historical files preserved; no runtime/dependency/resource change. These local fault samples do not establish healthy p95/p99, saturation, AWS recovery time or cost. Managed RDS/ALB/network/task failure under load, rollout/images/PITR/restore, Reporting/privacy/Admin and FinOps remain open. **Production status stays NOT ACCEPTED.**

Local update2026-10-09: [ATT-09 retention](assessment-retention-2026-10-09.md) accepted locally:375 root/242 integration PASS,0 skipped,18 new restricted-PG cases. Completed-only minimum7day receipts and365day payload/grace gates, fixed UTC/finite-time direct-RPC enforcement, atomic projections/audit, compact quota/duplicate identities and compiled stop/drain are verified.17 source/build migrations match;322 prior files preserved. Single-job timing/natural100k excluded-FAILED plan do not establish capacity, production SLO, RDS savings or AWS cost. Full ATT-10/11, Reporting/privacy/Admin, metadata/account/Catalog deletion and independent restore ledger, compatible rollout/image drill, AWS effective IAM/SQS/TLS/PITR/timed recovery remain open. **Production status stays NOT ACCEPTED.**

Local update2026-10-09: [Candidate result/history/review](assessment-results-2026-10-09.md) ATT-08 accepted locally, alongside the existing grading/recovery/publisher evidence.344 root/224 integration PASS,0 skipped; current owner/permission, frozen release/DB time, bounded cursor/256KiB review and3 auth-inclusive SQL calls/read verified. Natural100k history/key-gate plans and short sequential diagnostic samples exist.16 source/built migrations match;289 prior files preserved. These checks do not establish sustainable capacity, production SLO, AWS cost or allocation/request. ATT-09 retention, public leaderboard/privacy/Admin reads/replay HTTP, broader failure/load matrix, generation-aware rollout/image drill, AWS effective IAM/SQS/TLS and timed recovery remain open. **Production status stays NOT ACCEPTED.**

Prior local update2026-10-09: [ASYNC-10 recovery](grading-recovery-2026-10-09.md) joins the accepted [grader](grading-consumer-2026-10-09.md) and [publisher](outbox-dispatch-2026-10-08.md).327 root/214 integration PASS; restricted-PG terminal FAILED/quarantine/audit, operator-only concurrent/revision-safe replay, stale source/DLQ generation fencing, SDK ACK-after-COMMIT/redelivery and compiled worker/CLI evidence exist.16 built migrations match;15 prior migrations/239 historical evidence preserved. Local normal-grading diagnostics retain15 statements/job; they do not establish sustainable capacity. Admin replay HTTP, public result/history/privacy reads, retention and generation-aware rollout/image drill, AWS SQS/IAM/VPC/encryption, timed recovery/jobs/USD/end-to-end scoring SLO remain open. **Production status stays NOT ACCEPTED.**

Updated 2026-10-07. **Production status: NOT ACCEPTED.** No AWS deployment/capacity/cost/recovery evidence. [Identity runtime](phase-04-review.md) has local crypto/PG/HTTP/SMTP/lease/operator tests, actual entry-point smoke and [raw local diagnostic](../experiments/identity-local/README.md). Local [Chromium HTTPS proof](evidence/identity-https-2026-10-07/README.md) now exists; live SES/public PKI/AWS remain open. Contracts and [DB foundation](phase-03-review.md) remain locally validated; exam runtime/full production gates are not satisfied by these checks.

| Hard gate | Proposed target / requirement | Status | Evidence needed |
| --- | --- | --- | --- |
| Correctness/idempotency | no lost acknowledged answers or duplicate scoring effect | local Assessment/expiry/publisher/grader evidence; production incomplete | managed SQS/task-crash/replay/complete failure matrix |
| Security | RBAC/ownership/TLS/private DB/cache/encryption/secrets/IAM/WAF/audit | local Identity/browser + restricted business worker roles; production incomplete | broader browser/other capabilities, AWS effective config/IAM/public TLS/WAF and image review |
| Availability | ≥99.9%, monthly agreed SLI | unmeasured | eligible request/window/error-budget evidence |
| GET exam | p95 <250ms at specified workload | unmeasured | per-route k6/telemetry |
| Save answer | p95 <300ms at specified workload | unmeasured | latency + durable correctness |
| Submit acknowledgement | p95 <500ms | unmeasured | submit commit latency, scoring separately |
| Other hot reads / p99 | questions/status/result/leaderboard/browse/history targets in SLO contract | unmeasured | per-route latency/population/payload/query budgets |
| Unexpected errors | <1% under committed load | unmeasured | include timeout/legitimate throttling |
| Concurrent capacity | 2,000 active candidates across full lifecycle | unmeasured | start/save/submit/poll/rank scenario |
| Scoring | 99% durable results ≤60s from commit, proposed | unmeasured | outbox+queue+grading latency |
| Disaster recovery | RPO ≤5min/RTO ≤30min, proposed | unmeasured | timed PITR/restore and consistency check |
| Cost feasibility | minimum full cost satisfying every gate | unmeasured | comparable configuration curve |

| Required question | Current answer | Required source |
| --- | --- | --- |
| Maximum sustainable RPS? | chưa đo | stress → last feasible load → soak |
| Maximum concurrent users? | chưa đo | activity-defined full lifecycle test |
| First bottleneck? | chưa xác định | achieved throughput/latency/pool/CPU/IOPS/queue/generator |
| p95/p99 for each critical API? | Local Identity/Assessment/ranking diagnostics có; AWS committed-workload chưa đo | per-route distribution/samples/errors at committed workload |
| DB saturation point? | chưa đo | load steps/query plans/IOPS/locks/pool/WAL |
| Optimal DB pool? | chưa đo | pool sweep with task count/connection budget |
| Cache DB load reduction? | Redis chưa được bật | no-cache baseline, optional cache comparison or no-cache decision |
| Worker throughput/jobs per task/USD? | pure scoring + short sequential PG diagnostic có; sustainable/task/USD chưa đo | steady/backlog jobs throughput/full cost |
| Autoscaling reaction time? | chưa có AWS scaling | trigger→new ready capacity→backlog/latency recovery |
| Failure recovery time? | chưa đo | timed crash/failover/restore drills |
| Idle/normal/peak cost? | chưa đo | tagged usage/bill and stated allocation basis |
| Cost/1M requests? | chưa tính | achieved served requests and full run cost |
| Cost/1,000 users/concurrent-user-hours? | chưa tính | distinct users/activity/time basis |
| Cost/10,000 attempts? | chưa tính | durable completions + grading/polling cost scope |
| Highest-cost AWS service? | chưa có resource/bill | full service/network/telemetry breakdown |
| Gain from +$1 infrastructure? | chưa đo | adjacent feasible config marginal comparison |
| Impact of −20% full cost? | chưa đo | actual reduced-budget config with hard-gate rerun |
| Optimal configuration/Performance–Cost Curve? | chưa chọn/chưa có curve | measured feasible/infeasible points and decision |

Specified inputs: workload save/poll/payload distributions, permissions, explanation/ranking/attempt rules, all hot endpoint SLOs and audit/data retention. These are reproducible baseline choices, not proven optimal or real user traffic observations. Open deployment/evidence inputs: AWS account/profile/region, origin TLS/certificate design, compute/network/pool sizing, telemetry budget, workload calibration and measured feasibility/cost. Domain is unavailable; default CloudFront viewer hostname is an option, not evidence of a deploy or waiver of origin TLS.

Only tick [roadmap](implementation-roadmap.md) production tasks when the corresponding raw artifacts, config provenance and validation exist. Code/templates/local checks are recorded separately in [validation log](validation.md).

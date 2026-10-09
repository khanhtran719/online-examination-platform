# Production acceptance ledger

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
| p95/p99 for each critical API? | Identity local diagnostic có; exam/AWS chưa đo | per-route distribution/samples/errors at committed workload |
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

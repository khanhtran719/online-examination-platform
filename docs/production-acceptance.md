# Production acceptance ledger

Updated 2026-10-06. **Production status: NOT ACCEPTED.** There is no application deployment, AWS benchmark or production recovery evidence. Phase 02 [product](product-specification.md), [permissions](security-and-permissions.md), [API/events](contracts/README.md) and [SLO/workload](slo-and-workload.md) are specified/locally validated; their business runtime implementation and measured production validation remain pending. DB-01–11 [PostgreSQL foundation](phase-03-review.md) has local constraint/transaction/role evidence; this does not satisfy production correctness/security/SLO gates.

| Hard gate | Proposed target / requirement | Status | Evidence needed |
| --- | --- | --- | --- |
| Correctness/idempotency | no lost acknowledged answers or duplicate scoring effect | unverified | real DB/SQS races/crash/retry tests |
| Security | RBAC/ownership/TLS/private DB/cache/encryption/secrets/IAM/WAF/audit | unimplemented | security tests/effective config review |
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
| p95/p99 for each critical API? | chưa đo | per-route distribution/samples/errors |
| DB saturation point? | chưa đo | load steps/query plans/IOPS/locks/pool/WAL |
| Optimal DB pool? | chưa đo | pool sweep with task count/connection budget |
| Cache DB load reduction? | Redis chưa được bật | no-cache baseline, optional cache comparison or no-cache decision |
| Worker throughput/jobs per task/USD? | chưa có worker | steady/backlog jobs throughput/full cost |
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

# ATT-08 — Candidate result/history/review closure

Kết luận2026-10-09: **ATT-08 hoàn tất và nghiệm thu local**. Backend có ba API
Candidate đọc kết quả, lịch sử và review; status hiện hữu dùng cùng semantics
FAILED/replayPending. Roadmap **78/216 checked,138 pending**. Production vẫn
**NOT ACCEPTED**; không suy ra capacity/SLO/AWS savings từ test local.

## Phạm vi và hành vi

| API | Hành vi đã kiểm chứng |
| --- | --- |
| GET /v1/attempts/:id/result | Pending202, Retry-After2; COMPLETED200 với summary/sections; không trả keys/explanations |
| GET /v1/attempts/:id/review | Review riêng, frozen release policy/DB time, bounded cursor page và256KiB complete response |
| GET /v1/me/attempts | Chỉ lịch sử của actor, cursor DESC(startedAt,id), first-page watermark, score null khi chưa COMPLETED |

Current permission được kiểm tra trên mỗi request. Foreign/nonexistent404,
unreleased/missing permission403, revoked session401; no-store và safe envelope
giữ nguyên. FAILED không pending replay có pollAfterSeconds0; replay được operator
chấp nhận thì trở lại2, vẫn không có score cho đến COMPLETED. COMPLETED thiếu
result bền trả internal failure thay vì chế ra điểm0 hoặc pending.

Summary đúng integer points/percentage basis points, section order/correct/total
kể cả câu chưa trả lời. Review dùng câu hỏi/options/keys/explanation của version
đã chốt cùng answer đã commit; NEVER cấm, AFTER_COMPLETION yêu cầu completed,
AFTER_EXAM_CLOSE dùng frozen closesAt. Republish/unpublish không đổi policy hay
nội dung attempt cũ. Chỉ review đã mở mới chứa selected/correct options và lời giải.

## Kiến trúc và file chính

Assessment sở hữu read use case/DTO/query port. Controller xử lý HTTP, current
Identity permission và admission; Application gọi port và Domain rule thuần;
private pg adapter xử lý SQL. [ADR-010](adr/010-candidate-frozen-read-projections.md)
ghi rõ các immutable Catalog snapshot dependencies, consumer/schema ownership
và gate trước lookup key; không import private Catalog repository hoặc ghi bảng
nước ngoài. Không thay bộ contract kiến trúc, thư viện persistence hoặc grants.

File chính nằm trong modules/assessment:

- domain/review-release.ts và unit test policy/time/completion.
- application/services/candidate-results.service.ts, dto/candidate-results.dto.ts,
  ports/candidate-results.query.ts và services/attempt-view.ts.
- infrastructure/persistence/postgres-candidate-results.query.ts.
- presentation/http/assessment.controller.ts và assessment.module.ts composition.
- Existing cursor kinds và PageResult size port được mở rộng; API mutation không
  đổi. OpenAPI chỉ bổ sung description/query budget review đã khai báo từ trước.

Mỗi projection dùng một SQL parameterized statement; không hydrate aggregate,
không read lock/UoW, OFFSET, total COUNT, N+1 network round trips hoặc cache.
Domain sở hữu policy mở review; SQL thực thi cùng predicate trước projection key,
Application kiểm tra lại bằng authoritative facts. Unit test chỉ phụ thuộc port;
actual HMAC/HTTP encoding được chứng minh trong integration.

## Validation và bằng chứng

[Evidence](evidence/assessment-results-2026-10-09/README.md) giữ RED, fixture
failures, intermediate runs và final GREEN riêng; không sửa evidence cũ.

| Kiểm tra | Kết quả cuối |
| --- | --- |
| npm test |344 PASS:207 API/30 suites +41 tooling +96 Web |
| npm run test:integration |224 PASS/14 suites,0 skipped; PostgreSQL17 restricted roles/HTTP/SMTP/SDK fixtures |
| npm run lint |PASS:ESLint, Markdown links/anchors, import boundaries, placement, contracts |
| npm run typecheck / build |PASS |
| Contracts |46 operations/425 examples PASS; public schema/event shape không đổi |
| git diff --check |PASS |
| Preservation |16 source/built SQL migrations khớp;16 applied files +273 prior evidence files byte-identical |
| Cleanup |0 temporary databases/logins/other-DB connections; chỉ dừng PG55435 và Mailpit đã dùng, giữ volume |

10 PostgreSQL/HTTP cases mới kiểm tra actual grading/recovery output, ownership,
permission revocation, no-store, exact AJV response schemas, NEVER/AFTER_COMPLETION/
AFTER_EXAM_CLOSE, frozen republish/unpublish, escaped maximum content traversal,
cursor actor/attempt/pageSize/kind/signature/expiry, history ties/new starts/null
scores, section aggregates và natural plans. Existing mutation/worker/security
regressions vẫn chạy. Domain có8 policy cases; Application có9 admission/payload
cases. Exact close equality thuộc pure Domain test; PG test đổi frozen close
bằng quyền fixture riêng để qua thời gian xác định, rồi bật lại immutable trigger.
Đây là kiểm tra synthetic có kiểm soát, không phải repair được phép ở production.

## Đo local và giới hạn

PG17/Node24/macOS ARM64;20 sequential Fastify HTTP injections mỗi route trên
synthetic3-question attempts. Rate limit vẫn chạy; fixture bucket chỉ reset giữa
các series. Percentiles dùng nearest rank từ raw samples; p99 là maximum của20
samples, chưa đủ population để ước lượng tail production. CPU gồm test/injection;
RSS delta không phải allocated bytes/request.

| Route | p50 ms | p95 ms | p99 ms | Observed sequential requests/s | CPU µs/request | SQL/request |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| completed result |3.165|3.625|3.631|309.86|859.00|3|
| pending result |3.202|4.456|7.823|287.76|873.80|3|
| released review |3.796|4.482|4.657|255.44|971.85|3|
| personal history |2.464|3.169|4.228|382.84|727.75|3|

3 calls gồm1 Identity authentication,1 rate admission và1 projection. Đây là
observed closed-loop diagnostic, **không phải maximum/sustainable RPS hoặc SLO**.
Không có before/after claim tối ưu hay cost winner vì trước đó route chưa tồn tại.

Natural EXPLAIN ANALYZE/BUFFERS trên100.000 synthetic FAILED attempts dùng
attempts_history ở head và deep cursor, không Seq Scan attempts. Denied NEVER
review có answer-key plan nodes Actual Loops0. Không disable_seqscan để ép plan.
Fixture này không thay dataset yêu cầu100k users/500k questions/millions answers
và không chứng minh DB saturation hoặc optimal pool.

SQL review giới hạn size+1≤101 rows, mỗi question≤10 options. Full HTTP cap gồm
envelope/cursor và escaped UTF-8; continuation theo row cuối đã giữ, không skip.
Adapter vẫn có thể construct nhiều large rows trước clipping; cần profile worst
payload, allocation/GC/concurrent in-flight và DB work dưới tải. History watermark
giữ membership boundary, không freeze status/result hoặc tạo snapshot transaction.
Normal start timestamps là milliseconds; import/schema change phải giữ precision
contract hoặc nâng private cursor representation.

Không migration/resource/dependency/event change, không rerun dependency audit,
browser HTTPS, container image drill, managed SQS/IAM hoặc AWS benchmark. Query
plan là evidence local, không quyết định tăng RDS hay bật Redis. RPS/USD,
concurrency/USD, DB saturation, recovery time, optimal pool và Performance–Cost
Curve vẫn chưa đo.

## Checklist và bước tiếp theo

CR-01–05 trong [plan](implementation-plan.md) đóng với evidence mới; chỉ ATT-08
đổi checkbox. ATT-09 là **receipt/answer retention**, không phải leaderboard.
ATT-10/11 timeout/lost-ACK matrix còn subset. REP-04 mới có Candidate result/history
subset; leaderboard/privacy/Admin reporting chưa triển khai. Admin replay HTTP,
ASYNC-08/09/11/12, live SES và toàn bộ production/AWS gates giữ mở.

Bước kế tiếp theo thứ tự roadmap: thiết kế retention ATT-09 với protection cho
active attempts, unresolved grading/replay và durable retry identities; fail-first
PostgreSQL tests trước bounded scheduler/purge. Public leaderboard/privacy là
increment Reporting riêng. [Runbook](runbooks/candidate-results.md) mô tả polling,
diagnosis và rollout/rollback của các API vừa hoàn tất.

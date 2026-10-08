# Grok handoff: Assessment core

Prepared 2026-10-07 after [Catalog fix closure](catalog-fixes-2026-10-07.md). Copy the body below into Grok with repository access. This is a documentation handoff, not implemented Assessment or production acceptance.

Prompt body:993 whitespace-separated words, counted after the separator.

Scope: ATT-01–06; relevant ATT-10 concurrency and CAT-10 start/publication race; durable status from ATT-08 and backend fault/ownership subset of ATT-11. Implement the transaction-side outbox requirement ASYNC-01 because ATT-06 depends on it. ATT-07 scheduler, ATT-09 retention, completed-result/review acceptance and the remaining Phase07 worker/messaging tasks remain separate. Do not tick a broader task from a partial subset.

Endpoints: POST `/v1/exams/{examId}/attempts`; GET `/v1/attempts/{attemptId}`; GET questions/answers; PUT answers; POST submit; GET status. Read [OpenAPI](contracts/openapi.yaml) for exact paths, envelopes, status codes and permissions. [Roadmap](implementation-roadmap.md), [profile](project-profile.md), [product](product-specification.md), [permissions](security-and-permissions.md), [event](contracts/attempt-submitted.v1.schema.json) and [SLO/query budgets](slo-and-workload.md) remain authoritative.

Known inspection gaps: `CatalogAccess.getPublishedPolicy` reads a projection without acquiring an exam lock; ambient UoW is not serialization. Catalog's frozen-page implementation currently limits item count, without an explicit decoded-byte cutoff. `assessment.attempts` has no revision column despite the Attempt HTTP schema requiring revision. Resolve these through the owning capability/forward migration, with tests and documented decisions, rather than bypassing boundaries or relaxing contracts.

---

Bạn là senior Backend Engineer triển khai Assessment core cho Online Examination Platform. Làm trực tiếp trong repository, theo từng increment có kiểm chứng. Catalog CAT-01–09 đã nghiệm thu local sau GR-01–06. Mục tiêu tiếp theo: thí sinh bắt đầu, tiếp tục, lưu bài và nộp bài bền vững; dữ liệu đúng khi retry, nhiều tab và concurrent requests.

1. Đọc và chốt phạm vi

Đọc AGENTS.md, project-profile, roadmap, Catalog fix report và những sections quy chuẩn được AGENTS dẫn. Đối chiếu product-specification, permissions, OpenAPI, event schema, SLO/query budgets và ADR-002/003/004/006/008. Scope ATT-01–06, relevant ATT-10/CAT-10, status ATT-08 và backend fault subset ATT-11; thêm ASYNC-01 để submit atomic. Scheduler, retention, grading/SQS, Reporting, Web, AWS, magic link/GitHub thuộc increment sau. ID-11/Phase04 vẫn mở; ghi ngoại lệ Assessment local độc lập với SES.

2. Kế hoạch và hiện trạng

Inspect source/tests/schema trước khi code. Cập nhật implementation-plan: owner, input/output, permission, invariant, UoW, lock order, receipt, query budget, regression và evidence cho từng use case. Giữ working-tree edits của người dùng; không reset, stage/commit chúng hoặc overwrite evidence cũ. Baseline199 root,83 integration,10 HTTPS là lịch sử; phải chạy lại checks thực tế. Không tick ATT-08/10/11 toàn bộ khi chỉ hoàn tất subset.

3. Placement và kiến trúc

Code thuộc modules/assessment/{domain,application,infrastructure,presentation}; AssessmentModule wiring các plain classes. Domain/Application không import Nest, pg, SQL, Redis hoặc SDK. Reuse Attempt/scoring helpers, UnitOfWork, transaction executor và receipt abstraction hiện có. Repository write thuộc Domain; read projection port thuộc Application; pg adapters thuộc Infrastructure. SQL parameterized, format R-77/conventions§102.1. Global infrastructure không import business modules. Chỉ tạo file/layer cần thiết.

4. Identity và Catalog

Authenticate/current permissions qua Identity public facade; assessment.take, ownership và account/session authority áp dụng mọi endpoint. Unsafe methods giữ Origin, signed CSRF, rate admission và correlation; foreign attempt trả404. Không nhận userId/version/deadline từ client làm authority. Catalog chỉ truy cập qua public capabilities. getPublishedPolicy hiện không giữ lock: thiết kế serialization cho start/publish/unpublish qua Catalog-owned capability, cùng transaction context. Validation selections cần bounded frozen choice metadata, không grading keys/private repository.

5. Start và quota

POST start dùng actor-scoped UUIDv7 receipt. Serialize user/exam quota; xác định lock order với Identity/Catalog, tránh serialize mọi candidate trên hot exam vô cớ. Existing active attempt trả lại chính attempt/deadline, kể cả unpublish/overdue, không reset thời gian. Nếu chưa có active: published, openAt≤dbNow<closeAt, count xuyên versions, create/start atomic. Deadline=min(startedAt+duration,frozenCloseAt). EXPIRED/FAILED vẫn dùng quota. DB clock lấy sau serialization locks; constraints bảo vệ một active attempt.

6. Resume và questions

GET attempt/status phản ánh durable state, serverNow/deadline/canSave/replayPending. Existing attempt luôn dùng frozen version, kể cả bank edit, republish hay archive. Authorize owner trước Catalog frozen-page call. Questions/answers dùng explicit projections, cursor theo contract, mặc định20/max100 và questions≤256KiB decoded JSON. Page cắt theo byte phải giữ cursor tại item cuối thực trả, không bỏ sót. Không OFFSET/N+1, load toàn bộ aggregate hoặc lộ keys/explanations/provenance.

7. Autosave, clear và mark

PUT answers nhận1–20 distinct frozen questions, full selectedOptionIds, marked và expectedVersion. Validate membership/options/cardinality bằng bounded set query/capability; reject duplicate IDs. Empty selections clears; untouched version0, accepted mutation tăng version kể cả cùng giá trị. Một UoW khóa attempt, authorize, receipt lookup, post-lock clock/state/deadline, validate tất cả versions, write batch/marks/receipt. Một item conflict rollback toàn batch. Save và submit dùng cùng lock order; không silent last-write-wins.

Single/true-false tối đa một selection; multiple là tập options hợp lệ. Mark không thay score. Receipt chỉ chứa acceptedAt/questionIds/versions, không answer contents; retry sau submit vẫn trả receipt cũ.

8. Retry và submit

Fingerprint theo ADR-003: actor/key toàn operations, method/path/canonical validated payload. Existing receipt kiểm tra trước version/deadline; retry cũ trả immutable ACK, không ghi đè answer mới. Key khác payload409; absent old key expired theo DB time. Manual submit không nhận answers; commit state+stable submissionId/eventId+outbox+receipt rồi202. Trước deadline SUBMITTED, tại/sau deadline EXPIRED với expired=true. Multiple keys trả acceptance cũ, không thêm event. Scoring không chạy trong request.

9. Outbox và pending state

Implement transaction-side outbox port/pg adapter tối thiểu, dùng platform.outbox hiện có, validate attempt.submitted.v1 schema. Event không chứa answers, keys hoặc token; stable identities/provenance persist cùng attempt. Insert outbox/receipt fail phải rollback submission. Không gọi SQS trong transaction, publish bằng fire-and-forget hay queue memory. Status giữ SUBMITTED/EXPIRED thật; không fabricate PROCESSING/COMPLETED hoặc score. Publisher/consumer ở phase sau; ghi rõ acknowledged intents đang chờ dispatcher.

Port ở shared/application/ports hoặc application/ports của owner; Infrastructure chỉ implement adapter. Không reuse Identity email outbox cho submission.

10. Migration và regression

Giữ bytes0001–0009; thêm forward migration nếu cần. attempts hiện thiếu revision dù HTTP yêu cầu: định nghĩa durable revision semantics/grants/checks trước khi triển khai, không bỏ field khỏi schema. Tests RED trước fix trên restricted PostgreSQL và HTTP thật: duplicate start/limit, publish/unpublish/start, republish freeze, reordered save, stale tab, batch rollback, clear/mark, save-submit, lock qua deadline, submit duplicate/outbox failure, revoked session và foreign ownership. Kiểm chứng commit-lost ACK/retry và restart/resume; mock không chứng minh locking.

Quan sát request thực sự blocked, không sleep rồi giả định. Pruned old UUIDv7 không được thành mutation mới; kiểm chứng bằng fixture, không tick retention implementation.

11. Contract và diagnostic

Validate response bằng OpenAPI exact schemas, cả headers/status; giữ safe envelope và no-store. Test payload tối đa/vượt cap, Unicode và release redaction. Đo query/round trips gồm auth/rate/UoW, lock/transaction/pool, payload, p50/p95/p99 và errors cho start/questions/save/submit/status. EXPLAIN đúng adapter SQL. Record sample count/config/source/migration hashes; missing samples=null. Unique ignored output, freeze run mới, generate summary từ raw. Diagnostic local không chứng minh capacity, SLO hoặc AWS savings.

Nếu vượt query budget, ghi actual counts và reliability reason; không tăng ceiling âm thầm. Giữ outlier và offered/achieved load riêng.

12. Nghiệm thu

Chạy npm test, lint/quality/contracts, typecheck/build, real-PG/SMTP integration; HTTPS Identity khi ảnh hưởng composition/auth/shared HTTP. Không skip test để pass hoặc dùng test count cũ. Dọn đúng disposable fixtures, giữ development DB. Cập nhật roadmap/profile/test-inventory/validation/API review; tick named deliverables với evidence. CAT-10 chỉ đóng khi start/publication race thật đạt. Báo thay đổi, migration, checks, limitations và việc tiếp theo; không tự mở phase grading/AWS. Logs không chứa secrets/answers/SQL; báo tiến độ ngắn từng increment.

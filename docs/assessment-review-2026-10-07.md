# Independent Assessment API review — 2026-10-07/08

**REVIEW COMPLETE — Assessment core chưa được nghiệm thu.** Review bắt đầu 2026-10-07, kết thúc 2026-10-08 trên code API mới của Grok. Có5 findings cần xử lý:1 P1 và4 P2. Code API không được sửa trong review; source, migrations và diagnostic cũ giữ nguyên. [Evidence/reproduction](evidence/assessment-review-2026-10-07/README.md) chứa6 assertion RED và3 control PASS độc lập.

## 1. Findings theo mức ưu tiên

### AR-03 — P1: Start đọc publication snapshot cũ sau khi chờ khóa

Location: [PostgresCatalogRepository.shareExam](../apps/api/src/modules/catalog/infrastructure/persistence/postgres-catalog.repository.ts), lines33–54; [AssessmentService.start](../apps/api/src/modules/assessment/application/services/assessment.service.ts), lines172–186.

`shareExam` JOIN exam với published version trong cùng statement lấy `FOR SHARE OF e`. Khi statement bắt đầu trước lúc publication transaction commit, PostgreSQL có thể cập nhật locked exam tuple sau lock wait nhưng JOIN vẫn không nhìn thấy version mới trong snapshot của statement. `published=true` có thể đi cùng `versionId=null`; start trả422 `Exam is not published` dù publish đã commit và exam đang mở. Đây là lỗi eligibility dưới concurrency, ảnh hưởng mass-start và start cùng thời điểm admin publish/republish.

Reproduction dùng **Catalog publish thật**, restricted runtime, pause ngay sau update publication trong UoW, rồi gửi HTTP start. Sau khi quan sát `wait_event_type=Lock`, cho publication commit. Cả first publication và republish đều trả422, không tạo attempt; expected201 với committed current version. Test unpublish trước đây không phát hiện tình huống tạo/chuyển version này.

Fix: giữ Catalog sở hữu serialization/policy; khóa exam trước, rồi đọc pointer/policy trong statement có snapshot sau lock trong cùng transaction. Giữ khóa tới khi attempt/receipt commit. Thêm cả hai race regression; đo lại query budget sau fix. Không đổi isolation/lock mode hoặc đưa SQL sang Assessment Application để né vấn đề.

### AR-01 — P2: Fingerprint không canonicalize tập selectedOptionIds

Location: [AssessmentService.save/fingerprint](../apps/api/src/modules/assessment/application/services/assessment.service.ts), lines43–46/325–330; [assessment-policy.canonical](../apps/api/src/modules/assessment/domain/assessment-policy.ts), lines52–59.

`canonical` sort object keys nhưng giữ nguyên mọi array; save hash trực tiếp `commands`. ADR-003 yêu cầu sort set-valued IDs, còn SPEC-05 định nghĩa selectedOptionIds là full set. Retry cùng key với lựa chọn `[A,B]` thành `[B,A]` có cùng nghĩa nhưng trả409 `Idempotency key conflict`, thay vì200/`Idempotency-Replayed: true` và receipt gốc. Candidate phải reconcile một conflict không có thay đổi nghiệp vụ.

HTTP reproduction: first200, retry409, một receipt và answer version vẫn1. Fix bằng canonical validated payload: chuẩn hóa UUID và sort selectedOptionIds trước fingerprint; không sort mọi array mặc định. Giữ test payload thay đổi thật phải409 và replay cũ không ghi đè answer mới.

### AR-02 — P2: Giới hạn256KiB chỉ tính items, bỏ envelope/cursor

Location: [AssessmentService.questions](../apps/api/src/modules/assessment/application/services/assessment.service.ts), lines245–259.

Cutoff đo `JSON.stringify(rows.map(questionView))`, rồi thêm cursor/metadata và HTTP envelope. Vì vậy response có thể vượt committed decoded-JSON cap dù items vừa đủ. Fixture hợp lệ qua Catalog: items262,112 bytes; toàn bộ HTTP response262,664 bytes, vượt262,144 bytes. Trang đầu10 items, trang sau1; control xác nhận không skip/repeat. Test cũ chỉ kiểm tra có cắt trang nên không bắt overflow.

Fix: tính hoặc dành overhead có bound cho **toàn bộ serialized response**, bao gồm signed cursor, metadata và envelope, rồi cắt tại item cuối thực trả. Test dùng byte length của HTTP response.body với escaped/UTF-8 maximum payload và cursor/noncursor boundaries. Không đưa transport envelope vào Domain.

### AR-04 — P2: UUID parser nhận uppercase nhưng frozen membership không nhận

Location: [Presentation resourceId](../apps/api/src/modules/assessment/presentation/http/dto/assessment.dto.ts), lines4–9; [assertSelections](../apps/api/src/modules/assessment/domain/assessment-policy.ts), lines73–81.

UUID regex case-insensitive trả nguyên spelling. PostgreSQL trả IDs lowercase; Map/Set membership trong Domain so sánh chuỗi case-sensitive. Save với cùng question/option UUID viết uppercase vượt parser nhưng trả400 `Invalid request`, không lưu answer. OpenAPI UUID format không yêu cầu resource IDs lowercase; yêu cầu lowercase riêng của Idempotency-Key vẫn hợp lệ và không đổi.

Fix: canonicalize resource/question/option UUID trước duplicate detection, fingerprint, cursor claims và membership. Bổ sung mixed-case retry và duplicate IDs khác spelling; không cho duplicate semantic IDs lọt uniqueness check.

### AR-05 — P2: Ba write API vượt query ceilings đang cam kết

Location: [AssessmentService](../apps/api/src/modules/assessment/application/services/assessment.service.ts) write orchestration và [PostgresAttemptRepository.replaceAnswers](../apps/api/src/modules/assessment/infrastructure/persistence/postgres-attempt.repository.ts), lines177–268.

| HTTP operation | Actual queries | Ceiling | Over |
| --- | ---: | ---: | ---: |
| start | 13 | 12 | 1 |
| save | 18 | 11 | 7 |
| submit | 13 | 10 | 3 |

Independent auth-inclusive probe xác nhận đúng số Grok đã công khai; đây là **known open contract overrun**, không phải lỗi che giấu evidence. CSRF family lookup, outer authenticate, transactional revalidate và năm statement thay answer/selections giải thích chi phí nhưng chưa giải quyết ceiling. Điều này quan trọng với autosave burst và connection/transaction utilization. Số query không tự chứng minh latency/SLO/capacity fail.

Fix/tuning follow-up: đo statement/pool/lock costs sau correctness fixes, giảm round trips trong owned adapters mà giữ mọi auth/CSRF/grants/UoW/receipt/outbox controls. Không ghép data-modifying CTE tùy tiện, nới quyền hoặc tăng resource/ceiling để tick PASS. Nếu một ceiling thật sự không khả thi sau đo, cần quyết định contract rõ ràng có evidence; review này không thay contract.

## 2. Phần đã kiểm chứng tốt

- Placement đúng five roots; Domain/Application dùng ports, không gọi Nest/pg/SDK. Catalog private repository không đi qua Application boundary; answer read projection có declared joins tới frozen position/option IDs, không keys/explanations.
- Current owner/auth/permission/Origin/CSRF/rate/correlation và safe HTTP errors có regression. Foreign attempt404, revoked session401. Các response thường match schemas và không lộ keys/explanations.
- Attempt lock và post-lock DB clock bảo vệ deadline; optimistic versions, batch rollback, expired-key rejection và immutable receipt replay cơ bản pass.
- Hai save trên **hai UnitOfWork/Identity instances tương ứng**: một commit, một Revision conflict; answer version1/attempt revision2. Fixture review tránh wiring Identity của instance thứ hai về connection context thứ nhất.
- Bốn save/submit race có observed lock, cả hai thứ tự: save ACK luôn có answer durable; submit đi trước thì save bị từ chối. Mỗi attempt có một outbox/submission.
- Duplicate submit key khác trả cùng immutable acceptance, một outbox. SPEC-06 cho phép không lưu receipt thứ hai; điều này **không được ghi thành finding**.
- Submit/outbox/receipt atomic rollback có regression; không scoring hay network broker call trong request. Không bịa PROCESSING/COMPLETED/result.
- Migration0010 forward-only, restricted revision grant;10 source/build migration assets khớp.0001–0009 không bị rewrite.

## 3. Validation và evidence

| Check | Fresh outcome |
| --- | --- |
| Lint/quality/contracts | PASS;46 operations/425 example occurrences; boundaries/link/section checks |
| Typecheck/build | PASS;10 migration assets preserved |
| Root npm test | 217 PASS:94 API/37 tooling/86 Web |
| Existing real-PG/HTTP/SMTP | 90 PASS/6 suites;3 diagnostic writers deliberately deselected |
| Independent review | 6 expected RED/3 PASS/9 cases; AR-03 có hai RED race cases |
| Actual Identity HTTPS/AppModule | 10/10 Chromium cases PASS, including existing Identity restart/lost ACK cases |
| Source/contracts/config/history preservation | PASS against captured baseline; details in manifest |
| Cleanup | Disposable databases/logins removed; owned Compose services stopped, volumes retained |

Initial integration attempt was blocked by sandbox EPERM before DB setup; permitted local socket run then passed. Initial independent run also had one **harness expectation mistake** (`Answer version conflict` versus contract `Revision conflict`); corrected only the review fixture, retained initial log/probes and reran. Final RED outcomes correspond to findings above.

The root run observed86 Web cases at the start of review; additional concurrent Admin/Web edits appeared afterward and are outside this API source snapshot. These checks do not accept the unrelated Web visual implementation or Assessment process-restart/lost-ACK behavior. HTTPS restart/lost-ACK coverage is Identity only. No AWS, sustained load, optimum pool, scoring/SQS, scheduler/retention, restore, SLO or cost claim. Historical Grok diagnostic summary/raw files were not rerun or overwritten.

## 4. Acceptance và bước sửa tiếp theo

CAT-09/10 và ATT-01–04 được mở lại `[ ] — IN PROGRESS`: roadmap**63 checked/153 pending/216 total**. ATT-05/06 và ASYNC-01 giữ scoped local evidence; ATT-07–11, ID-11/Phase04 và production gates vẫn mở. Review bổ sung concurrent-save/save-submit evidence nhưng không đóng toàn bộ ATT-10/11.

Ưu tiên sửa AR-03, sau đó AR-01/04 canonicalization và AR-02 byte cap; cuối cùng đo/tune AR-05 trên code đã đúng. Chuyển sáu regression RED sang suites phù hợp, giữ controls, rồi rerun relevant checks và lưu evidence closure riêng. Bản review này chỉ sửa tài liệu/status và thêm review artifacts; không stage/commit, deploy hoặc sửa API runtime.

## 5. Checklist review hoàn tất

- [x] Đọc scope/owners/contracts/rules/source/tests; classify write/read và transaction boundaries.
- [x] Inspect start/save/submit, locks/deadline/receipts/outbox, ownership/cursors/projections/byte limits và migration/grants/composition.
- [x] Chạy validations; tái hiện độc lập và giữ safe evidence cùng harness caveat.
- [x] Đối chiếu source/history checksums, cập nhật acceptance, cleanup và self-review R-58/R-59/workflow47–48.

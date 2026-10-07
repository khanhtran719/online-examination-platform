# Catalog fixes và kiểm tra kiến trúc — 2026-10-07

**GR-01–06 đã đóng trong phạm vi local Catalog.** BOOT-01 và CAT-01/03/04/06/08 được nghiệm thu lại với regression mới; CAT-10 còn PARTIAL vì chưa có transaction start thật của Assessment. Roadmap hiện **61/216 checked,155 pending**. Phase04 vẫn mở vì ID-11/live SES chưa hoàn tất. Không có production/AWS acceptance mới.

[Review RED ban đầu](catalog-review-2026-10-07.md) và toàn bộ evidence cũ được giữ nguyên. [Evidence mới](evidence/catalog-fixes-2026-10-07/README.md) ghi nguồn, checks, migrations và một diagnostic độc lập. Đây là sửa correctness/contract và tuân thủ kiến trúc, không phải kết luận optimization tốt hơn.

## Kết quả từng finding

| Finding | Điều chỉnh | Evidence / trạng thái |
| --- | --- | --- |
| GR-01, P1 | Publish đọc DB clock sau exam và bank-question serialization locks. Clock kiểm tra freshness của idempotency không còn truyền vào publication policy. Receipt replay vẫn được xử lý trước effect. | CLOSED local. Sáu case PostgreSQL: initial/republish × exam/question lock qua close, hai lock-timeout rollback/retry. |
| GR-02, P1 | Catalog controller khai báo cap POST/PUT exam128KiB, question512KiB và import1MiB. Global HTTP adapter áp metadata chung, giới hạn cấu hình tối đa1MiB; Identity vẫn16KiB. | CLOSED local. POST/PUT payload đầy đủ, escaped JSON/UTF-8, Unicode, vượt cap và auth/permission/CSRF thực. |
| GR-03, P2 | Query adapter map đúng PublicExam; publishedAt chỉ thuộc BrowseRow nội bộ phục vụ cursor. Detail không select/trả field này. | CLOSED local. Browse/detail HTTP được validate bằng OpenAPI schema với additionalProperties=false. |
| GR-04, P2 | Domain round-trip UTC calendar và precision0–3 fractional digits trước khi chuẩn hóa ISO. | CLOSED local. Ngày không tồn tại, non-leap February29, month-end, hour/minute/second sai bị reject; valid leap/fraction được giữ đúng instant. HTTP create/replace sai ngày không thay draft. |
| GR-05, P2 | Scope backend Jest vào apps/api; Node tooling và Web Vitest có runner riêng và được gọi tuần tự bởi root npm test. | CLOSED local. Root command chạy đủ89 API +37 tooling +73 Web, không xóa/disable baseline test. |
| GR-06, P2 | Diagnostic capture exact adapter SQL để EXPLAIN; publish có measurement window riêng; missing samples dùng null. UUID run output vào ignored .local; freeze directory mới, generate README từ cùng raw. HTTPS ghi migrationCount từ built assets. | CLOSED diagnostic gap. Có25 publish,25 browse,25 detail, provenance và9 migrations; capacity/CAT-10 start race vẫn chưa đo. |

### Publication và atomic rollback

Application giữ quyền điều phối UoW: current-session/permission revalidation → receipt lookup → key freshness → lock exam → lock bank IDs có thứ tự → authoritative DB time → Domain eligibility → snapshot/pointer → audit/receipt → commit. PostgreSQL adapter sở hữu SQL/connection; Domain chỉ nhận publication shape và timestamp. Không có network/provider I/O trong transaction, automatic retry hoặc driver import vào Application.

Regression quan sát request thực sự blocked qua pg_blocking_pids thay vì chỉ sleep rồi giả định. Close lấy theo DB clock; case question lock đi qua close trong default lock timeout500ms/statement2000ms. Kiểm tra cả initial và republish: không tạo version, pointer, revision, success audit hoặc receipt mới khi bị từ chối. Sửa schedule rồi retry chính key đã bị rollback vẫn thành công; replay lost-ACK receipt sau close không tạo effect thứ hai. Hai case timeout kiểm chứng rollback và retry cùng key.

### Giới hạn text/payload theo contract

Review bổ sung phát hiện JavaScript string.length đếm UTF-16 units, trong khi JSON Schema maxLength và PostgreSQL char_length đếm Unicode code points. Domain và Presentation hiện dùng cùng pure Catalog predicate validText; import áp cùng limits. Counter duyệt có giới hạn, dừng khi vượt max và không tạo mảng ký tự. Question prompt/explanation8000, option2000, title/section200 giữ đúng contract, bao gồm emoji; một code point vượt max bị reject.

| Endpoint | Byte cap | Kiểm chứng giới hạn hợp lệ |
| --- | --- | --- |
| POST/PUT admin exams | 128KiB | 20 sections,500 bank IDs thực, full200-character titles, UTF-8/escaped BMP và astral Unicode |
| POST/PUT admin questions | 512KiB | Prompt8000 + explanation8000 +10 options×2000; astral surrogate-pair escape cần12 byte/code point, khoảng432,000 byte (422KiB) JSON vẫn nằm trong cap |
| POST question imports | 1MiB | Cap import hiện có và regression overflow; structural limits tối đa100 questions vẫn áp dụng |
| Identity/default routes | 16KiB | Regression overflow và10 HTTPS auth cases |

Question cap512KiB được chọn để bao phủ escaped surrogate pair của các field đã công bố, không tăng mọi route. Body vượt cap trả safe400 envelope theo mapping hiện hành. Thiếu quyền trả403, thiếu CSRF trả403, thiếu session hợp lệ trả401; không nới Origin/cookie/auth. Đây là bound cho parser và field validation, không phải capacity/back-pressure benchmark.

## Tuân thủ bộ chuẩn hóa

- [x] Placement giữ config/shared/modules/infrastructure/workers theo architecture§5/ADR-006; không thêm legacy platform hoặc technical→business import.
- [x] Catalog sở hữu policy, write repository và query port; Domain/Application độc lập Nest/pg/SDK. Presentation dùng public Identity facade/guard, không private repository.
- [x] Presentation sở hữu payload metadata; reusable HTTP infrastructure chỉ kiểm tra/apply bounded technical settings, không biết URL Catalog.
- [x] Read projection map exact DTO, cursor metadata nội bộ; không load aggregate đầy đủ cho detail/browse.
- [x] Write snapshot/pointer/audit/receipt cùng transaction; replay, lock order, revision ownership và current permissions được giữ.
- [x] pg được giữ theo ADR-008. SQL formatting tuân R-77/conventions§102.1; không đưa ORM vào runtime.
- [x] Chín migration source/built khớp hashes;0001–0008 khớp HEAD,0009 khớp baseline review. Không chỉnh migration đã áp hoặc lịch sử benchmark.
- [x] R-58/R-59 và workflow§47–48 self-review: public contracts, failure/rollback, boundaries, safe diagnostics, tests và docs đã kiểm tra.

Không cần ADR mới: các thay đổi thực thi các contract đã nhận, không đổi kiến trúc/persistence/public DTO/schema. Metadata Nest chỉ nằm Presentation; framework wiring giữ ở composition/HTTP infrastructure. Cache, messaging, outbox hoặc class/layer mới không cần cho các fixes này.

## Validation thực chạy

| Check | Kết quả |
| --- | --- |
| Publication RED → GREEN | Trước fix4 failed/2 controls passed; sau fix6/6 passed |
| Calendar RED → GREEN | Trước fix4 failed/16 passed; sau fix20/20 passed |
| HTTP RED → GREEN | Trước fix5 failed/6 passed; sau fix11/11 passed |
| Unicode RED → GREEN | Domain3 failed/20 passed và HTTP2 failed được tái hiện; final Catalog Domain23/23, HTTP13/13 passed |
| Root npm test | PASS:13 Jest suites/89 cases;37 Node cases;16 Vitest files/73 cases, tổng199 |
| Full PostgreSQL/SMTP integration | PASS:5 suites/83 cases,0 skipped; database31,Identity22,Catalog11,publication6,HTTP13 |
| Identity HTTPS | PASS:10 actual Chromium/API/PG/worker-SMTP cases; migrationCount9; API + Web live build PASS |
| Lint/quality/contracts/typecheck/build | PASS;46 operations/425 examples; architecture guards PASS |
| Formatting/diff/assets | Prettier source/tests/tooling PASS; migration/historical hashes checked; final quality/diff evidence ghi trong checks.json |

Các lỗi harness trong quá trình chạy được sửa trước acceptance: hai unused fixture bindings làm lint fail; một lệnh HTTP thiếu TEST_DATABASE_ADMIN_URL dừng trước tests; expectation CSRF được chỉnh403 theo contract hiện hành; report rounding fixture được sửa để tránh tie floating-point. Đây không phải nới behavior sản phẩm. Không chạy lại archived review fixture có side-effect ghi probes.json.

Dedicated PostgreSQL17 loopback55435 và Mailpit dùng synthetic data/restricted logins; developmentDB55432 không được dùng. Disposable databases/logins được teardown; containers do lượt này khởi động được stop, volumes giữ lại. Không stage/commit hoặc nhận xét nghiệm thu UI proposal/visual work đang có trong working tree.

## Diagnostic và giới hạn performance

[Generated summary](evidence/catalog-fixes-2026-10-07/diagnostic/README.md) từ run58451c3f-aa1e-4698-86e7-1c1218fad576, chạy riêng sau các suites khác. Poolmax10,25 publications mới,100 questions/2 sections mỗi publication, sequential local calls. Browser/HTTP auth và admission không nằm trong read measurement.

| Operation | p50 ms | p95 ms | p99 ms |
| --- | --- | --- | --- |
| Browse projection | 3.184 | 5.126 | 6.270 |
| Detail projection | 1.302 | 1.681 | 2.060 |
| Publish application call | 27.695 | 42.770 | 103.994 |

Reads:50 queries/0 errors, mỗi projection một statement. Publish:425 queries/25 calls,17 statements/call,25 transaction và75 lock round-trip observations,0 errors. Pool event samples thấy maxactive1/maxwaiting0; đây không phải utilization dưới tải. Read transaction n=0 dùng null/not measured, không báo0ms. Lock round trip gồm SQL/network/wait, không suy ra lock-hold duration.

EXPLAIN dùng exact captured production SQL và bindings trong memory, gồm count/section aggregation; export chỉ stripped plans và SQL digest, không raw text/parameters/prompt/key/credentials. P99 publish103.994ms được giữ nguyên, không loại outlier để làm số đẹp. Dataset/scope khác run cũ nên không so sánh như before/after optimization.

Sustainable RPS/concurrency, CPU/memory per request, saturation, optimum pool, SLO, AWS/TCO, performance-cost curve và maximum headroom vẫn NOT MEASURED. Không suy diễn local diagnostics thành production acceptance.

## Công việc còn mở

- [ ] CAT-10: thực thi Assessment start/publication race với UoW/frozen version thật; không dùng stub để đóng mục này.
- [ ] ID-11: live SES/sender, provider operational/failure evidence; Phase04 chưa đóng.
- [ ] Assessment APIs/lifecycle, scoring worker/SQS, Reporting, Terraform/k6/recovery và Performance–Cost Curve theo roadmap, từng increment được duyệt.

Phạm vi sửa lỗi và điều chỉnh architecture conformance hiện hoàn tất; các mục trên là phần triển khai kế tiếp, chưa tự động mở rộng trong lượt này.

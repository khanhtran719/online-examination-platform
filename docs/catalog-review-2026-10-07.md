# Independent review: Catalog do Grok triển khai — 2026-10-07

**Kết luận: chưa nghiệm thu Catalog, cần sửa các lỗi dưới đây trước khi chuyển sang Assessment.** Review đối chiếu [prompt đã giao](grok-catalog-implementation-prompt.md), Architecture Contract, product/OpenAPI và thay đổi trên working tree so với commit `b057c3d`. Đây là review backend Catalog và những thành phần Identity/HTTP/UoW dùng chung mà increment thay đổi; không nghiệm thu visual work của Web.

Đã thêm bộ tái hiện độc lập, chạy trên PostgreSQL 17 thật với runtime role hạn chế, JWT/session thật và Fastify HTTP. **5 assertions RED thuộc 4 nhóm lỗi runtime; 1 control PASS.** [Raw results](evidence/catalog-review-2026-10-07/probes.json), [fixture/config/commands](evidence/catalog-review-2026-10-07/README.md) và [provenance](evidence/catalog-review-2026-10-07/manifest.json) cho phép chạy lại. Không sửa runtime của Grok trong lượt review này.

## Findings theo mức ưu tiên

### GR-01 — P1: publish dùng clock trước khi chờ lock

Vị trí: [CatalogService.publish](../apps/api/src/modules/catalog/application/services/catalog.service.ts#L338), [mutate](../apps/api/src/modules/catalog/application/services/catalog.service.ts#L595), [publication policy](../apps/api/src/modules/catalog/domain/catalog-policy.ts#L229).

`mutate()` lấy `repo.now()` rồi truyền vào effect. `publish()` sau đó mới lock exam và toàn bộ bank questions, nhưng vẫn validate close bằng timestamp cũ. Một request bắt đầu trước close, chờ lock và tiếp tục sau close có thể commit publication đã đóng; cùng đường code được dùng khi republish. Điều này trái [product §4](product-specification.md#4-time-policy--spec-03): publish không tạo version đã đóng.

R01 giữ exam lock bằng connection khác, quan sát `pg_stat_activity` xác nhận request đang chờ, đợi qua close rồi thả lock. Với **lock timeout mặc định 500 ms, statement timeout 2000 ms**, close cách thời điểm chuẩn bị draft 250 ms: actual không có lỗi và tạo **1 version có `published_at >= closes_at`**. Expected là `Exam is closed`, không có version/pointer/revision/audit/receipt thành công mới. Reproduction đầu dùng timeout dài hơn; kết luận dựa trên lần chạy lại bằng default.

Cách sửa: đọc authoritative DB clock sau các serialization locks của publish; không dùng clock phục vụ first-use idempotency để authorize publication. Giữ replay receipt trước effect, lock order, frozen snapshots và rollback toàn bộ. Thêm test chờ exam lock và question lock đi qua close, cho publish/republish; đảm bảo request bị timeout vẫn không ghi effect.

### GR-02 — P1: body limit chặn dữ liệu hợp lệ của Catalog

Vị trí: [HTTP adapter](../apps/api/src/infrastructure/http/configure-http-application.ts#L22).

Fastify có global limit 16,384 byte; chỉ import POST được tăng lên 1 MiB. Các POST/PUT exam và question vẫn dùng 16 KiB, thấp hơn giới hạn từng trường đã công bố.

| Reproduction | Body hợp lệ | Expected | Actual |
| --- | --- | --- | --- |
| R02 `POST /v1/admin/questions` | prompt 8000, explanation 8000, 10 options × 2000; **36,377 byte** | 201 | 400 `Invalid request` |
| R03 `POST /v1/admin/exams` | 500 bank questions thật, positions/points hợp lệ; **42,231 byte** | 201 | 400 `Invalid request` |

Các field limits đúng [QuestionWriteRequest](contracts/openapi.yaml#L4421) và [ExamWriteRequest](contracts/openapi.yaml#L4582). Parser từ chối trước controller; validation của Domain không cứu được request. PUT dùng cùng default nên cần kiểm chứng khi sửa.

Cách sửa: cap riêng có giới hạn cho create/replace exam và question, tính cả UTF-8 và JSON overhead; giữ Identity 16 KiB và import 1 MiB. Không đặt unlimited body hoặc tăng global tùy tiện. Test cả POST/PUT với payload hợp lệ tối đa, payload vượt cap, nhiều byte UTF-8 và regression Origin/CSRF/auth/rate-limit.

### GR-03 — P2: GET exam detail trả field ngoài OpenAPI

Vị trí: [publishedExam](../apps/api/src/modules/catalog/infrastructure/persistence/postgres-catalog.query.ts#L267), [publicExam mapper](../apps/api/src/modules/catalog/infrastructure/persistence/postgres-catalog.query.ts#L830).

Mapper chung trả `BrowseRow`, gồm `publishedAt` phục vụ cursor. Browse loại field này trước khi trả DTO; detail trả thẳng mapper. R04 gọi HTTP thật nhận 200 nhưng `data` có `publishedAt`, trong khi [Exam schema](contracts/openapi.yaml#L3763) đặt `additionalProperties: false` và không khai báo field đó. Client validate strict schema sẽ từ chối response. Chưa phát hiện correct key/explanation leak trong case này.

Cách sửa: map detail ra đúng `PublicExam`; giữ sorting metadata trong projection nội bộ. Không mở rộng schema chỉ để hợp thức hóa field vô tình bị lộ. Thêm validation runtime response bằng schema của contract cho browse/detail, không chỉ `toMatchObject` một vài field.

### GR-04 — P2: ngày không tồn tại bị đổi lịch âm thầm

Vị trí: [utcInstant](../apps/api/src/modules/catalog/domain/catalog-policy.ts#L99).

Regex và `Date.parse()` chỉ xác nhận hình thức/finite instant, không kiểm tra ngày lịch. R05 gửi `2027-02-30T10:00:00.000Z`: expected 400, actual 201 và lưu `2027-03-02T10:00:00.000Z`. Admin tưởng đã cấu hình một thời điểm nhưng database lưu thời điểm khác. Giá trị đầu vào không phải RFC3339 date-time hợp lệ theo contract.

Cách sửa: kiểm tra calendar components hoặc round-trip thành UTC với precision được phép; reject ngày/tháng/giờ ngoài phạm vi và leap-day sai. Validation vẫn ở Domain, độc lập framework. Thêm các case valid leap year, non-leap year, month-end, invalid hours và 0–3 fractional digits theo policy hiện có.

### GR-05 — P2, lỗi runner có sẵn: root npm test đang đỏ

Vị trí: [Jest discovery](../jest.config.cjs#L7), [root scripts](../package.json#L12).

`testMatch` tìm toàn repo, nên nạp hai test Vitest của Web vào Jest. `npm test` exit 1: **13 API suites / 71 tests PASS; 2 Web suites fail**, và phần Node tooling sau `&&` không chạy. Chạy đúng `npm run web:test` thì **16 files / 73 tests PASS**. Chạy Node tooling riêng thì **34 PASS**.

Jest config và hai file Vitest đã nằm trong HEAD, không phải lỗi do Catalog mới tạo; Grok đã công khai vấn đề trong validation. Tuy vậy lệnh test chuẩn chưa dùng được, nên không thể báo repository GREEN. Mở lại BOOT-01 cho phần cấu hình discovery, các deliverables bootstrap khác giữ evidence lịch sử.

Cách sửa: scope Jest vào backend, Vitest vào frontend, giữ một lệnh verification rõ ràng chạy đủ hai nhóm và tooling. Không xóa/skip test hoặc chỉ đổi báo cáo thành PASS. Khi đóng lại phải chứng minh root command, API, Web và Node đều chạy.

### GR-06 — P2: diagnostic chưa đủ/không đồng nhất với mô tả

Vị trí: [measurement window](../apps/api/tests/integration/catalog.spec.ts#L930), [EXPLAIN rút gọn](../apps/api/tests/integration/catalog.spec.ts#L954), [ghi đè evidence](../apps/api/tests/integration/catalog.spec.ts#L1011), [README lịch sử](evidence/catalog-2026-10-07/README.md).

Publication được tạo trước cửa sổ `observations.slice(started)`: chỉ 25 browse + 25 detail + 1 browse phụ được đo. `transactionMs.n = 0` có nghĩa **không có sample**, không phải publish/transaction mất 0 ms. Chưa có measured lock duration/pool utilization của publish. EXPLAIN chỉ chọn `e.id`/`v.id`, bỏ subqueries cho question count và section JSON của query chạy thực tế, nên không chứng minh plan đầy đủ của production projection.

README và JSON đang khác nhau: browse p95 README **2.882 ms** nhưng raw **1.854 ms**; detail p95 README **1.545 ms** nhưng raw **1.299 ms**. Test ghi đè cùng `diagnostic.json` mỗi lần chạy, không có run/source manifest; việc ghép báo cáo và samples khác run có thể tái diễn.

Cách sửa: giữ evidence cũ, tạo run mới với source/config hashes, đo exact adapter SQL và publication window riêng; ghi `null/not measured` khi không có sample. Generate summary từ cùng raw run và lưu vào run directory riêng hoặc ignored output trước khi review/freeze. Catalog vẫn chưa có capacity/SLO/AWS evidence, đúng với disclaimer của Grok. CAT-10 giữ mở cho các gaps này cùng actual Assessment start race.

Metadata HTTPS cũng có label hard-coded “all eight migrations” tại `apps/web/e2e/identity-https/identity.spec.mjs:50`; fixture thật load toàn bộ built bundle và review xác nhận bundle có 9 file byte-identical. Đây là stale description, không phải bằng chứng migration 0009 bị bỏ qua; chỉnh label/provenance trong lượt sửa evidence.

## Phần đạt trong review

- Placement `modules/catalog/{domain,application,infrastructure,presentation}` đúng capability; Domain/Application không gọi Nest, pg hoặc SDK. Identity được dùng qua public facade; repository riêng không bị export cho Assessment.
- Write/audit/receipt cùng UoW; quyền hiện hành được revalidate trong transaction. Existing tests cho revision race, lost ACK, audit rollback, permission revoke, archive references và publication immutable tiếp tục đạt.
- pg adapters parameterize caller values; migrations 0001–0008 không đổi bytes so với HEAD; forward 0009 có trong built bundle. Không áp migration lên development DB 55432.
- C01 kiểm chứng keyset pagination bank: **503/503 IDs**, không thiếu row. Schema dùng `timestamptz(3)`, nên nghi ngờ truncation timestamp trong cursor không được đưa thành finding.
- 10 Chromium HTTPS Identity cases đạt sau khi build actual AppModule chứa Catalog. Các case này không thay thế Catalog contract/concurrency tests.

## Validation mới thực chạy

| Check | Kết quả và giới hạn |
| --- | --- |
| `npm run lint`, `npm run typecheck` | PASS; lint bao gồm architecture quality và OpenAPI checks |
| `npm run build` | PASS; source/built 9 migration hashes khớp |
| `npm test` | FAIL vì GR-05; 71 API tests PASS, 2 Web suites fail |
| Node script unit riêng | 34 PASS |
| `npm run web:test` | 73 PASS / 16 files |
| Integration PostgreSQL + SMTP | 63 PASS / 3 suites; **1 diagnostic case chủ động deselect** để không ghi đè evidence cũ. Đây không phải fresh 64/64 run |
| `npm run test:identity:https` | 10 PASS / actual Chromium, TLS, API, restricted PG và SMTP worker |
| Independent review probe | 5 RED / 1 PASS, expected exit 1; lỗi product còn nguyên |
| AWS, sustainable capacity, DB saturation, costs | NOT RUN / NOT MEASURED |

PostgreSQL riêng bind `127.0.0.1:55435`; Mailpit root phục vụ SMTP regression. Disposable DB/logins được teardown. Containers do review khởi động được dừng, volumes giữ lại. Không stage/commit, không sửa UI proposal/evidence hoặc migration lịch sử.

## Checklist và thứ tự sửa

Roadmap hiện **55/216 checked, 161 pending**: mở lại BOOT-01 và CAT-01/03/04/06/08 bằng `[ ] — IN PROGRESS`, gắn findings tương ứng. CAT-02/05/07/09 giữ named deliverable evidence; CAT-07 chỉ chấp nhận frozen-version/edit policy, lỗi clock của cùng publish path vẫn phải sửa ở CAT-06. CAT-10 còn PARTIAL. Phase04/ID-11, production ledger và các AWS gates không thay đổi.

- [ ] Fix GR-01, thêm deterministic exam/question lock + close regressions và kiểm chứng rollback/replay.
- [ ] Fix GR-02/04, test full valid bounded payloads và strict calendar input qua HTTP.
- [ ] Fix GR-03, validate browse/detail response against OpenAPI.
- [ ] Fix GR-05, chạy được command chuẩn cho API/Web/tooling.
- [ ] Fix GR-06, lưu diagnostic mới đúng exact SQL/config/source, có measured publish hoặc ghi rõ pending.
- [ ] Review lại diff; chạy toàn bộ backend integration, HTTPS nếu sửa shared HTTP/Identity, cập nhật evidence/checklist. Không tick lại chỉ vì có code/test mới.

Chưa triển khai runtime fixes trong review. Các items trên là phạm vi sửa đề xuất; Assessment start race cần implementation thật ở increment sau, không tạo stub để đóng CAT-10.

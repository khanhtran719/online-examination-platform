# UI-GAP register

Rà soát2026-10-13: phân biệt capability bị chặn, presentation fallback an toàn và
product scope chưa yêu cầu. Không phải mọi gap đều chặn toàn bộ live Candidate.
Lỗi live không được đổi sang demo; không bịa field/quyền, giải mã JWT hoặc cộng
tổng từ một trang. Màn hình không in mã `UI-GAP` thay lời hướng dẫn.

| ID | Thiếu ở contract/backend | Cách UI xử lý | Trạng thái |
| --- | --- | --- | --- |
| UI-GAP-01 | `GET /v1/me` không trả permissions | Live chặn toàn bộ Admin. Demo chỉ có preset trong bản demo, không có trong artifact live | BLOCKED LIVE |
| UI-GAP-02 | Attempt/history/result thiếu frozen title/tên phần | PORT-05B/C/D/G chỉ dùng metadata memory khớp owning exam + frozen version, không dùng current publication cho old attempt; fallback mã và navigation trên phần đã tải | LIMITATION; richer presentation chưa có contract, không chặn mọi Candidate operation |
| UI-GAP-03 | Chi tiết đề không có `serverNow` và quota còn lại | Không chạy countdown authoritative trước start; không suy quota từ history. Backend kiểm start và trả deadline/serverNow của attempt | LIMITATION; estimate không là guarantee |
| UI-GAP-04 | Không global text search/page totals/version directory | Search có nhãn trong phần đã tải, cursor navigation và known authorized version ID; không giả endpoint/tổng | PRODUCT CONSTRAINT, không là backend outage |
| UI-GAP-05 | History không có exam title; stats thiếu question labels | Fallback ID/version, không per-row Catalog N+1; null score khác0, dữ liệu đã tải khác toàn bộ history | LIMITATION; exact-version metadata projection cần quyết định riêng |
| UI-GAP-06 | Replay cần revision quản trị; candidate attempt revision không được dùng | Live không gửi replay. Demo lấy revision từ bộ nhớ mẫu của lượt FAILED | BLOCKED LIVE |
| UI-GAP-07 | Chưa có provider technical metrics/timeseries/cost cho Web | BusinessMetrics có API/adapter riêng và asOf; technical thiếu hiện unavailable. Live Admin vẫn chịu UI-GAP-01 | TECHNICAL PROVIDER MISSING; không gọi business API chưa tồn tại |
| UI-GAP-08 | Media/essay/reset password chưa có; magic link/GitHub người dùng để sau | Ba loại câu hỏi/plain text; login email/password, verified email. Không active buttons cho chức năng chưa triển khai | LATER / OUT OF CURRENT SCOPE |

Identity, Catalog, Assessment/Leaderboard và Reporting đã có controller/service/
PostgreSQL adapters trong repository; OpenAPI48 operations/445 examples. Không
đồng nhất “có code/backend local integration” với “browser full live đã nghiệm
thu”. [WEB-03](web-03-catalog-https-2026-10-13.md) đóng local Catalog browse/detail/
cursor/errors/start guards bằng actual HTTPS/API/PG; Identity HTTPS10 đã rerun.
[WEB-04](web-04-assessment-https-2026-10-13.md) verifies actual start/owned questions/answers/mark/pagination/frozen version and privacy. WEB-05+ remaining autosave/fault/submit/results/business integration stays open. UI-GAP-02 fallback was verified on real reload; richer metadata remains absent.
`useCapability`/AdminLayout vẫn chặn toàn bộ live Admin; replay còn độc lập thiếu
authorized admin revision. Không dùng Candidate resume để vượt hai gate này.

Nguồn đối chiếu: [Profile/Attempt/History DTO](../../apps/web/src/shared/api/dto.ts),
[HTTP adapter](../../apps/web/src/live/create-http-api.ts),
[Admin gate](../../apps/web/src/features/admin/gate.tsx),
[Replay controller](../../apps/web/src/features/admin/use-attempt-replay.ts),
[API/state contract](api-and-state-contract.md), [coverage review](web-tablet-coverage-review-2026-10-13.md).
Các constraints không tự cho phép đổi endpoint/schema; chủ sở hữu backend/product
phải quyết định projection/permission capability khi thực sự cần.

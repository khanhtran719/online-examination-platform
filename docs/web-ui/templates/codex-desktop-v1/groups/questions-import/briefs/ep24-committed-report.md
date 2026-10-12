# EP-24 — Báo cáo nhập đã ghi ngân hàng

## Vai trò và trạng thái

Route `/admin/imports/019b18a0-1000-7000-8000-000000000102`. Actor Minh Anh — quản trị được cấp capability liên quan. Loại ảnh: page. Fixture: `committedReport` trong [fixtures.json](../fixtures.json). Đây là specification desktop; chưa có runtime/mobile/production acceptance.

## Chức năng và bố cục

Trạng thái riêng: server đã trả report valid true, committed true, issues rỗng và đúng ba ImportedQuestion mappings. Đây là báo cáo import thật đã commit, khác báo cáo dry-run BC-0101. Actor có quyền xem báo cáo nhập. Breadcrumb “Quản trị / Nhập JSON / Báo cáo nhập”; H1 “Báo cáo nhập”; phía phải nút phụ “Nhập tệp khác”, link “Ngân hàng câu hỏi”. Không vẽ wizard chưa hoàn thành, không có nút “Nhập lại” thực hiện lại cùng dữ liệu.

Card chính rộng có badge success nhỏ kèm check “Đã ghi vào ngân hàng”, heading vừa phải “Đã nhập 3 câu hỏi”. Một helper “Cả 3 câu đã được ghi cùng một lần.” Không dùng hero pháo hoa, minh họa 3D hoặc chart tăng trưởng. Dãy facts nhãn–giá trị gồm “Mã báo cáo: BC-0102”, “Loại báo cáo: Nhập thật”, “Dữ liệu hợp lệ: Có”, “Câu đã ghi: 3”, “Tạo lúc: 12/10/2026 09:16 · UTC+7”. createdAt là 2026-10-12T02:16:00Z; không dùng timestamp dry-run 09:15. Full report id 019b18a0-1000-7000-8000-000000000102 có thể đặt nhỏ monospace dưới mã rút gọn, được wrap nếu cần; không tạo button copy nếu chưa cần. “Nhập thật” được suy ra từ committed true và phải không tạo field API mới trong handoff.

Bên dưới H2 “Kết quả kiểm tra”, text “Không có lỗi dòng.” rồi bảng “Các câu đã nhập” chỉ gồm “Mã trong tệp”, “Câu trong ngân hàng”, action link phù hợp. Row1 cloud-001 → Q-016; row2 cloud-002 → Q-017; row3 cloud-003 → Q-018. Đây là ba câu mới, có UUID khác bốn câu đã có trong bank; trùng nội dung mẫu không đồng nghĩa dùng lại ID. Q labels là định danh hiển thị cho UUID fixture; không phải field mới server. Mỗi mã câu link tới edit với UUID đúng; không in prompt/type/points hay explanation từ report vì ImportReport chỉ trả mapping, không những fields đó. Tránh thêm dữ liệu theo trí nhớ client làm report trông như payload đã trả đủ. Nếu thêm nút “Mở câu hỏi”, đó là navigation cùng mapping có thật. Không thêm count 100, số thất bại hoặc tổng điểm trong report này.

Nút “Về ngân hàng câu hỏi” Cobalt ở cuối card giúp tiếp tục công việc; “Nhập tệp khác” mở flow mới, không lặp commit báo cáo này. Nếu sau này report load lỗi phải phân biệt với valid false; retry dùng đọc GET, không gửi POST import. Pending có skeleton/refresh riêng, unknown không tự điền committed true. Ảnh hiện tại là terminal acknowledged success nên không có retry commit, warning chưa xác nhận hay spinner. Bảng không dump raw JSON/key, không có download CSV/XLSX hay batch undo không được hỗ trợ. Layout bảng chiếm main width với margin thoáng, sidebar analytics không cần và không được bịa để lấp khoảng trống.

## Hành động, pending và lỗi

- Nhập tệp khác
- Ngân hàng câu hỏi
- Mở từng câu theo mapping

Pending: Loading/refresh chỉ GET report, không commit lại.

- Lỗi đọc khác invalid report
- Unknown cần refresh
- Không partial import

## So với mã hiện tại

Mã Q/BC là label fixture, UUID mapping được giữ trong fixtures; không thêm prompt/key vào report.

## Style và review

Cobalt–Apricot theo [design contract](../../../design-contract.md): rail72px icon-only, header68px, main gutter28px, card radius20–24px, 2:1 cho form/sidebar, Be Vietnam Pro, nội dung tiếng Việt. Không biến mô tả tương tác thành ghi chú in-product. Kiểm tra trực tiếp label, fixture, totals, key visibility, hierarchy, CTA, backdrop và nền đúng frame.

## Nguồn

- `apps/web/src/features/admin/import-report-page.tsx`
- `docs/contracts/openapi.yaml#/components/schemas/ImportReport`
- `docs/contracts/openapi.yaml#/paths/~1v1~1admin~1question-imports~1{importId}/get`

Prompt độc lập: [prompts/ep24-committed-report.txt](../prompts/ep24-committed-report.txt), **1386 từ tách bằng whitespace**.

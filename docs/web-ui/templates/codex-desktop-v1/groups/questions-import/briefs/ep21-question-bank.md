# EP-21 — Ngân hàng câu hỏi

## Vai trò và trạng thái

Route `/admin/questions`. Actor Minh Anh — quản trị được cấp capability liên quan. Loại ảnh: page. Fixture: `bank` trong [fixtures.json](../fixtures.json). Đây là specification desktop; chưa có runtime/mobile/production acceptance.

## Chức năng và bố cục

Trạng thái riêng của ảnh: Ngân hàng câu hỏi đã tải dữ liệu, actor Minh Anh có quyền quản lý, đọc nội dung quản trị và nhập JSON. Header nội dung ghi breadcrumb “Quản trị / Ngân hàng câu hỏi”, H1 “Ngân hàng câu hỏi”, helper “Soạn và sử dụng câu hỏi trong các bản nháp.” Bên phải có nút Cobalt “Tạo câu hỏi”, nút phụ “Nhập JSON” và icon refresh có nhãn truy cập “Tải lại”. Không hiển thị một hero hay nhiều thẻ KPI. Phần chính là một card bảng trắng rộng gần toàn main.

Toolbar trong card có ô “Tìm trong phần đã tải”, dropdown “Loại câu hỏi” với giá trị “Tất cả” và helper ngắn “Chỉ lọc 4 câu đã tải”. Đây là tìm/lọc cục bộ trong items đã tải, không có backend global search hoặc số tổng không biết. Vẽ bảng các cột “Câu hỏi”, “Loại”, “Điểm”, “Trạng thái”, “Bản sửa”, action cuối hàng. Không có cột đáp án. Row 1 mã Q-012, nội dung “Trong mô hình IaaS, khách hàng quản lý thành phần nào?”, Một lựa chọn, 10, “Đang dùng”, 3. Row 2 Q-013, “Những biện pháp nào giúp bảo vệ tài khoản quản trị?”, Nhiều lựa chọn, 15, Đang dùng, 2. Row 3 Q-014, “Mã hóa dữ liệu khi truyền giúp giảm nguy cơ bị đọc trộm.”, Đúng–Sai, 10, Đang dùng, 1. Row 4 Q-015, “Dịch vụ DNS chuyển tên miền thành loại thông tin nào?”, Một lựa chọn, 5, “Đã lưu trữ”, 4. Mã nằm dưới nội dung, chữ nhỏ monospace. Không để trạng thái màu che mất nội dung.

Mỗi câu có link nội dung để sửa và menu ba chấm đóng, tuyệt đối không vẽ menu đang mở ở ảnh này. Footer bảng ghi “Đang hiển thị 4 câu trong phần đã tải”, nút “Tải thêm” có thể dùng vì fixture còn cursor, không phân trang số 1/99. Không vẽ đáp án đúng, explanation, người sửa cuối hay timestamp vì đây không phải field của danh sách cần hiển thị. Nút Tạo mở editor mới; Nhập JSON mở bước nhập; Tải thêm append items, giữ filter cục bộ; Tải lại phải xử lý danh sách đang hiển thị có chủ ý. Trong pending nút tương ứng khóa, lỗi tải có retry và không được giả thành ngân hàng trống. Các trạng thái phụ là yêu cầu handoff, không cùng xuất hiện trong ảnh đã tải này.

## Hành động, pending và lỗi

- Tạo câu hỏi
- Nhập JSON
- Tải lại
- Tìm trong phần đã tải
- Loại câu hỏi
- Sửa câu qua link
- Menu hàng
- Tải thêm

Pending: Khóa action tải đang chạy; giữ hàng đã tải khi append; không gửi trùng.

- Lỗi tải khác empty
- Thiếu quyền ẩn dữ liệu
- Search chỉ trong items đã tải

## So với mã hiện tại

Local search/filter, refresh và menu hàng là presentation target của prompt gốc; current source chưa có các controls đó. Key column hiện có được bỏ theo shared contract.

## Style và review

Cobalt–Apricot theo [design contract](../../../design-contract.md): rail72px icon-only, header68px, main gutter28px, card radius20–24px, 2:1 cho form/sidebar, Be Vietnam Pro, nội dung tiếng Việt. Không biến mô tả tương tác thành ghi chú in-product. Kiểm tra trực tiếp label, fixture, totals, key visibility, hierarchy, CTA, backdrop và nền đúng frame.

## Nguồn

- `apps/web/src/features/admin/question-list-page.tsx`
- `docs/contracts/openapi.yaml#/paths/~1v1~1admin~1questions/get`

Prompt độc lập: [prompts/ep21-question-bank.txt](../prompts/ep21-question-bank.txt), **1326 từ tách bằng whitespace**.

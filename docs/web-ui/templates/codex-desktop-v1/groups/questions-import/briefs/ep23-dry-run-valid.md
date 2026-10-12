# EP-23 — Kiểm tra hợp lệ, chưa nhập

## Vai trò và trạng thái

Route `/admin/imports/new`. Actor Minh Anh — quản trị được cấp capability liên quan. Loại ảnh: page. Fixture: `import + dryReport` trong [fixtures.json](../fixtures.json). Đây là specification desktop; chưa có runtime/mobile/production acceptance.

## Chức năng và bố cục

Trạng thái riêng: cùng tệp cau-hoi-dam-may.json và cùng ba entries đã được dry-run trả valid true, committed false, issues rỗng. JSON chưa thay đổi từ lần kiểm tra thành công. Tuyệt đối không hiển thị questionId được tạo hoặc lời xác nhận đã nhập; report dry-run không có questions được commit. Breadcrumb và shell giống màn nhập ban đầu; H1 “Nhập JSON”; helper “Dữ liệu đã được kiểm tra. Xác nhận để nhập vào ngân hàng.” Stepper “1. Chọn dữ liệu” completed, “2. Kiểm tra” active, “3. Xác nhận nhập” chưa completed.

Main là card rộng với status bar gọn: icon check nhỏ, title “Dữ liệu hợp lệ”, subline nổi bật nhưng không quá lớn “Chưa nhập vào ngân hàng”. Hiển thị ba facts nhãn–giá trị “Số câu: 3”, “Phiên bản dữ liệu: 1”, “Lỗi kiểm tra: 0”. Tổng số câu là từ file đã kiểm tra; không gọi 3 là số đã tạo. Type breakdown được tính cục bộ: “Một lựa chọn: 1”, “Nhiều lựa chọn: 1”, “Đúng–Sai: 1”. Không cần cards KPI màu lớn hoặc biểu đồ. Nếu thể hiện timestamp báo cáo, dùng “Kiểm tra lúc 12/10/2026 09:15 · UTC+7”, xuất phát createdAt 2026-10-12T02:15:00Z; không bịa “vừa xong” hoặc ai kiểm tra.

Phần chính phía dưới H2 “Các câu đã kiểm tra”, bảng columns “Mã trong tệp”, “Câu hỏi”, “Loại”, “Điểm”. Hàng cloud-001 là “Trong mô hình IaaS, khách hàng quản lý thành phần nào?”, Một lựa chọn, 10. Hàng cloud-002 là “Những biện pháp nào giúp bảo vệ tài khoản quản trị?”, Nhiều lựa chọn, 15. Hàng cloud-003 là “Mã hóa dữ liệu khi truyền giúp giảm nguy cơ bị đọc trộm.”, Đúng–Sai, 10. Các nội dung wrap tối đa hai dòng tự nhiên, không giấu ngữ cảnh chính. Không có key hoặc explanation trong bảng; không có một câu thứ tư archived. Có link phụ “Sửa dữ liệu JSON” trở về vùng nhập; sửa bất kỳ nội dung nào làm kết quả này hết hiệu lực cho commit.

Sidebar ngắn “Trước khi nhập” có copy người dùng vừa đủ: “Ba câu sẽ được thêm cùng một lần.” và “Chỉ nhập nội dung đã kiểm tra.” Nút Cobalt “Nhập câu hỏi” ở cuối trang mở confirmation, chưa tự commit. Nút phụ “Kiểm tra lại” gửi dry-run theo intent mới khi hợp lý và không phải import. Mã báo cáo có thể rút gọn “BC-0101” với full id giữ ở handoff; không nhầm thành mã lô committed BC-0102. Khi confirm chưa mở, không vẽ overlay. Pending/error hướng dẫn ngoài ảnh: disable commit nếu busy, nội dung đổi, valid false hoặc đã committed; timeout phải xác minh/giữ frozen content, không âm thầm tạo lô mới. Đây là ready-to-confirm, không màn thành công nhập.

## Hành động, pending và lỗi

- Nhập câu hỏi mở confirm
- Kiểm tra lại
- Sửa dữ liệu JSON

Pending: Chặn dry/commit lặp; đổi JSON bắt kiểm tra lại.

- Invalid báo issues
- Timeout không kết luận
- Nội dung đổi invalidates dry-run

## So với mã hiện tại

Bảng preview/breakdown lấy từ local inspected input, không từ ImportReport.questions rỗng.

## Style và review

Cobalt–Apricot theo [design contract](../../../design-contract.md): rail72px icon-only, header68px, main gutter28px, card radius20–24px, 2:1 cho form/sidebar, Be Vietnam Pro, nội dung tiếng Việt. Không biến mô tả tương tác thành ghi chú in-product. Kiểm tra trực tiếp label, fixture, totals, key visibility, hierarchy, CTA, backdrop và nền đúng frame.

## Nguồn

- `apps/web/src/features/admin/import-page.tsx`
- `apps/web/src/shared/validation.ts`
- `docs/contracts/openapi.yaml#/paths/~1v1~1admin~1question-imports/post`
- `docs/contracts/openapi.yaml#/components/schemas/ImportRequest`
- `docs/contracts/openapi.yaml#/components/schemas/ImportReport`

Prompt độc lập: [prompts/ep23-dry-run-valid.txt](../prompts/ep23-dry-run-valid.txt), **1376 từ tách bằng whitespace**.

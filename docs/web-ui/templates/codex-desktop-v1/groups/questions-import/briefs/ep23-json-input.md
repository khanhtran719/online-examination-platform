# EP-23 — Chọn hoặc dán JSON

## Vai trò và trạng thái

Route `/admin/imports/new`. Actor Minh Anh — quản trị được cấp capability liên quan. Loại ảnh: page. Fixture: `import` trong [fixtures.json](../fixtures.json). Đây là specification desktop; chưa có runtime/mobile/production acceptance.

## Chức năng và bố cục

Trạng thái riêng: bước đầu chuẩn bị lô nhập; tệp JSON mẫu đã được chọn để đọc vào textarea, chưa gửi kiểm tra server và chưa nhập ngân hàng. Actor có quyền nhập câu hỏi. Breadcrumb “Quản trị / Ngân hàng câu hỏi / Nhập JSON”; H1 “Nhập JSON”; helper “Kiểm tra dữ liệu trước, xác nhận nhập sau.” Dùng stepper ngang gọn “1. Chọn dữ liệu”, “2. Kiểm tra”, “3. Xác nhận nhập”; chỉ bước 1 active Cobalt, bước sau neutral. Đây là điều hướng tiến trình, không phải ba màn trong một ảnh.

Main cột trái khoảng hai phần ba chứa card “Nguồn dữ liệu”. Nửa trên có vùng chọn tệp viền dashed rất nhẹ với icon upload nhỏ, label “Chọn tệp JSON”, dòng filename “cau-hoi-dam-may.json” và button phụ “Chọn tệp khác”. Text helper “JSON · tối đa 1 MiB · 1–100 câu”. Bên cạnh có link “Tải mẫu JSON”; mẫu phải là JSON tổng hợp hợp lệ, không network URL để nhập remote. Phần dưới là textarea monospace label “Nội dung JSON”, thể hiện JSON thực với schemaVersion 1, dryRun true, mảng questions chứa ba entries cloud-001, cloud-002, cloud-003 từ fixture. Vùng code có cuộn nội bộ; được hiển thị phần đầu đầy đủ của entry cloud-001 với type SINGLE_CHOICE, prompt IaaS, options position/text, correctOptionPositions [2], points 10 và explanation đúng mẫu. Không bịa dấu ba chấm thành nội dung JSON được chấp nhận; các entry còn lại ở bên dưới vùng cuộn, không cần nhét tất cả code lên một ảnh.

Sidebar là card “Quy tắc nhập” trình bày gọn ba dòng nhãn–giá trị: “Định dạng: JSON”, “Phiên bản dữ liệu: 1”, “Số câu: 3 / 100”. Nhắc một câu “Chọn tệp chỉ đọc nội dung, chưa nhập câu hỏi.” Dòng ngắn “Một lựa chọn · Nhiều lựa chọn · Đúng–Sai” cho loại hỗ trợ, không tạo analytics chart. Footer của textarea có byte UTF-8 đúng fixture nếu in số; không dùng kích thước file bịa. Có thể bỏ số byte để giảm text density, giữ giới hạn rõ. Không hiện badge xanh hợp lệ server hoặc mã báo cáo vì chưa dry-run.

Action bar có nút Cobalt “Kiểm tra dữ liệu”, nút “Nhập câu hỏi” vô hiệu và link “Ngân hàng câu hỏi”. Kiểm tra là dry-run tạo báo cáo nhưng không commit, chỉ khi valid và nội dung không đổi mới bật nhập. Nút chọn tệp/paste thay nội dung phải vô hiệu kết quả kiểm tra cũ. Khi lỗi JSON, file quá lớn hoặc entry thiếu field, chỉ hiển thị alert cạnh vùng nhập với field/clientRef đúng nguồn, không import. Khi dry-run pending chặn gửi lặp, label “Đang kiểm tra…”. Timeout chưa xác nhận giữ cùng nội dung gửi và retry đúng intent; không tự chuyển bước thành công. Trong ảnh hiện tại không vẽ lỗi giả, tiến trình tải hoặc receipt thành công.

## Hành động, pending và lỗi

- Chọn tệp JSON
- Chọn tệp khác
- Dán JSON
- Tải mẫu JSON
- Kiểm tra dữ liệu
- Nhập câu hỏi disabled

Pending: Đang kiểm tra…; chặn lặp; giữ JSON.

- Sai cú pháp
- Quá 1 MiB
- Thiếu fields
- Dry-run lỗi
- Timeout chưa xác nhận

## So với mã hiện tại

Stepper, download mẫu và preview số entries là presentation target; source có file input/paste + dry-run/commit nhưng chưa stepper/download.

## Style và review

Cobalt–Apricot theo [design contract](../../../design-contract.md): rail72px icon-only, header68px, main gutter28px, card radius20–24px, 2:1 cho form/sidebar, Be Vietnam Pro, nội dung tiếng Việt. Không biến mô tả tương tác thành ghi chú in-product. Kiểm tra trực tiếp label, fixture, totals, key visibility, hierarchy, CTA, backdrop và nền đúng frame.

## Nguồn

- `apps/web/src/features/admin/import-page.tsx`
- `apps/web/src/shared/validation.ts`
- `docs/contracts/openapi.yaml#/paths/~1v1~1admin~1question-imports/post`
- `docs/contracts/openapi.yaml#/components/schemas/ImportRequest`
- `docs/contracts/openapi.yaml#/components/schemas/ImportReport`

Prompt độc lập: [prompts/ep23-json-input.txt](../prompts/ep23-json-input.txt), **1399 từ tách bằng whitespace**.

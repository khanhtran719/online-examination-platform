# EP-23 — Xác nhận nhập câu hỏi

## Vai trò và trạng thái

Route `/admin/imports/new`. Actor Minh Anh — quản trị được cấp capability liên quan. Loại ảnh: dialog. Fixture: `import + dryReport` trong [fixtures.json](../fixtures.json). Đây là specification desktop; chưa có runtime/mobile/production acceptance.

## Chức năng và bố cục

Trạng thái riêng: confirmation đang mở sau valid dry-run ba câu; chưa có yêu cầu commit và chưa có câu được tạo. Dùng đúng ảnh nền ep23-dry-run-valid làm edit target sau khi đã xem ảnh, giữ tuyệt đối shell, bố cục, ba rows, số điểm, trạng thái “Chưa nhập vào ngân hàng”, title và vị trí action. Chỉ thêm backdrop neutral opacity khoảng 30–35% và một dialog trắng centered rộng 560px. Không đổi nền thành report thành công, không thay fixture, không phóng dialog lên chiếm cả canvas và không có dialog thứ hai.

Dialog có icon upload nhỏ Cobalt trong ô primary tint, H2 “Xác nhận nhập câu hỏi”, close x góc trên phải. Copy chính “Nhập 3 câu đã kiểm tra vào ngân hàng?” đọc tự nhiên, không dài như chính sách kỹ thuật. Dưới đó là block nhãn–giá trị đơn giản bằng dividers: “Tệp: cau-hoi-dam-may.json”, “Số câu: 3”, “Kết quả kiểm tra: Hợp lệ”. Có thể thêm một dòng loại “1 Một lựa chọn · 1 Nhiều lựa chọn · 1 Đúng–Sai”, không lặp lại cả bảng và không phơi đáp án. Helper hai câu ngắn “Nội dung phải khớp với lần kiểm tra thành công. Cả 3 câu sẽ được nhập cùng một lần.” Không dùng câu “đã nhập thành công” vì đây là trước confirm, không viết “nhập một phần” trái atomic. Không in raw JSON, uuid dài, HTTP hoặc khóa kỹ thuật lên modal.

Footer có “Hủy” nút phụ bên trái/đầu nhóm và “Nhập vào ngân hàng” Cobalt ở bên phải. Nút chính là hành động commit rõ ràng khác “Kiểm tra dữ liệu”, không để cả hai cùng tên “Tiếp tục”. Close và Hủy đóng modal, giữ cùng JSON/snapshot/report, không gửi mutation. Primary chỉ bật nếu valid, committed false, JSON vẫn bằng snapshot và không busy. Sau bấm, cần khóa submit và giữ original intent khi mạng chưa xác nhận; kết quả receipt rồi mới điều hướng report. Những điều kiện triển khai này không phải text annotation trong ảnh. Ảnh đang ở idle awaiting confirmation nên primary vẫn enabled, không spinner hoặc lỗi mạng.

Nền bị dim vừa đủ để đọc được “Dữ liệu hợp lệ” và ba hàng cloud-001/cloud-002/cloud-003 nhưng không cạnh tranh với title modal. Dialog radius 24px, padding 28px; khoảng cách header/body/actions theo 8px; body16px, helper14px, nút44px. Không dùng full orange/red vì import là action quản trị bình thường, không xóa dữ liệu. Hệ thống focus/a11y phải theo contract nhưng không vẽ tab order. Tạo một ảnh overlay chính xác trên nền đã có, không một mockup độc lập có page mới.

## Hành động, pending và lỗi

- Hủy
- Đóng
- Nhập vào ngân hàng

Pending: Commit chặn gửi lặp; timeout giữ frozen intent; receipt mới chuyển report.

- JSON đổi disable commit
- Dry invalid không mở modal
- Unknown không báo thành công

## So với mã hiện tại

Đối ứng dialog hiện có trong ImportPage; copy/visual được làm rõ.

## Style và review

Cobalt–Apricot theo [design contract](../../../design-contract.md): rail72px icon-only, header68px, main gutter28px, card radius20–24px, 2:1 cho form/sidebar, Be Vietnam Pro, nội dung tiếng Việt. Không biến mô tả tương tác thành ghi chú in-product. Kiểm tra trực tiếp label, fixture, totals, key visibility, hierarchy, CTA, backdrop và nền đúng frame.

## Nguồn

- `apps/web/src/features/admin/import-page.tsx`
- `apps/web/src/shared/validation.ts`
- `docs/contracts/openapi.yaml#/paths/~1v1~1admin~1question-imports/post`
- `docs/contracts/openapi.yaml#/components/schemas/ImportRequest`
- `docs/contracts/openapi.yaml#/components/schemas/ImportReport`

Prompt độc lập: [prompts/ep23-import-confirm.txt](../prompts/ep23-import-confirm.txt), **1353 từ tách bằng whitespace**.

# Desktop UI và dialog — kế hoạch tạo ảnh theo nhóm, 2026-10-12

## Phạm vi hiện hành

Người dùng yêu cầu giữ ảnh preflight làm template, tạo UI còn thiếu, desktop/dialog trước và mobile sau. Bổ sung: mỗi ảnh cần mô tả chức năng và phong cách rõ; prompt có thể dài 1.000–1.500 từ; mỗi nhóm có tác nhân triển khai. Đã áp dụng [quy định thiết kế chung](templates/codex-desktop-v1/design-contract.md). Không đổi application/API/architecture/database/AWS hoặc nghiệm thu production trong đợt tạo ảnh.

Một image = một page/state. Giữ template cũ; không tái tạo toàn bộ màn đã chọn. Bổ sung các màn chính còn thiếu, variants bắt buộc và dialog Admin. Supplementary states rộng hơn vẫn ghi coverage riêng; không đóng chỉ vì đã có page chính. Thứ tự này không tự cấp quyền chạy mọi phase roadmap.

## Tác nhân và quyền sở hữu

| Nhóm | Tác nhân | Phạm vi file | Đầu ra |
| --- | --- | --- | --- |
| Questions/Import | ui_questions_import | `templates/codex-desktop-v1/groups/questions-import/` | Bank, ba loại/Create/Edit, import chọn/dry-run/confirm/report, type-change/archive/conflict/preview |
| Operations | ui_operations | `templates/codex-desktop-v1/groups/operations/` | Overview, monitor index, monitor một đề, submissions |
| Reporting/Shared | ui_reporting_shared | `templates/codex-desktop-v1/groups/reporting-shared/` | Attempt detail/replay, statistics, metrics, audit/drawer, public404 |
| Editor/Dialogs và điều phối | root | `templates/codex-desktop-v1/groups/editor-dialogs/` và tài liệu tổng | Create variants, validation, publish/unpublish/archive/remove/leave/conflict; hợp nhất/review |

Tác nhân không sửa source hoặc tài liệu của nhóm khác. Root sở hữu design contract, registry, manifest tổng và kết luận acceptance. Các tác nhân phải đối chiếu nguồn thực, không coi brief cũ là bằng chứng endpoint đã tồn tại. Root review prompts trước generation; đây là checkpoint phối hợp nội bộ, không yêu cầu người dùng cấp phép lại.

## Mỗi ảnh cần giao những gì

1. Tên/ID local, route, actor/quyền, mục tiêu và state cụ thể.
2. Nguồn API/DTO/current Web/brief; tách khả năng hiện có và UX cần làm khi port.
3. Dữ liệu mẫu cố định, tổng đúng, trường nullable, timezone, thời điểm/scope có nguồn.
4. Thứ tự từng vùng, kích thước tương đối, typography, tokens, rail/header/table/card/dialog.
5. Nội dung từng control, hành động, điều kiện enabled/disabled, confirm/cancel/pending/error/unconfirmed và quyền xem.
6. Prompt đứng độc lập khoảng 1.000–1.500 từ khi cần, exact Vietnamese labels, không nhồi hết requirement thành chữ trên ảnh.
7. PNG thực, prompt nguyên bản, actual dimensions, SHA-256 và review findings. Không bịa Stitch ID/viewport/runtime evidence.

## Checklist

- [x] Xác nhận desktop/dialog trước, mobile sau với người dùng.
- [x] Giữ preflight ready thành template tham chiếu có findings, bản sao byte-identical và manifest.
- [x] Viết design contract chung: tokens, shell, fixture, correctness, dialog và acceptance.
- [x] Phân công tác nhân theo nhóm, thư mục độc lập.
- [x] Questions/Import: 13 mô tả/prompt/ảnh chọn cuối; root review.
- [x] Operations: 4 mô tả/prompt/ảnh chọn cuối; root review.
- [x] Reporting/Shared: 7 mô tả/prompt/ảnh chọn cuối; root review.
- [x] Editor/Dialogs: 10 mô tả/prompt/ảnh chọn cuối; root review.
- [x] Hợp nhất 35 references, kiểm tra hash/file/link/count và registry theo file thực.
- [ ] Mobile và supplementary states: vẫn backlog riêng, không nghiệm thu bằng ảnh desktop.
- [ ] Port và kiểm thử interaction/API/accessibility/responsive: phase khác, chưa làm trong đợt này.

## Rủi ro và cách kiểm soát

| Rủi ro | Hệ quả | Kiểm soát |
| --- | --- | --- |
| Mỗi tác nhân tự diễn giải style | Bộ màn khác rail/font/card/tỷ lệ | Một design contract cố định; root review toàn bộ; dùng cùng shell/fixture |
| Prompt dài nhưng mâu thuẫn | Model ưu tiên sai, chữ thừa hoặc bỏ CTA | Một state/ảnh; phân rõ nội dung xuất hiện và yêu cầu lúc code; kiểm tra trước generation |
| Tự thêm dữ liệu/chức năng | Mockup đẹp nhưng không triển khai đúng API | Đọc source/DTO/contract, ghi source availability; không mở API để chiều ảnh |
| Raster sai chữ/số/tổng | Thông tin khó đọc hoặc sai nghiệp vụ | Review từng ảnh, không chỉ nhìn thumbnail; sửa hoặc không giữ nếu lỗi material |
| Dialog đổi page nền | Xác nhận nhầm đề/draft | Chỉnh đúng base image nếu có, giữ cùng dữ liệu; review background trước acceptance |
| Nhiều tác nhân cùng ghi file | Mất thay đổi/registry sai | Thư mục riêng; chỉ root cập nhật manifest/registry tổng |
| Regeneration nhiều | Tốn thời gian và quota tạo ảnh | Review prompt trước; sửa theo lỗi cụ thể; không tạo lại page đã có nếu chỉ cần overlay |
| Đánh đồng ảnh với UI hoàn thành | Bỏ qua keyboard/API/security/mobile | Tách template/image review, implementation và production acceptance; roadmap không tick theo ảnh |
| Lệch giữa các lần tạo dù prompt giống | Component nhìn khác nhau | Ghi findings, dùng shared components/CSS khi code, render lại từ code để QA chính xác |

Không có đảm bảo một prompt dài sẽ tạo ra chữ/font/kích thước chính xác. Không đưa ra ước tính giá hoặc thời gian hoàn tất chưa đo. Nếu công cụ tạo ảnh không hoạt động, lưu prompt và báo giới hạn; không tự chuyển sang API/CLI trả phí hoặc dựng placeholder rồi gọi là ảnh đã tạo.

## Acceptance

Kết quả đợt này: [35 references và gallery](templates/codex-desktop-v1/README.md), [review/việc tiếp theo](templates/codex-desktop-v1/review-2026-10-12.md), [validation](templates/codex-desktop-v1/validation.json). Có 34 frame mới, 34 brief và 34 primary prompts 1.039–1.491 whitespace words; 11 iterations lỗi giữ lịch sử, không tính thêm coverage. Registry 30 families giữ/3 main references review chờ chọn/0 prompt-only. Coverage chỉ áp dụng named states; EP-22 Create multiple/true-false, mobile và broader states vẫn mở. Application và roadmap không tick từ ảnh.

Giữ visual reference theo yêu cầu người dùng không chấp thuận capability tự thêm. Ảnh có lỗi dữ liệu/quyền/hành vi cần sửa hoặc ghi không đạt; lỗi nhỏ về visual có thể giữ kèm implementation finding. Coverage count dựa trên file đã tạo và review, không dựa trên prompt/tác nhân đang chạy. Không có production, SLO, performance/cost hoặc runtime acceptance mới.

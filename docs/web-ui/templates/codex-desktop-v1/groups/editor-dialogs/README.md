# Exam editor và dialog — desktop

**COMPLETE visual-reference scope:**10 ảnh chọn cuối,10 brief,10 prompt chính1136–1163 whitespace words. Root tạo và trực tiếp review từng ảnh;14 PNG giữ4 iterations được thay thế, không tính thêm coverage. [Design contract](../../design-contract.md), [manifest nhóm](screens.json), [review tổng](../../review-2026-10-12.md) và [gallery](../../gallery.html).

| ID local | Màn/state | Mô tả chức năng và ảnh | Prompt chính |
| --- | --- | --- | --- |
| CD-EP20-CREATE-INFO | Tạo đề — Thông tin | [Ảnh](create-information-v1.png), [brief](create-information.brief.md) | [1160 từ](create-information.prompt.md) |
| CD-EP20-CREATE-STRUCTURE | Tạo đề — Thêm câu hỏi | [Ảnh](create-structure-empty-v1.png), [brief](create-structure-empty.brief.md) | [1147 từ](create-structure-empty.prompt.md) |
| CD-EP20-CREATE-REVIEW | Tạo đề — Rà soát hợp lệ | [Ảnh](create-preflight-ready-v2.png), [brief](create-preflight-ready.brief.md) | [1147 từ](create-preflight-ready.prompt.md) |
| CD-EP20-VALIDATION | Rà soát — Cần sửa hai mục | [Ảnh](preflight-validation-v2.png), [brief](preflight-validation.brief.md) | [1158 từ](preflight-validation.prompt.md) |
| CD-EP20-PUBLISH | Xác nhận lưu và phát hành | [Ảnh](publish-confirmation-v1.png), [brief](publish-confirmation.brief.md) | [1163 từ](publish-confirmation.prompt.md) |
| CD-EP19-UNPUBLISH | Gỡ phát hành đề | [Ảnh](unpublish-confirmation-v2.png), [brief](unpublish-confirmation.brief.md) | [1158 từ](unpublish-confirmation.prompt.md) |
| CD-EP19-ARCHIVE | Lưu trữ đề | [Ảnh](archive-confirmation-v1.png), [brief](archive-confirmation.brief.md) | [1159 từ](archive-confirmation.prompt.md) |
| CD-EP20-REMOVE | Bỏ phần thi | [Ảnh](remove-section-confirmation-v2.png), [brief](remove-section-confirmation.brief.md) | [1143 từ](remove-section-confirmation.prompt.md) |
| CD-EP20-LEAVE | Rời bản nháp chưa lưu | [Ảnh](leave-unsaved-confirmation-v1.png), [brief](leave-unsaved-confirmation.brief.md) | [1144 từ](leave-unsaved-confirmation.prompt.md) |
| CD-EP20-CONFLICT | Đối chiếu xung đột bản nháp | [Ảnh](draft-conflict-comparison-v1.png), [brief](draft-conflict-comparison.brief.md) | [1136 từ](draft-conflict-comparison.prompt.md) |

## Checklist đã hoàn tất

- [x] Đọc current Web ExamInformation/ExamStructure/ExamEditor/useExamDraft và brief05B/review05B-1.
- [x] Prompt từng ảnh kiểm style chung, fixture, nguồn, current-vs-target và hành động.
- [x] Create không loaded revision; NEVER/board off; validation3/4/70 và badge3/5 đúng.
- [x] Generation bằng built-in, ảnh/correction lưu riêng; exact source/dimensions/hash/history trong manifest.
- [x] Đã sửa board-off/local-check/save, green checklist mâu thuẫn, list controls tự thêm và nhãn draft-version sai.
- [x] Root visual review toàn10 selected; giữ kèm findings khi port.
- [ ] Port shared rail/header/stepper, minutes conversion, controls và state handlers.
- [ ] Mobile, pending/error/unconfirmed/accessibility/runtime/integration cần evidence riêng.

## Cách dùng cho người triển khai

Đọc brief trước để hiểu route/quyền/state/fixture và current-vs-target. Sau đó xem ảnh chọn cuối và prompt chỉ định từng vùng. Lấy tokens/contract làm nguồn số đo; không copy glyph/footer/control thừa trong raster. Mỗi brief có checklist port chưa triển khai. Cancel/close luôn giữ dữ liệu trước mutation; receipt và validation thật quyết định success, không dựa vào checklist local.

Create có1phần2câu20điểm khi ready, khác draft edit3/6/100. Validation có hai lỗi và3/4/70. Remove preview2/4/80 nhưng nền3/6/100. Conflict latest5/75/80 so với local4/90/100. Không gộp fixtures thành một phiên bản đề duy nhất. Unpublish/archive là target dialogs trên list; current list mới có Sửa đề, không claim handler mới đã hoạt động.

## Findings và provenance

Shared shell/stepper/icon/card spacing cần chuẩn hóa. Notification bell, helper leaderboard ngoài source và chevrons so sánh phải bỏ khi port; không coi control do raster tự thêm là requirement. Modal sizes và typography cần CSS/browser verification.

Primary prompts có Markdown wrapper: copy fenced text, không wrapper. Suffix edit trong screens.json và correction prompts tách riêng. Lần đầu validation có một suffix không được lưu nguyên văn, đã ghi limitation; selected correction nguyên văn và cả v1/v2 vẫn có nguồn/hash. Không dựng lại suffix rồi gọi exact provenance. Overlay edits giữ semantic fixture nhưng có thể đổi raster dimensions, không claim pixel-identical. Không runtime/mobile/production acceptance.

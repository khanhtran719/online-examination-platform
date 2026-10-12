# Codex Desktop V1

Người dùng yêu cầu giữ ảnh preflight làm template tham chiếu và tạo tiếp các phần desktop/dialog còn thiếu; mobile làm sau. [Design contract chung](design-contract.md) khóa style, shell, dữ liệu, quyền và cách review. [Manifest](manifest.json) ghi file thực, prompt, kích thước, SHA-256 và findings.

## Đã giữ

- [x] [Admin preflight ready](images/preflight-ready-v1.png), [prompt nguyên bản](prompts/preflight-ready-v1.prompt.md). Bản sao byte-identical của pilot; giữ có findings về tỷ lệ cột/rail/token lúc code. Đây là lựa chọn visual reference theo yêu cầu người dùng, không nghiệm thu ứng dụng.

## Hoàn tất đợt desktop/dialog

**35 ảnh chọn cuối: 34 frame mới + preflight đã giữ.** Mỗi frame mới có brief riêng, prompt chính 1.039–1.491 whitespace words, ảnh thực, dimensions, hash và review. [Gallery](gallery.html) chỉ hiển thị ảnh chọn cuối. [Review tổng và các việc còn lại](review-2026-10-12.md) phân biệt visual reference và UI đã triển khai.

| Nhóm | Ảnh mới | Tài liệu và mô tả từng ảnh |
| --- | ---: | --- |
| Editor/dialogs | 10 | [Create, validation, publish/unpublish/archive/remove/leave/conflict](groups/editor-dialogs/README.md) |
| Questions/Import | 13 | [Bank, ba loại câu, Create, import và dialog](groups/questions-import/README.md) |
| Operations | 4 | [Overview, monitor index, exam monitor, submissions](groups/operations/README.md) |
| Reporting/Shared | 7 | [Attempt, thống kê, metrics, audit, 404, replay và drawer](groups/reporting-shared/README.md) |

- [x] Questions/Import: 13 brief/prompt/ảnh chọn cuối và review.
- [x] Operations: 4 brief/prompt/ảnh chọn cuối và review.
- [x] Reporting/Shared: 7 brief/prompt/ảnh chọn cuối và review.
- [x] Exam editor/dialogs: 10 brief/prompt/ảnh chọn cuối và review.
- [x] Hợp nhất 35 references; registry, hash, dimensions, file/link/count đã kiểm tra.
- [ ] Mobile và supplementary states ngoài phạm vi đợt desktop; không suy ra đã hoàn thành.
- [ ] Port shared shell/components, từng page và kiểm thử interaction/API/accessibility/responsive.

Mỗi nhóm có một tác nhân riêng; root trực tiếp làm Editor và review tổng. Đã review prompt trước và từng ảnh sau generation, sửa lỗi dữ liệu/control quan trọng. Có 46 PNG trong bundle: 35 chọn cuối và 11 iterations được thay thế. Iterations không tính thêm coverage. Các sai lệch nhỏ về logo/icon/rail/spacing được ghi để chuẩn hóa khi code. Mẫu cũ giữ nguyên; application code và roadmap implementation chưa đổi.

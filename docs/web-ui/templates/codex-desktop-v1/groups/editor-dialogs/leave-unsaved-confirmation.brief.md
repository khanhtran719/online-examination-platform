# Rời bản nháp chưa lưu — brief triển khai

ID local: CD-EP20-LEAVE. Page family: EP-20. Route: /admin/exams/:examId/edit. Actor: Admin có catalog.manage. State duy nhất: Unsaved exit confirmation. Đây là mô tả target hình ảnh/hành vi, không nghiệm thu runtime.

## Mục tiêu và dữ liệu

Rời editor step2: primary ở lại, rời chỉ bỏ unsaved edits; không autosave hoặc hứa recovery reload.

Cùng step 2, bản sửa 4 và local changes; 90 phút/3 phần/6 câu/100 điểm. Điều hướng nội bộ đang bị chặn trước khi rời.

## Style và từng vùng

Bám [design contract](../../design-contract.md): canvas #F3F6FC, surface trắng, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540 và muted #58627A. Be Vietnam Pro cho tiếng Việt; JetBrains Mono chọn lọc cho mã/số. Nhịp 8px, card radius20–24px/padding24–32px; controls44px/radius12px. Header trắng68px, rail icon-only72px và paper/check vector chung. Đo các giá trị này trong CSS khi port, không suy từ raster.

Đọc breadcrumb/title/state trước, sau đó form hoặc table, cuối cùng action. Form/review gần2:1; table dùng full-width. Dialog dùng nền đúng fixture trước mutation, centered520–600px; conflict rộng780–840px. Backdrop neutral, close/cancel rõ. Không biến helper thành hero, không card lồng nhiều lớp, không lộ keys trong review/bank và không thêm analytics để lấp khoảng trống.

[Prompt đầy đủ 1144 whitespace words](leave-unsaved-confirmation.prompt.md) chỉ định chính xác từng vùng/copy/control. [Ảnh chọn cuối](leave-unsaved-confirmation-v1.png) là tham chiếu bố cục; [metadata/review](screens.json) ghi các sửa ảnh và findings. Primary prompt, generation suffix và correction prompt trong metadata quyết định provenance; không sửa lịch sử để giả prompt đã tạo ảnh hoàn hảo ngay từ đầu.

## Hành động và điều kiện

- Ở lại chỉnh sửa là primary; X/Esc giữ local state.
- Rời và bỏ thay đổi chỉ bỏ local unsaved edits rồi đi đúng đích nội bộ.
- Không autosave, không Lưu và rời hoặc hứa recovery reload.

Pending phải giữ intent và khóa gửi lặp. Timeout/unknown không được suy là success hoặc definitive failure; giữ draft/context và đối chiếu kết quả an toàn. Lỗi validation giữ input và focus field thích hợp; permission revoke phải ẩn nội dung được bảo vệ. Các state này cần implementation và kiểm thử riêng, không in tất cả trong ảnh.

## Current so với target

Navigation blocker cần implementation riêng, ảnh không chứng minh handler. Reload/tab close dùng handling native và phải test; không xóa saved draft/kết quả.

Bản raster không xác nhận font, contrast, focus trap, keyboard, API, responsive hoặc durability. Những lỗi icon/header/spacing nhỏ trong review phải chuẩn hóa khi port. Không thay API/backend để hợp control do ảnh tự vẽ.

## Nguồn

- [05b-admin-preflight-dialogs-desktop.md](../../../../../../docs/web-ui/stitch-page-prompts-v3/05b-admin-preflight-dialogs-desktop.md)
- [use-exam-draft.ts](../../../../../../apps/web/src/features/admin/use-exam-draft.ts)

## Task khi port — chưa triển khai

- [ ] Dựng một state đúng fixture, phân rõ dữ liệu đã lưu và edits local.
- [ ] Dùng shared Admin shell, tokens và controls; bỏ mọi control/copy ngoài contract.
- [ ] Nối actions đúng intent/quyền; cancel/X/Esc không mutation.
- [ ] Xử lý pending, network unknown, failure và receipt mà không báo success giả.
- [ ] Test behavior thay đổi và review browser desktop; mobile/state được nghiệm thu riêng.

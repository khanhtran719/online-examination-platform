# Lưu trữ đề — brief triển khai

ID local: CD-EP19-ARCHIVE. Page family: EP-19. Route: /admin/exams. Actor: Admin có catalog.manage. State duy nhất: Archive confirmation. Đây là mô tả target hình ảnh/hành vi, không nghiệm thu runtime.

## Mục tiêu và dữ liệu

Lưu trữ đề CSDL45phút; giữ lượt và kết quả, không hứa unarchive; nền vẫn published trước confirm.

Cơ sở dữ liệu — Kiểm tra giữa kỳ; 45 phút, published, bản sửa 6; lịch 17/11/2026 13:30–16:00; nền vẫn published.

## Style và từng vùng

Bám [design contract](../../design-contract.md): canvas #F3F6FC, surface trắng, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540 và muted #58627A. Be Vietnam Pro cho tiếng Việt; JetBrains Mono chọn lọc cho mã/số. Nhịp 8px, card radius20–24px/padding24–32px; controls44px/radius12px. Header trắng68px, rail icon-only72px và paper/check vector chung. Đo các giá trị này trong CSS khi port, không suy từ raster.

Đọc breadcrumb/title/state trước, sau đó form hoặc table, cuối cùng action. Form/review gần2:1; table dùng full-width. Dialog dùng nền đúng fixture trước mutation, centered520–600px; conflict rộng780–840px. Backdrop neutral, close/cancel rõ. Không biến helper thành hero, không card lồng nhiều lớp, không lộ keys trong review/bank và không thêm analytics để lấp khoảng trống.

[Prompt đầy đủ 1159 whitespace words](archive-confirmation.prompt.md) chỉ định chính xác từng vùng/copy/control. [Ảnh chọn cuối](archive-confirmation-v1.png) là tham chiếu bố cục; [metadata/review](screens.json) ghi các sửa ảnh và findings. Primary prompt, generation suffix và correction prompt trong metadata quyết định provenance; không sửa lịch sử để giả prompt đã tạo ảnh hoàn hảo ngay từ đầu.

## Hành động và điều kiện

- Hủy/X giữ nguyên.
- Lưu trữ đề cần catalog.manage, đúng target và receipt.
- Pending chặn lặp; lỗi giữ context và local intent.

Pending phải giữ intent và khóa gửi lặp. Timeout/unknown không được suy là success hoặc definitive failure; giữ draft/context và đối chiếu kết quả an toàn. Lỗi validation giữ input và focus field thích hợp; permission revoke phải ẩn nội dung được bảo vệ. Các state này cần implementation và kiểm thử riêng, không in tất cả trong ảnh.

## Current so với target

Không xóa lượt/kết quả; không hứa unarchive. List overlay là target UX, không chứng minh list đã có action.

Bản raster không xác nhận font, contrast, focus trap, keyboard, API, responsive hoặc durability. Những lỗi icon/header/spacing nhỏ trong review phải chuẩn hóa khi port. Không thay API/backend để hợp control do ảnh tự vẽ.

## Nguồn

- [05b-admin-preflight-dialogs-desktop.md](../../../../../../docs/web-ui/stitch-page-prompts-v3/05b-admin-preflight-dialogs-desktop.md)
- [exam-editor-page.tsx](../../../../../../apps/web/src/features/admin/exam-editor-page.tsx)

## Task khi port — chưa triển khai

- [ ] Dựng một state đúng fixture, phân rõ dữ liệu đã lưu và edits local.
- [ ] Dùng shared Admin shell, tokens và controls; bỏ mọi control/copy ngoài contract.
- [ ] Nối actions đúng intent/quyền; cancel/X/Esc không mutation.
- [ ] Xử lý pending, network unknown, failure và receipt mà không báo success giả.
- [ ] Test behavior thay đổi và review browser desktop; mobile/state được nghiệm thu riêng.

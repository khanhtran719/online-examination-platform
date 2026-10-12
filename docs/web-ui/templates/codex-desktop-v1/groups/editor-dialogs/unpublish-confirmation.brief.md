# Gỡ phát hành đề — brief triển khai

ID local: CD-EP19-UNPUBLISH. Page family: EP-19. Route: /admin/exams. Actor: Admin có catalog.manage. State duy nhất: Unpublish confirmation. Đây là mô tả target hình ảnh/hành vi, không nghiệm thu runtime.

## Mục tiêu và dữ liệu

Gỡ phát hành TOEIC luyện01 đang published; ngừng start mới, giữ lượt đã bắt đầu và kết quả.

TOEIC Reading — Luyện tập 01; 75 phút, published, bản sửa 7; lịch 14/11/2026 08:00–12:00; nền vẫn published.

## Style và từng vùng

Bám [design contract](../../design-contract.md): canvas #F3F6FC, surface trắng, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540 và muted #58627A. Be Vietnam Pro cho tiếng Việt; JetBrains Mono chọn lọc cho mã/số. Nhịp 8px, card radius20–24px/padding24–32px; controls44px/radius12px. Header trắng68px, rail icon-only72px và paper/check vector chung. Đo các giá trị này trong CSS khi port, không suy từ raster.

Đọc breadcrumb/title/state trước, sau đó form hoặc table, cuối cùng action. Form/review gần2:1; table dùng full-width. Dialog dùng nền đúng fixture trước mutation, centered520–600px; conflict rộng780–840px. Backdrop neutral, close/cancel rõ. Không biến helper thành hero, không card lồng nhiều lớp, không lộ keys trong review/bank và không thêm analytics để lấp khoảng trống.

[Prompt đầy đủ 1158 whitespace words](unpublish-confirmation.prompt.md) chỉ định chính xác từng vùng/copy/control. [Ảnh chọn cuối](unpublish-confirmation-v2.png) là tham chiếu bố cục; [metadata/review](screens.json) ghi các sửa ảnh và findings. Primary prompt, generation suffix và correction prompt trong metadata quyết định provenance; không sửa lịch sử để giả prompt đã tạo ảnh hoàn hảo ngay từ đầu.

## Hành động và điều kiện

- Hủy/X không mutation.
- Gỡ phát hành chặn start mới sau receipt.
- Pending khóa lặp, unknown outcome phải reconcile trước báo trạng thái.

Pending phải giữ intent và khóa gửi lặp. Timeout/unknown không được suy là success hoặc definitive failure; giữ draft/context và đối chiếu kết quả an toàn. Lỗi validation giữ input và focus field thích hợp; permission revoke phải ẩn nội dung được bảo vệ. Các state này cần implementation và kiểm thử riêng, không in tất cả trong ảnh.

## Current so với target

Dialog là target presentation trên list; source list hiện chỉ có Sửa đề. Không tự thêm endpoint hay menu hành động. Lượt cũ/kết quả giữ; chỉ phát hành lại khi đủ điều kiện.

Bản raster không xác nhận font, contrast, focus trap, keyboard, API, responsive hoặc durability. Những lỗi icon/header/spacing nhỏ trong review phải chuẩn hóa khi port. Không thay API/backend để hợp control do ảnh tự vẽ.

## Nguồn

- [05b-admin-preflight-dialogs-desktop.md](../../../../../../docs/web-ui/stitch-page-prompts-v3/05b-admin-preflight-dialogs-desktop.md)
- [exam-list-page.tsx](../../../../../../apps/web/src/features/admin/exam-list-page.tsx)

## Task khi port — chưa triển khai

- [ ] Dựng một state đúng fixture, phân rõ dữ liệu đã lưu và edits local.
- [ ] Dùng shared Admin shell, tokens và controls; bỏ mọi control/copy ngoài contract.
- [ ] Nối actions đúng intent/quyền; cancel/X/Esc không mutation.
- [ ] Xử lý pending, network unknown, failure và receipt mà không báo success giả.
- [ ] Test behavior thay đổi và review browser desktop; mobile/state được nghiệm thu riêng.

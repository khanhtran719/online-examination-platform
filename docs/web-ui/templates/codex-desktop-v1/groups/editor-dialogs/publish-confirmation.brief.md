# Xác nhận lưu và phát hành — brief triển khai

ID local: CD-EP20-PUBLISH. Page family: EP-20. Route: /admin/exams/:examId/edit. Actor: Admin có catalog.manage. State duy nhất: Publish confirmation. Đây là mô tả target hình ảnh/hành vi, không nghiệm thu runtime.

## Mục tiêu và dữ liệu

Xác nhận trên preflight đã giữ; lưu edits trước phát hành, hủy giữ local draft, chỉ báo success sau receipts.

Nền preflight được giữ: bản sửa 4, edits chưa lưu; 90 phút/3 phần/6 câu/100 điểm; lịch 15/11/2026 08:00–12:00.

## Style và từng vùng

Bám [design contract](../../design-contract.md): canvas #F3F6FC, surface trắng, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540 và muted #58627A. Be Vietnam Pro cho tiếng Việt; JetBrains Mono chọn lọc cho mã/số. Nhịp 8px, card radius20–24px/padding24–32px; controls44px/radius12px. Header trắng68px, rail icon-only72px và paper/check vector chung. Đo các giá trị này trong CSS khi port, không suy từ raster.

Đọc breadcrumb/title/state trước, sau đó form hoặc table, cuối cùng action. Form/review gần2:1; table dùng full-width. Dialog dùng nền đúng fixture trước mutation, centered520–600px; conflict rộng780–840px. Backdrop neutral, close/cancel rõ. Không biến helper thành hero, không card lồng nhiều lớp, không lộ keys trong review/bank và không thêm analytics để lấp khoảng trống.

[Prompt đầy đủ 1163 whitespace words](publish-confirmation.prompt.md) chỉ định chính xác từng vùng/copy/control. [Ảnh chọn cuối](publish-confirmation-v1.png) là tham chiếu bố cục; [metadata/review](screens.json) ghi các sửa ảnh và findings. Primary prompt, generation suffix và correction prompt trong metadata quyết định provenance; không sửa lịch sử để giả prompt đã tạo ảnh hoàn hảo ngay từ đầu.

## Hành động và điều kiện

- Hủy/X/Esc trở về cùng local draft.
- Lưu và phát hành chạy save trước, publish sau.
- Pending chặn gửi lặp; save success/publish failure phải tách kết quả.

Pending phải giữ intent và khóa gửi lặp. Timeout/unknown không được suy là success hoặc definitive failure; giữ draft/context và đối chiếu kết quả an toàn. Lỗi validation giữ input và focus field thích hợp; permission revoke phải ẩn nội dung được bảo vệ. Các state này cần implementation và kiểm thử riêng, không in tất cả trong ảnh.

## Current so với target

Overlay là trước quyết định. Không tự thay background thành published; không gán version ID hoặc báo success khi chưa receipt.

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

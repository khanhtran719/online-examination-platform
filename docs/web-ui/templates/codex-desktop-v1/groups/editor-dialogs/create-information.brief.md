# Tạo đề — Thông tin — brief triển khai

ID local: CD-EP20-CREATE-INFO. Page family: EP-20. Route: /admin/exams/new. Actor: Admin có catalog.manage. State duy nhất: Create / Information. Đây là mô tả target hình ảnh/hành vi, không nghiệm thu runtime.

## Mục tiêu và dữ liệu

Tạo đề mới: nhập thông tin, lịch và chính sách; giữ local edits giữa các bước, chỉ lưu khi full draft hợp lệ.

Chưa có server ID hoặc bản sửa; 90 phút; 15/11/2026 08:00–12:00 UTC+7; tối đa 3 lượt; một phần/0 câu/0 điểm; lời giải NEVER, bảng xếp hạng tắt.

## Style và từng vùng

Bám [design contract](../../design-contract.md): canvas #F3F6FC, surface trắng, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540 và muted #58627A. Be Vietnam Pro cho tiếng Việt; JetBrains Mono chọn lọc cho mã/số. Nhịp 8px, card radius20–24px/padding24–32px; controls44px/radius12px. Header trắng68px, rail icon-only72px và paper/check vector chung. Đo các giá trị này trong CSS khi port, không suy từ raster.

Đọc breadcrumb/title/state trước, sau đó form hoặc table, cuối cùng action. Form/review gần2:1; table dùng full-width. Dialog dùng nền đúng fixture trước mutation, centered520–600px; conflict rộng780–840px. Backdrop neutral, close/cancel rõ. Không biến helper thành hero, không card lồng nhiều lớp, không lộ keys trong review/bank và không thêm analytics để lấp khoảng trống.

[Prompt đầy đủ 1160 whitespace words](create-information.prompt.md) chỉ định chính xác từng vùng/copy/control. [Ảnh chọn cuối](create-information-v1.png) là tham chiếu bố cục; [metadata/review](screens.json) ghi các sửa ảnh và findings. Primary prompt, generation suffix và correction prompt trong metadata quyết định provenance; không sửa lịch sử để giả prompt đã tạo ảnh hoàn hảo ngay từ đầu.

## Hành động và điều kiện

- Nhập tên, danh mục, phút, lịch và chính sách vào local draft.
- Tiếp tục chuyển bước, giữ nội dung đang nhập.
- Lưu nháp disabled khi toàn cấu trúc còn không hợp lệ.

Pending phải giữ intent và khóa gửi lặp. Timeout/unknown không được suy là success hoặc definitive failure; giữ draft/context và đối chiếu kết quả an toàn. Lỗi validation giữ input và focus field thích hợp; permission revoke phải ẩn nội dung được bảo vệ. Các state này cần implementation và kiểm thử riêng, không in tất cả trong ảnh.

## Current so với target

Đề mới chưa có receipt; không in revision đã lưu. Hiển thị phút là target UX và phải chuyển sang durationSeconds. Helper ngoài contract về leaderboard trong ảnh phải bỏ khi port.

Bản raster không xác nhận font, contrast, focus trap, keyboard, API, responsive hoặc durability. Những lỗi icon/header/spacing nhỏ trong review phải chuẩn hóa khi port. Không thay API/backend để hợp control do ảnh tự vẽ.

## Nguồn

- [exam-information.tsx](../../../../../../apps/web/src/features/admin/exam-information.tsx)
- [use-exam-draft.ts](../../../../../../apps/web/src/features/admin/use-exam-draft.ts)

## Task khi port — chưa triển khai

- [ ] Dựng một state đúng fixture, phân rõ dữ liệu đã lưu và edits local.
- [ ] Dùng shared Admin shell, tokens và controls; bỏ mọi control/copy ngoài contract.
- [ ] Nối actions đúng intent/quyền; cancel/X/Esc không mutation.
- [ ] Xử lý pending, network unknown, failure và receipt mà không báo success giả.
- [ ] Test behavior thay đổi và review browser desktop; mobile/state được nghiệm thu riêng.

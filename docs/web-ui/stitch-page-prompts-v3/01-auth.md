# Prompt 01 — Login, Register, Check email, Verify email

```text
Trong dự án “ExamPlatform UI Design”, ID 18257628123124303955, tạo nhóm Auth theo style V3 đã chọn. Giữ nguyên Home/Dashboard/Exam hiện có, không sửa lỗi cũ trong lượt này.

Mẫu thị giác: Dashboard desktop V2 ID 927f2e0d87ce4f89be5d55c3cb81606b; Home desktop V3 ID f5caae61539a43049ab56eea2b8b0c65; Home mobile V3 ID 4e8b878555d148259ff0df819ae125a2. Bám palette/layout geometry/typography của chúng, không tạo phong cách mới.

Canvas #F3F6FC; card trắng; Cobalt #315CF4 cho CTA; Apricot #FFB36B cho điểm nhấn nhỏ; tint #E8EEFF; ink #1B2540; muted #58627A. Be Vietnam Pro; JetBrains Mono chỉ cho mã/timer. Card radius 20–24px, nhịp spacing 8px, shadow mềm. Desktop 1280px, mobile 390px. Logo dùng ảnh tạm đính kèm; nếu chưa có ảnh, tạo mark vector phiếu thi trắng trên ô Cobalt bo góc, góc gấp Apricot. Không dùng logo remote dễ lỗi.

Đây là thiết kế prototype cho nền tảng thi trắc nghiệm. Dữ liệu mẫu chỉ để minh họa. Không code/API/deploy; không thêm page hoặc tính năng ngoài nhóm sau. Dùng tiếng Việt, labels rõ, không đặt hướng dẫn kỹ thuật của designer trong trang sản phẩm.

EP-04 — Đăng nhập /login
- Desktop split layout: form khoảng 440–480px bên phải, bên trái một khối giới thiệu nhẹ và illustration giấy/bút 2.5D cùng chất Home. Không thêm số người dùng/đánh giá giả.
- Logo, tiêu đề “Tiếp tục bài thi của bạn”, email, mật khẩu, nút hiện/ẩn, CTA “Đăng nhập”. Links “Tạo tài khoản”, “Gửi lại email xác thực”, “Về trang chủ”.
- Labels cố định; password manager/paste được phép; lỗi nằm sát field và có vùng thông báo chung.
- Mobile ưu tiên form, illustration nhỏ hoặc bỏ khỏi màn đầu, không ép hai cột.
- Variants: bình thường; đang đăng nhập vẫn thấy form; thông tin không hợp lệ với message chung; cần chờ thử lại; lỗi kết nối và retry.
- Không nút social login, magic link, “Ghi nhớ tôi” hoặc “Quên mật khẩu” có vẻ hoạt động khi chưa có luồng tương ứng.

EP-05 — Đăng ký /register
- Cùng family với Login nhưng illustration/eyebrow riêng, không nhân bản mọi text.
- Fields: tên hiển thị, email, mật khẩu, nhập lại mật khẩu; show/hide; helper mật khẩu ít nhất 15 ký tự, tối đa 128; không tự bắt buộc chữ hoa/ký hiệu.
- CTA “Tạo tài khoản”; link “Đã có tài khoản? Đăng nhập”. Checklist/helper gọn, không chiếm hơn form.
- Thiết kế validation: email không hợp lệ, tên quá dài, mật khẩu ngắn, xác nhận không khớp, submitting. Thành công dẫn tới trang kiểm tra email, không màn auto-login.
- Mobile fields một cột, input dễ chạm và text không quá nhỏ.

EP-06 — Kiểm tra email /check-email
- Card trung tâm trên nền sáng, illustration phong bì/phiếu thi 2.5D nhỏ. Title “Kiểm tra hộp thư của bạn”.
- Thông báo trung tính: “Nếu email đủ điều kiện, hệ thống sẽ gửi link xác thực. Kiểm tra cả thư rác.” Không khẳng định email đã giao thành công.
- Email field cho gửi lại; nút “Gửi lại link”; cooldown nhìn rõ nhưng nhẹ; links “Về đăng nhập” và “Dùng email khác”.
- Variants: có thể gửi lại, đang chờ 60 giây, đã nhận yêu cầu gửi lại, lỗi mạng. Cooldown không làm layout nhảy.

EP-07 — Xác thực email /verify-email
- Thiết kế bước đặt mật khẩu cuối cùng và nhập lại mật khẩu; helper ngắn, CTA “Hoàn tất xác thực”. Không hiển thị token hoặc thông tin kỹ thuật.
- Variants riêng: link hợp lệ/form; thiếu hoặc hết hạn link với email resend; đang xử lý; email đã xác thực với CTA đăng nhập; đang có phiên đăng nhập cần đăng xuất trước.
- Không tự đăng nhập sau xác thực; không tự đổi email hoặc mật khẩu của một phiên tài khoản khác.

Đầu ra: mỗi page 1 desktop + 1 mobile hoàn chỉnh, đặt tên “EP-04/05/06/07 — [tên] — V3 — Desktop/Mobile”. Critical state variants đặt frame riêng bên cạnh. Toàn bộ product frame có nội dung thật của màn; handoff không nằm dưới footer. Gửi tên/ID và số frame đã tạo, ghi rõ phần thiếu; không báo hoàn tất khi chỉ có skeleton hoặc canvas trống.
```

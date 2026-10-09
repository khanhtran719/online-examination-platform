# Template Auth V3 — đã chọn hướng thị giác

Ngày 2026-10-08, người dùng đồng ý giữ các mẫu Đăng nhập, Đăng ký, Kiểm tra email và Xác thực email, tiếp tục tạo những page khác trước khi làm lại UI bằng code. Phạm vi chốt là phong cách và bố cục tham khảo; các lỗi, nội dung và trạng thái chưa hoàn chỉnh được xử lý sau.

## Bộ ảnh gốc

| Page | Desktop | Mobile |
| --- | --- | --- |
| EP-04 — Đăng nhập | [Ảnh gốc](login-desktop-v3.png) | [Ảnh gốc](login-mobile-v3.png) |
| EP-05 — Đăng ký | [Ảnh gốc](register-desktop-v3.png) | [Ảnh gốc](register-mobile-v3.png) |
| EP-06 — Kiểm tra email | [Ảnh gốc](check-email-desktop-v3.png) | [Ảnh gốc](check-email-mobile-v3.png) |
| EP-07 — Xác thực email | [Ảnh gốc](verify-email-desktop-v3.png) | [Ảnh gốc](verify-email-mobile-v3.png) |

[Manifest](manifest.json) lưu screen ID, nguồn file, kích thước và SHA-256. Các ảnh được chuyển nguyên bytes từ bộ review, không lưu thêm bản trùng. [Bằng chứng review](../../evidence/stitch-auth-review-2026-10-08/README.md) tiếp tục tham chiếu những ảnh này.

## Khi dùng để code

- Giữ palette Cobalt–Apricot, card trắng bo mềm, typography rõ và chiều sâu giấy/bút 2.5D. Bám [tokens workspace](../dashboard-v2/tokens.json) và [logo tạm](../stitch-v3/brand/README.md).
- Dùng bố cục split cho Login/Register desktop và form một cột cho mobile. Check email/Verify dùng card tập trung vào nhiệm vụ.
- Xử lý [checklist lỗi Auth](implementation-notes.md) trước khi đóng phạm vi triển khai. Không copy các bảng mô phỏng trạng thái vào trang sản phẩm.
- Đối chiếu chức năng, copy, permission và state với product/API contract; các claim/tính năng tự thêm trong ảnh chưa được chấp thuận.
- Motion, bàn phím/focus, responsive thực và hành vi form chưa được kiểm chứng từ ảnh.

## Đợt thiết kế tiếp theo

[Prompt 02 — Danh sách đề, Chi tiết đề và Hồ sơ](../../stitch-page-prompts-v3/02-catalog-profile.md), tiếp tục trong dự án [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955). Giữ các page đã chọn; chưa bắt đầu port ứng dụng.

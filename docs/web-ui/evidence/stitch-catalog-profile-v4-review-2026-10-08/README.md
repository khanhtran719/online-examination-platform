# Bằng chứng Catalog/Profile V4 — 2026-10-08

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Nguồn: [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955). Sáu screenshot V4 mới được lấy qua kết nối chỉ đọc để [review lại EP-08–10](../../stitch-catalog-profile-v4-review-2026-10-08.md). Người dùng đã chọn sáu Normal làm [template thị giác](../../templates/catalog-profile-v4/README.md); các vấn đề và states còn thiếu vẫn mở. Không gửi lệnh generation/refinement.

| Page | Desktop | Mobile |
| --- | --- | --- |
| EP-08 — Danh sách đề | [PNG gốc](../../templates/catalog-profile-v4/exam-list-desktop-v4.png) — `801fc02aa8bd4586b0b1ee821d5fd009`, 2560×3338 | [PNG gốc](../../templates/catalog-profile-v4/exam-list-mobile-v4.png) — `a8f1d91a47684aae84dee5d66222eef3`, 780×5314 |
| EP-09 — Chi tiết đề | [PNG gốc](../../templates/catalog-profile-v4/exam-detail-desktop-v4.png) — `d709369eada140eca5083cb1e8b40865`, 2560×3958 | [PNG gốc](../../templates/catalog-profile-v4/exam-detail-mobile-v4.png) — `e01b2d07979b4378aeebb98c1d7005d2`, 780×3084 |
| EP-10 — Hồ sơ | [PNG gốc](../../templates/catalog-profile-v4/profile-desktop-v4.png) — `4d096315e9994045b67307d0530f5ea4`, 2560×2048 | [PNG gốc](../../templates/catalog-profile-v4/profile-mobile-v4.png) — `81b4051100354c12b2b15363cb77b0d6`, 780×2226 |

[Đã thu hồi — Manifest](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) ghi nguồn, kích thước, SHA-256 và vị trí ảnh đã chọn làm template. [Đã thu hồi — Inventory](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) giữ ID/tên/viewport/kích thước của 36 screen tại lần kiểm tra, không lưu credential hoặc download URLs. Các V3 vẫn có trong inventory.

[Đã thu hồi — Crop đầu list mobile](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — crop giữa](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — crop cuối](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) hỗ trợ đọc ảnh dài ở độ phân giải gốc. Đây là QA crops, không phải thiết kế mới; sáu ảnh gốc được chuyển nguyên bytes sang thư mục template, không lưu thêm bản trùng.

Các screen mới đều là Normal; chưa thấy frame riêng của nhóm B/C trong inventory. Review tĩnh không xác minh interactions, responsive, focus, contrast được đo hoặc motion.

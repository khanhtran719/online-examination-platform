# Bằng chứng review 03A — desktop

Nguồn [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955), ngày 2026-10-08. [Inventory](inventory.json) tại thời điểm lấy 03A có 51 entry, tăng bốn so với 02B; ba có ảnh xuất để review. Chỉ đọc, không gửi generation/refinement hoặc sửa source.

| Page/state | PNG gốc | Screen ID |
| --- | --- | --- |
| EP-11 — Processing | [PNG](../../templates/results-v4/submission-status-desktop-v4.png) | `e6bf4c9f5a5b4abcaa6973835a3721cd` |
| EP-12 — Completed | [PNG](../../templates/results-v4/result-desktop-v4.png) | `ada6f9265a0e4e41ba2c139fbdc927a1` |
| EP-13 — Released review | [PNG](../../templates/results-v4/released-review-desktop-v4.png) | `f8be22a0bbe840bb83fb3332770ab04e` |

Entry EP-11 khác cùng tên `5afee71803b8443cba85abd5cc77b667`, metadata 1280×1024, không có screenshot URL trong snapshot. Giữ ở `unavailableScreens` trong [manifest](manifest.json); chưa được review thị giác, không tự xóa hoặc đánh giá nó là bản kém hơn.

PNG gốc giữ nguyên bytes, manifest ghi dimensions/SHA-256/nguồn; không lưu credentials hoặc URL tải ảnh. Crop QA ở thư mục tạm, không thay ảnh gốc. Sau khi người dùng đồng ý giữ hướng 03A, ba PNG đã chuyển nguyên bytes sang templates/results-v4, không giữ bản ảnh trùng tại evidence. Findings vẫn mở; entry thiếu ảnh chưa được chọn.

[Báo cáo và findings 03A-01–07](../../stitch-03a-review-2026-10-08.md). Giới hạn: ảnh tĩnh; chưa kiểm chứng thao tác, responsive, accessibility, motion hoặc các tuyên bố kiến thức AWS trong nội dung mẫu.

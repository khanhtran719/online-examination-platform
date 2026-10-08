# Tạo các page còn lại trên Stitch — bám template V3

Dự án hiện hành: [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955), ID `18257628123124303955`. Phạm vi theo yêu cầu ngày 2026-10-08: chốt đủ UI trước, sau đó mới làm lại frontend. Các lỗi V3 đã ghi để xử lý lúc code; không cần chạy thêm lượt refinement cho ba page đầu.

## Cách gửi

1. Mở chat của đúng dự án trên, đính kèm [logo wordmark PNG](../templates/stitch-v3/brand/examplatform-wordmark.png) và [mark PNG](../templates/stitch-v3/brand/examplatform-mark.png) ở lượt đầu nếu muốn Stitch dùng đúng tài sản tạm.
2. Copy nguyên khối prompt trong từng file, gửi lần lượt từ 01 đến 09. Mỗi prompt có context đủ để gửi độc lập; không cần tự ghép brief cũ.
3. Kiểm tra các frame thực sự được tạo sau mỗi nhóm, rồi gửi nhóm kế. Không dựa riêng vào câu “đã hoàn thành” của chat Stitch.
4. Giữ các màn V2/V3 đã chọn. Không gửi các prompt trước đây của dự án `ExamPlatform UI/UX Redesign` vào dự án này.

## Thứ tự và coverage

| Prompt | Nhóm | Page hoặc biến thể chính |
| --- | --- | --- |
| [01 — Auth](01-auth.md) | Đăng nhập và xác thực | Login, Register, Check email, Verify email |
| [02 — Catalog & Profile](02-catalog-profile.md) | Chọn đề và tài khoản | Exam list, Exam detail/start, Profile |
| [03 — Results](03-results-history-ranking.md) | Sau khi thi | Submission status, Result, Released review, History, Leaderboard |
| [04 — Public](04-public-experience-help.md) | Trải nghiệm và hướng dẫn | Ba câu mẫu độc lập, How it works, Help |
| [05 — Admin Exams](05-admin-exams.md) | Quản lý đề | Exam list; editor tạo/sửa với 3 bước và dialogs xuất bản |
| [06 — Questions & Import](06-admin-questions-import.md) | Ngân hàng câu hỏi | Question list/editor, Import preview/dry-run, Import report |
| [07 — Admin Operations](07-admin-overview-monitor-submissions.md) | Vận hành kỳ thi | Overview, Monitor index, Exam monitor, Submissions |
| [08 — Admin Reports](08-admin-attempt-statistics-metrics-audit.md) | Báo cáo | Attempt detail/replay, Statistics, Metrics, Audit |
| [09 — Shared States](09-shared-states-handoff.md) | Hoàn tất bộ màn | 404; 403/unavailable/reauth/error/loading; dialogs và handoff |

29 page families còn lại + 404 được đặc tả; cộng Home/Dashboard/Exam đã có là **33 page families**. Router có 39 pattern path: ngoài các page còn có route tạo/sửa cùng editor, 3 alias/redirect và `/dev/ui` chỉ dành phát triển. [Route registry](page-registry.json) liệt kê mapping từng path, gồm cả alias; không bỏ sót route sản phẩm vì chỉ đếm tên page. Registry là coverage của prompt, **không phải xác nhận Stitch đã tạo xong**.

## Chuẩn thiết kế

[Template hiện hành](../templates/stitch-v3/README.md): Dashboard desktop V2, 5 màn V3 và sheet. Cobalt–Apricot, bề mặt trắng, rail viên nang, Be Vietnam Pro, JetBrains Mono chọn lọc. Desktop 1280px, mobile 390px; form/table/editor có bố cục riêng cho mobile.

Logo tạm và style được chốt cho giai đoạn design. Nội dung trong mockup không quyết định capabilities/API. Các prompt dùng chức năng đã có trong spec/router, không thêm thanh toán, webcam, AI tutor, mạng xã hội, reset password hoặc API giả.

## Trước khi bắt đầu làm lại UI bằng code

- Đủ page/luồng trong registry, bản desktop/mobile và các dialog thiết yếu hiện thành frame thật.
- Duyệt sự nhất quán giữa các nhóm, navigation, fields, states và các trang quản trị dày dữ liệu.
- Đối chiếu nội dung/tính năng với product/API/state contract; xử lý những phần Stitch tự thêm trong các mẫu cũ.
- Lấy bản xuất và screenshot mới làm baseline, rồi lập kế hoạch port. [Các lỗi đã hoãn](../templates/stitch-v3/implementation-notes.md) được xử lý khi triển khai; không được đánh dấu xong chỉ vì đã lưu template.

Lần này đã chuẩn bị prompt; chưa gửi chúng lên Stitch và chưa sửa ứng dụng.

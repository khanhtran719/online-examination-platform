# Tạo các page còn lại trên Stitch — bám template V3

Dự án hiện hành: [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955), ID `18257628123124303955`. Phạm vi theo yêu cầu ngày 2026-10-08: chốt đủ UI trước, sau đó mới làm lại frontend. Các lỗi V3 đã ghi để xử lý lúc code; không cần chạy thêm lượt refinement cho ba page đầu.

## Cách gửi

1. Mở chat của đúng dự án trên, đính kèm [logo wordmark PNG](../templates/stitch-v3/brand/examplatform-wordmark.png) và [mark PNG](../templates/stitch-v3/brand/examplatform-mark.png) ở lượt đầu nếu muốn Stitch dùng đúng tài sản tạm.
2. Copy duy nhất khối `text` của nhóm đang làm; không paste cả tài liệu chứa nhiều nhóm. **[05A — Ba frame Admin desktop](05a-admin-exams-desktop.md) đã tạo và [đã review](../stitch-05a-review-2026-10-08.md), không gửi lại để tạo trùng.** Đề xuất nhóm kế là 05B Kiểm tra/phát hành và dialog desktop sau khi chọn hướng 05A; prompt 05B chưa chuẩn bị. [Brief 05](05-admin-exams.md) là backlog đầy đủ, không gửi nguyên khối desktop/mobile/states. Không gửi lại 03A/03B/04A.
3. Kiểm tra các frame thực sự được tạo sau mỗi nhóm, rồi gửi nhóm kế. Không dựa riêng vào câu “đã hoàn thành” của chat Stitch.
4. Giữ các màn V2/V3/V4 đã chọn. Không gửi các prompt trước đây của dự án `ExamPlatform UI/UX Redesign` vào dự án này.

## Thứ tự và coverage

Ngày 2026-10-08: Home/Dashboard/Exam, [Auth V3](../templates/auth-v3/README.md), [Catalog/Profile V4](../templates/catalog-profile-v4/README.md), [Results V4](../templates/results-v4/README.md) và [Public V4](../templates/public-v4/README.md) là **16 page families có template thị giác**. Catalog/Profile có 17 ảnh, Results ba desktop states, Public ba desktop states 04A. Ảnh giữ nguyên bytes và findings vẫn mở để sửa khi code. **[03B desktop](../stitch-03b-review-2026-10-08.md) và [05A desktop](../stitch-05a-review-2026-10-08.md) có bốn page families đã review chờ chọn**, ảnh ở evidence; EP-20 mới có hai bước Edit. 13 page families còn ở prompt_prepared/coverage chưa được kiểm chứng; không suy ra chúng chắc chắn chưa được tạo bên ngoài. Chi tiết đề/Hồ sơ mobile, 21 desktop states 02B và sample variants/mobile 04 vẫn backlog. **Ưu tiên đủ desktop trước; tiếp tục nhóm Admin quản lý đề.** Assistant chưa tạo/chỉnh Stitch hoặc bắt đầu port trong các lượt review/lưu mẫu.

Phần tạo Normal trong [prompt refinement EP-08–10](02-catalog-profile-refinement.md), [02A — Bốn dialog](02a-catalog-profile-dialogs.md) và nhóm 1 EP-08 mobile trong [02B — States theo nhóm nhỏ](02b-catalog-profile-states.md) đã có kết quả, không gửi lại để tạo trùng. Assistant chỉ đọc/review; các nhóm states chưa tạo vẫn có prompt cục bộ. Giữ các Normal/dialog hiện có và kiểm tra frame thực sự tạo sau mỗi nhóm.

Thứ tự mới: 03A/03B, Public 04A và [05A Admin desktop](05a-admin-exams-desktop.md) đã review → phần Kiểm tra/phát hành và các nhóm Admin desktop còn lại → shared pages desktop; sau đó mobile và states còn thiếu. 05A có đúng ba frame Danh sách đề/hai bước Edit đã kiểm chứng, chưa chọn template Admin; không hoàn tất bước 3/Create/mobile. [04A](04a-public-desktop.md) có ba frame chính đã lưu; variants của sample và mobile/states ở brief 04. Phần còn lại của brief 05 và các brief 06–09 cần tách lượt nhỏ khi đến lượt. Các khối 02B còn thiếu và [brief 03 đầy đủ](03-results-history-ranking.md) tiếp tục backlog.

| Prompt | Nhóm | Page hoặc biến thể chính |
| --- | --- | --- |
| [01 — Auth](01-auth.md) | Đăng nhập và xác thực | Login, Register, Check email, Verify email |
| [02 — Catalog & Profile](02-catalog-profile.md) | Chọn đề và tài khoản | Exam list, Exam detail/start, Profile |
| [02A — Dialogs](02a-catalog-profile-dialogs.md) | Bổ sung cho V4 | Start confirmation và Profile conflict desktop/mobile; giữ sáu Normal |
| [02B — States](02b-catalog-profile-states.md) | Backlog bổ sung | 7 list mobile states đã chọn; detail/profile mobile và desktop còn thiếu, làm sau các page desktop |
| [03A — Results desktop](03a-results-desktop.md) | Đã chọn template | Trạng thái/Kết quả/Xem lại; 3 PNG đã chọn, 1 entry Processing thiếu ảnh chưa chọn |
| [03B — History/Ranking desktop](03b-history-ranking-desktop.md) | Đã review, chưa chọn template | Hai desktop Loaded, findings về cột Lịch sử, badge và shell còn mở |
| [03 — Brief đầy đủ](03-results-history-ranking.md) | Backlog mobile/states | Yêu cầu đầy đủ của 5 page sau khi thi; không gửi nguyên khối hiện tại |
| [04A — Public desktop](04a-public-desktop.md) | Đã review/lưu template | Ba page chính: Trải nghiệm mẫu, Cách hoạt động, Trợ giúp; findings còn mở |
| [04 — Public đầy đủ](04-public-experience-help.md) | Backlog variants/mobile/states | Các dạng câu, rà soát/kết quả mẫu và mobile của ba page |
| [05A — Admin Exams desktop](05a-admin-exams-desktop.md) | Đã review, chưa chọn template | Danh sách đề Loaded; cùng editor Edit ở bước Thông tin và Phần & câu hỏi; đúng 3 frame 1280px, findings mở |
| [05 — Admin Exams đầy đủ](05-admin-exams.md) | Backlog bước 3/dialogs/Create/mobile/states | Brief toàn nhóm; không gửi nguyên khối hiện tại |
| [06 — Questions & Import](06-admin-questions-import.md) | Ngân hàng câu hỏi | Question list/editor, Import preview/dry-run, Import report |
| [07 — Admin Operations](07-admin-overview-monitor-submissions.md) | Vận hành kỳ thi | Overview, Monitor index, Exam monitor, Submissions |
| [08 — Admin Reports](08-admin-attempt-statistics-metrics-audit.md) | Báo cáo | Attempt detail/replay, Statistics, Metrics, Audit |
| [09 — Shared States](09-shared-states-handoff.md) | Hoàn tất bộ màn | 404; 403/unavailable/reauth/error/loading; dialogs và handoff |

Danh mục có **33 page families**: 16 đã có template thị giác, 4 đã review chờ chọn và 13 còn ở prompt_prepared/coverage chưa được kiểm chứng. Những page có template Normal hoặc review desktop vẫn có mobile/dialogs/states chưa hoàn thiện; số lượng này không có nghĩa luồng đã đủ. Bộ prompt 01–09 đặc tả 30 page families ngoài Home/Dashboard/Exam ban đầu, gồm cả 404; 02A/02B và các brief tách desktop bổ sung coverage, không tăng page-family count. Router có 39 pattern path: ngoài các page còn có route tạo/sửa cùng editor, 3 alias/redirect và `/dev/ui` chỉ dành phát triển. [Route registry](page-registry.json) liệt kê mapping từng path và trạng thái lưu mẫu. Coverage của prompt **không phải xác nhận Stitch đã tạo xong toàn bộ**.

## Chuẩn thiết kế

[Template hiện hành](../templates/stitch-v3/README.md): Dashboard desktop V2, Home/Exam/mobile V3, [Auth V3](../templates/auth-v3/README.md), [Catalog/Profile V4](../templates/catalog-profile-v4/README.md), [Results V4](../templates/results-v4/README.md) và [Public V4](../templates/public-v4/README.md). Cobalt–Apricot, bề mặt trắng, Be Vietnam Pro, JetBrains Mono chọn lọc. Candidate shell chuẩn theo Dashboard V2/mobile V3; sidebar rộng V4 được ghi để thống nhất khi code. Desktop 1280px, mobile 390px; form/table/editor có bố cục riêng cho mobile.

Logo tạm và style được chốt cho giai đoạn design. Nội dung trong mockup không quyết định capabilities/API. Các prompt dùng chức năng đã có trong spec/router, không thêm thanh toán, webcam, AI tutor, mạng xã hội, reset password hoặc API giả.

## Trước khi bắt đầu làm lại UI bằng code

- Đủ page/luồng trong registry, bản desktop/mobile và các dialog thiết yếu hiện thành frame thật.
- Duyệt sự nhất quán giữa các nhóm, navigation, fields, states và các trang quản trị dày dữ liệu.
- Đối chiếu nội dung/tính năng với product/API/state contract; xử lý những phần Stitch tự thêm trong các mẫu cũ.
- Lấy bản xuất và screenshot mới làm baseline, rồi lập kế hoạch port. [Các lỗi đã hoãn](../templates/stitch-v3/implementation-notes.md) được xử lý khi triển khai; không được đánh dấu xong chỉ vì đã lưu template.

Các prompt được chuẩn bị cục bộ; người dùng đã tạo nhóm Auth và Catalog/Profile trên Stitch, assistant chỉ đọc và review. Chưa sửa ứng dụng trong phạm vi lưu template/review này.

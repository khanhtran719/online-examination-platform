# Review Stitch — ExamPlatform UI/UX Redesign

Ngày: 2026-10-08. Dự án: [ExamPlatform UI/UX Redesign](https://stitch.withgoogle.com/projects/11777231516922865355). Project ID: `11777231516922865355`.

**Cập nhật sau generation:** inventory mới nhất có **25 mẫu desktop + một prototype** (26 resources): Public 4, Identity 4, Candidate 10, Admin nội dung 7. Còn bảy mẫu Admin giám sát/báo cáo AD-07A/07B/08/09/10/11/12; mobile/states chưa xác nhận đủ. [Inventory IDs](evidence/stitch-port-2026-10-08/stitch-inventory.json), [prompt đúng phần còn thiếu](stitch-next-pages-prompts-2026-10-08.md). Các bảng 3/32 và 29 thiếu bên dưới ghi snapshot **trước khi bổ sung**, không phải số hiện tại. Người dùng yêu cầu chốt UI trên Stitch trước khi sửa code tiếp; mẫu mới có resource chưa đồng nghĩa đã được duyệt.

## Phạm vi và quyết định người dùng

Đọc thiết kế Stitch qua MCP và phiên Chrome đã đăng nhập; đối chiếu với `design-spec.md`, `api-and-state-contract.md`, `ui-gap.md`, router và API frontend hiện tại. Người dùng đã chọn **UI hiện tại của Stitch làm chuẩn thị giác** và yêu cầu nối chức năng đang có, bổ sung các màn hình thiếu, làm chiều sâu 2D/3D rõ hơn. Không thay bằng một hướng thiết kế khác.

Đây là review độ phủ thiết kế. Chưa nghiệm thu hoạt động của backend hoặc tính đúng đắn của prototype Stitch. Hình chụp, nút có nhãn và liên kết trong prototype không chứng minh một API đã được triển khai.

## Kết quả danh mục

MCP `list_screens` trả 4 resources. Canvas Chrome xác nhận **3 trang được thiết kế**, một design system và một prototype. Các resources:

| Tên Stitch                               | Screen ID                          | Đối chiếu              | Nhận xét                                                                                                                                                  |
| ---------------------------------------- | ---------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trang chủ - ExamPlatform                 | `43fe592b5ebe411aacc87c1f5aadb71b` | `/`                    | Có hero, mẫu 3 câu nhúng, tính năng, danh mục, FAQ và CTA. Nội dung cần sửa theo contract; chưa có mẫu riêng cho `/experience`, `/how-it-works`, `/help`. |
| Bảng làm việc Thí sinh                   | `0e91fe7b89774fcfb0d9469494281dc6` | `/dashboard`           | Có lượt đang làm, lịch sử gần đây và danh mục đề. Chỉ số và một số actions vượt capability hiện tại.                                                      |
| Phòng thi - Exam Room                    | `268f0679a2154b91828af861b8b6bfec` | `/attempts/:attemptId` | Có câu nhiều lựa chọn, bảng phiếu câu hỏi, thời gian và controls. Cần bổ sung đầy đủ trạng thái lưu/conflict/reauth/deadline và hai loại câu còn lại.     |
| Online Standardized Examination Platform | `fd2f5de221e147ec83b5f6906b1ddbdb` | Prototype              | Canvas ghi rõ “Prototype”, không tính như một trang chức năng thứ tư.                                                                                     |

Design system: `assets/fc11c9370fdb41e5b12e4b4ed727d8b3`, tên “Vào Nhịp Thi”. Cả 4 resources được MCP đánh dấu DESKTOP. Không tìm thấy resource MOBILE/TABLET trong snapshot này. Điều này không chứng minh HTML không responsive; mobile chưa có mẫu/evidence riêng.

Web hiện có 32 loại trang chính: Public 4, Identity 4, Candidate 10 và Admin 14. Không đếm lại create/edit dùng cùng editor, aliases, redirects, route `/dev/ui`, dialog và error components.

| Nhóm      | Tổng mẫu cần | Đã có trang riêng | Cần bổ sung |
| --------- | -----------: | ----------------: | ----------: |
| Public    |            4 |                 1 |           3 |
| Identity  |            4 |                 0 |           4 |
| Candidate |           10 |                 2 |           8 |
| Admin     |           14 |                 0 |          14 |
| **Tổng**  |       **32** |             **3** |      **29** |

Mẫu ba câu nhúng trên Home là một phần có thể tái sử dụng khi dựng `/experience`, nhưng chưa đủ màn hình riêng và trạng thái kết thúc theo route hiện tại.

## Các mẫu cần bổ sung

| ID     | Mẫu                              | Browser route                                               |
| ------ | -------------------------------- | ----------------------------------------------------------- |
| PU-02  | Trải nghiệm 3 câu + kết quả mẫu  | `/experience`                                               |
| PU-03  | Hướng dẫn bắt đầu và làm bài     | `/how-it-works`                                             |
| PU-04  | Trợ giúp/FAQ                     | `/help`                                                     |
| AU-01  | Đăng nhập                        | `/login`                                                    |
| AU-02  | Đăng ký                          | `/register`                                                 |
| AU-03  | Kiểm tra email/gửi lại           | `/check-email`                                              |
| AU-04  | Xác thực email/đặt mật khẩu cuối | `/verify-email`                                             |
| CA-02  | Danh sách đề                     | `/exams`                                                    |
| CA-03  | Chi tiết đề + xác nhận bắt đầu   | `/exams/:examId`                                            |
| CA-05  | Trạng thái nộp/chấm bài          | `/attempts/:attemptId/status`                               |
| CA-06  | Kết quả                          | `/attempts/:attemptId/result`                               |
| CA-07  | Xem bài/đáp án được mở           | `/attempts/:attemptId/review`                               |
| CA-08  | Lịch sử thi                      | `/history`                                                  |
| CA-09  | Xếp hạng theo phiên bản          | `/exams/:examId/versions/:versionId/leaderboard`            |
| CA-10  | Hồ sơ/opt-in xếp hạng            | `/profile`                                                  |
| AD-01  | Tổng quan quản trị               | `/admin`                                                    |
| AD-02  | Danh sách/quản lý đề             | `/admin/exams`                                              |
| AD-03  | Editor đề dùng cho tạo/sửa       | `/admin/exams/new`, `/admin/exams/:examId/edit`             |
| AD-04  | Ngân hàng câu hỏi                | `/admin/questions`                                          |
| AD-05  | Editor câu hỏi dùng cho tạo/sửa  | `/admin/questions/new`, `/admin/questions/:questionId/edit` |
| AD-06A | Nhập JSON/dry-run                | `/admin/imports/new`                                        |
| AD-06B | Báo cáo import                   | `/admin/imports/:importId`                                  |
| AD-07A | Chọn đề để theo dõi              | `/admin/monitor`                                            |
| AD-07B | Lượt thi đang làm theo đề        | `/admin/exams/:examId/monitor`                              |
| AD-08  | Danh sách bài nộp                | `/admin/exams/:examId/submissions`                          |
| AD-09  | Chi tiết bài nộp/review/replay   | `/admin/attempts/:attemptId`                                |
| AD-10  | Thống kê câu hỏi theo version    | `/admin/exams/:examId/versions/:versionId/statistics`       |
| AD-11  | Metrics                          | `/admin/metrics`                                            |
| AD-12  | Nhật ký audit                    | `/admin/audit`                                              |

AD-06A/B và AD-07A/B là nhãn bàn giao phân biệt hai page exports; không đổi permission, API hay ID chính trong spec gốc.

## Nội dung cần chỉnh trong ba mẫu hiện có

| Quan sát trực tiếp trên Stitch                                                 | Điều chỉnh khi nối chức năng                                                                                                                                        |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home có “0.05s”, “60 FPS”, “100% tự động sao lưu đệm”                          | Dùng lợi ích và trạng thái thao tác; bỏ số liệu hiệu năng/bảo đảm chưa đo.                                                                                          |
| FAQ hứa không mất đáp án nhờ Local Storage/Dual-Cache                          | Nêu đáp án đã nhận xác nhận mới được lưu; phần chưa xác nhận chỉ ở bộ nhớ và có thể mất khi tải lại. Không thêm offline storage vào engine.                         |
| Dashboard nói bài thi “tạm dừng” và có “Hủy lượt này”                          | Dùng “Lượt đang làm”; thời gian vẫn chạy. Giữ “Tiếp tục làm bài”; không thêm hủy/refund quota khi chưa có contract.                                                 |
| Dashboard có thời gian trung bình/câu, tỷ lệ hoàn thành/năng lực, “vượt chuẩn” | Không suy ra từ trang history đầu. Thay cùng vị trí thị giác bằng hướng dẫn, thông tin được cung cấp hoặc unavailable.                                              |
| TOEIC hiển thị `7.5 /9.0 band`                                                 | Hiển thị earned/possible và “Điểm bài trắc nghiệm”; không quy đổi band/TOEIC chính thức.                                                                            |
| Camera & AI giám sát, mã phòng/giám thị/OMR chống gian lận                     | Giữ motif phiếu OMR; không biến thành capability webcam, chấm phiếu quang học, heartbeat hoặc hệ giám thị.                                                          |
| Candidate/Exam có menu quản trị và vai trò “Thí sinh / Giám thị”               | Giữ kiểu rail/nav; item và actions dựa vào nguồn quyền hợp lệ. Phòng thi có điều hướng tập trung riêng. Live Admin giữ unavailable khi chưa có quyền authoritative. |
| Home giới thiệu listening, LaTeX, True/False/Not Given                         | V1 renderer hiện dùng plaintext và ba loại single/multiple/true-false. Không thêm media/LaTeX/loại câu mới trong đợt UI.                                            |
| Phòng thi có độ khó/level và trọng số `2.0`                                    | Chỉ render fields thuộc Candidate projection. Điểm theo contract là số nguyên. Không tự tạo dữ liệu difficulty.                                                     |
| Footer tự nhận “WCAG AA+”, “SSL 256-bit”                                       | Bỏ chứng nhận/tuyên bố chưa có evidence; vẫn thiết kế theo tiêu chí trợ năng trong spec.                                                                            |
| Prototype links nhiều `href="#"`                                               | Khi port, nối router và handlers đang có; anchor chỉ dành cho section cùng trang.                                                                                   |

Đây là sửa copy/control/data binding cho đúng hệ thống, không phải thay art direction. Các chi tiết trong design system cũng nhắc cảnh báo gian lận và nhấp nháy timer; khi triển khai tuân hợp đồng phòng thi tĩnh, không thêm proctoring và không gây nhấp nháy.

## Trạng thái và responsive còn cần bàn giao

- Auth: invalid/loading, generic 401/202, cooldown/rate limit, network error, verification invalid/success/đang có phiên.
- Exam: ba loại câu, pending/saving/saved/retry/offline/unconfirmed; 409 đối chiếu; reauth giữ draft và thời gian; missing metadata/loaded scope; dialog rời/nộp; mất ACK; hết giờ còn thay đổi chưa xác nhận.
- Results: processing, failed, replay pending, expired có điểm, review denied/allowed, score null, history/ranking empty/disabled.
- Admin: permission subsets, live unavailable, draft validation/revision conflict, publish/unpublish/archive/type-conversion dialogs, dry-run valid chưa committed, import atomic error, replay accepted chưa complete, reporting unavailable.
- Handoff mobile: Home, dashboard, exam room và ba mẫu đại diện auth/detail/Admin; 320/390/768/1024/1440 và zoom 200%. Bảng cuộn trong vùng có nhãn; phiếu câu hỏi mobile dạng sheet; controls không bị sticky che.

## Hướng thực hiện đã chốt

1. Giữ ba mẫu gốc làm visual references; ghi prompt bổ sung vào [bộ prompt](stitch-completion-prompts-2026-10-08.md).
2. Bổ sung thiết kế trong cùng project/design system theo nhóm nhỏ, kiểm tra output thực tế và gắn từng mẫu với route. Không đánh dấu đủ chỉ vì đã gửi prompt.
3. Port presentation của Home/dashboard/exam theo Stitch, dùng controllers/coordinator/permissions hiện có. Không sao chép timer/scoring/auth demo của Stitch vào logic thật.
4. Làm chiều sâu giấy/bút/đồng hồ rõ hơn bằng lớp, phối cảnh, ánh sáng và bóng; ambient motion chỉ ở khu giới thiệu. Nếu cần WebGL thật, tách prototype/đo trước khi thêm runtime.
5. Nối các trang mới khi đã có output thiết kế và chạy validation thích hợp. Acceptance FE/live/backend giữ các ledger hiện tại.

Không cần xác nhận lại lựa chọn UI Stitch. Mua gói/quota trả phí, đổi nghiệp vụ/permission, thêm proctoring/media/offline durability hoặc triển khai production sẽ cần phạm vi riêng.

## Evidence và giới hạn

- MCP initialize/tools/list/list_projects/get_project/list_screens/get_screen/list_design_systems trả thành công; matched title và ID, đọc metadata cả 4 resources.
- Chrome cùng URL dự án hiển thị ba iframes trang, design system và prototype; đọc UI copy, controls, links và source attributes đang hiển thị. Không dùng credentials của trình duyệt làm dữ liệu xuất.
- Link HTML từ MCP mở bằng HTTP không đăng nhập chuyển đến Google Sign In; những response đó không được dùng như source UI. Việc đối chiếu nội dung thực tế dùng phiên Chrome đã đăng nhập.
- Review chưa là kiểm tra browser chức năng của web sau khi port. Không có thay đổi backend/migration/event hoặc acceptance trong tài liệu này.

Nguồn trong repo: [design spec](design-spec.md), [API/state](api-and-state-contract.md), [UI gaps](ui-gap.md), [router](../../apps/web/src/app/router.tsx), [PlatformApi](../../apps/web/src/shared/api/platform.ts), [permissions](../security-and-permissions.md), [product](../product-specification.md).

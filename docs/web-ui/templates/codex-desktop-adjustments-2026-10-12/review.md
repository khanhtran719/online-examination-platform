# Review ba ảnh điều chỉnh desktop — 2026-10-12

**Cập nhật sau review:** người dùng đã tạm chốt cả ba bản điều chỉnh làm main visual reference desktop Loaded, cho phép chỉnh thêm sau. [Quyết định](selection.md) và [validation lựa chọn](selection-validation.json) là trạng thái hiện hành; các đoạn chờ chọn và counts30/3/0 bên dưới giữ snapshot trước lựa chọn. Findings và các gate runtime/mobile/port vẫn mở.

**Hoàn tất deliverable hình ảnh:** ba PNG, ba brief, ba primary prompt 1.299/1.322/1.351 whitespace words, exact requests và provenance. Root đã đọc toàn bộ prompt trước generation, xem ba ảnh gốc/style và trực tiếp từng ảnh cuối. [Gallery trước/sau](gallery.html), [manifest](manifest.json), [validation](validation.json). Đây là đề xuất đã review, đang chờ người dùng chọn; ảnh không chứng minh application port, tương tác, mobile hoặc production acceptance.

## Kết quả từng màn

| Màn | Điều chỉnh thấy được | Đối chiếu nội dung |
| --- | --- | --- |
| [EP-14 History](history/history-adjusted-desktop-v1.png) | Sidebar rộng đổi thành rail gọn; title column thoáng; tên AWS 5→2 dòng, tên dài cuối 9→3; nhãn cột dễ đọc | Đủ sáu lượt giữ thứ tự, dates/codes/version fixtures; điểm 772/null/null/640/null/810 trên thang1000 khi có điểm. Null là Chưa có điểm; completed nộp hết giờ vẫn Xem kết quả, FAILED chỉ Xem trạng thái |
| [EP-15 Leaderboard](leaderboard/leaderboard-adjusted-v1.png) | Rail/logo/header cùng family; bảng bốn cột gọn; hạng1 Cobalt nổi hơn hạng3 Apricot | Đủ10 bí danh, điểm985/960/945/920/895/880/855/840/815/790, đúng thời điểm15/11/2024 GMT+7. Không danh tính/row Bạn; notice opt-in và scope một phiên bản giữ nguyên |
| [EP-19 Admin list](admin-exams/admin-exams-adjusted-v1.png) | Sửa đề/Bản sửa N một dòng; giảm whitespace; logo phiếu thi/check; bỏ V4 và IDs placeholder lệch editor | Đủ sáu đề, category/duration/lịch UTC+7 và revisions7/4/2/6/5/8; bản nháp từng phát hành khác đang phát hành; scope filter đã tải/count6 nguyên vẹn |

Các claim Assessment Suite/Sẵn sàng/Dữ liệu xác thực/24-7 đã bỏ. Không tạo KPI, total toàn hệ thống, page numbers, proctoring hoặc capability mới để lấp chỗ. Names/version labels/mã lượt là fixtures thị giác cũ, không tuyên bố APIs trả semantic version/title. Khi code dùng metadata hợp lệ cho frozen version hoặc fallback, không ghép publication hiện hành/N+1.

## Findings khi port

- [ ] **ADJ-P01 — Shared shell:** dùng một vector phiếu thi/check và bộ icons chung; Leaderboard đang dùng dấu hỏi cho Lịch sử. Header Candidate hiện có persona ở History nhưng generic account ở Leaderboard; thống nhất theo session thật khi code.
- [ ] **ADJ-P02 — History geometry:** badge completed/failed vẫn hai dòng có chủ ý; cột tên khoảng35–39% theo quan sát, chưa đúng gợi ý40–45%. Bố cục đã đọc được; xác minh widths/gutters/font trong browser ở1280px, không lấy pixel raster làm CSS.
- [ ] **ADJ-P03 — Admin status:** revision một dòng nhưng đặt cạnh publication metadata thay vì dòng dưới; khi code stack riêng cho ổn định. Hàng archived giữ link sửa theo source/ảnh cũ, không có nghĩa save archived được phép; gate mutation/read-only theo contract.
- [ ] **ADJ-P04 — Runtime/metadata:** local Admin search/filter là yêu cầu thiết kế, chưa có trong component hiện tại. Cursor/refresh/ownership/permission revoke, nullable scores, opt-in, confirm/unknown outcomes/focus/contrast/mobile cần task port và validation riêng.

Không còn lỗi trọng yếu về fixture, điểm, lifecycle/quyền hoặc ý nghĩa privacy trong review raster. Findings nhỏ không được đánh dấu đã sửa trong application. Không claim exact font/hex/contrast từ ảnh.

## Bằng chứng và giới hạn

Ba calls thành công có PNG, mỗi màn một call, không corrections. Requests và prompts nguyên văn đã lưu; nguồn generated image copy byte-identical vào workspace; input/output dimensions và SHA-256 trong metadata. Không suy ra chi phí hoặc hiệu suất từ số calls. Hai agent kết thúc turn do usage limit sau khi đã ghi đủ artifact; root tiếp nhận review/integration/validation, không chạy lại generation để tạo trùng.

Original PNGs/template cũ được giữ; kiểm protected baseline bao gồm source/rules/tooling/dependencies/roadmap/old template files. Chỉ sửa nhãn EP-14 History/EP-15 Leaderboard bị đảo trong checklist review trước, trước thời điểm chụp baseline. Không source/API/schema/migration/AWS/roadmap/deploy change. Repository quality/contracts và diff checks được ghi ở validation; không chạy unit/integration/load tests cho task artifact-only.

Registry giữ30 retained/3 reviewed-awaiting-main-selection/0 prompt-only; thêm ba adjusted proposals với acceptedAsVisualReference=false, không chuyển false thành true chỉ vì tạo xong ảnh. Bộ35 reference đã giữ không bị thay thế. Mobile và phần states rộng hơn vẫn mở.

# Operations — Visual review EP-25–28

Ngày 2026-10-12. Root đã review nguồn/prompt/fixture và gửi go-ahead nội bộ trước generation. Đã tạo **4/4 PNG** bằng công cụ imagegen tích hợp, một call cho mỗi màn, không edit/retry/API/CLI/Stitch. Bốn ảnh đã được nhìn trực tiếp ngay khi công cụ trả về, đối chiếu copy, data, layout và phạm vi. Kết quả: giữ cả bốn làm template desktop, **0 lỗi dữ liệu/capability nghiêm trọng**, có findings nhỏ khi port. Đây là group self-review; root có thể ghi review tổng riêng.

## Artifact và kiểm tra

| ID | PNG | Kích thước raster thật | Findings | Prompt words |
| --- | --- | --- | --- | ---: |
| EP-25 | [Tổng quan](images/ep-25-admin-overview-v1.png) | 1448×1086 | Minor layout/logo | 1395 |
| EP-26 | [Chọn đề](images/ep-26-monitor-index-v1.png) | 1448×1086 | Minor rail/header/logo | 1485 |
| EP-27 | [Giám sát](images/ep-27-exam-monitor-v1.png) | 1448×1086 | Minor rail/header/logo | 1445 |
| EP-28 | [Bài đã nộp](images/ep-28-submissions-v1.png) | 1448×1086 | Minor rail/header/logo | 1491 |

Kích thước này là output raster, **không phải viewport đã test**. Specification bố cục tương đương 1280×960. Exact prompts và brief của mỗi màn lưu riêng; PNG/prompt SHA-256 và original built-in output path có trong [screens.json](screens.json). Tất cả asset tiêu thụ đã copy vào workspace, không chỉ ở thư mục mặc định của công cụ.

## Bằng chứng đối chiếu từng màn

- EP-25: đúng bốn chỉ số 4/6/2/1, không có tổng 13; cửa sổ cohort 14/11/2026 10:00 đến trước 15/11/2026 10:00 UTC+7 và asOf 15/11 10:00. Helper nói rõ Đã nộp bao gồm kết quả/thất bại. Bốn shortcut có route thật, không chart/trend/online/technical metric.
- EP-26: đúng ba đề, category/duration/revision/status/schedule và CTA Mở giám sát, không invented per-exam active counts, search/filter hoặc total. Metadata Tải lúc client và footer next=null đúng.
- EP-27: đúng bốn mã thí sinh/lượt c010→c007, starts 08:50/08:45/08:40/08:35 và deadlines 10:20/10:15/10:10/10:05 ngày 15/11. Mọi deadline > asOf 10:00. Copy qua các phiên bản và không thể hiện trực tuyến đều hiện. Không version filter, score, PII hoặc force submit.
- EP-28: đúng sáu row c006→c001, f001 filter/row version nhất quán, hai score 90/100 và 70/100, bốn Chưa có điểm. EXPIRED riêng có Nộp khi hết giờ; FAILED không bị chuyển thành 0. Ledger scope helper, client Tải lúc và footer next=null đúng. Không unsupported filters/export/edit/replay.

Không phát hiện wall of technical instructions trong ảnh, modal trạng thái khác lẫn vào success frame, dữ liệu cá nhân hoặc claim production/SLO/AWS.

## Findings nhỏ cần xử lý khi triển khai

1. Icon rail không đồng nhất hoàn toàn giữa bốn ảnh: database/code/info/grid/bar-chart có lúc thay bank/upload/back/activity. Dùng hệ icon capability thực tế và accessible label; không tạo route mới từ hình. EP-28 cần tách rõ Giám sát khỏi Số liệu.
2. Header badge Quản trị/Dữ liệu mẫu và avatar có sắc độ/treatment khác nhau. Dùng một shared shell theo contract Cobalt–Apricot khi port.
3. Logo công cụ vẽ check-only, chưa có phiếu thi rõ. Thay bằng logo dự án; không claim đây là logo đã chốt.
4. EP-25 icon tiles hơi lớn và hàng công việc đầu gần 1.4:1 hơn 2:1. Khi port dùng size tokens và tỷ lệ 2:1 đã yêu cầu, không dùng ảnh như pixel contract tuyệt đối.
5. Không xác nhận được font family từ raster. Code phải dùng Be Vietnam Pro và JetBrains Mono đúng token, thay vì suy từ ảnh.

Các findings này không invent dữ liệu/capability, không cần generation thêm trong đợt chính. Không có severe item bị giữ im lặng; nếu root thấy dữ liệu sai, phải sửa/block trước chấp nhận tổng.

## Validation và giới hạn

Đã chạy: JSON parse; references tồn tại; prompt counts 1000–1500; UUIDv7 fixture; thời lượng 90 phút; sorted startedAt; version filtering; deadline/asOf; nullable scores; cohort subsets; tổng 6 câu/100 điểm; PNG header dimensions và SHA-256; hashes prompt gốc; diff whitespace. Đã inspect trực tiếp cả 4 output.

Không chạy unit/integration/browser tests vì đợt này chỉ tài liệu/PNG. Current Admin live discovery, Reporting parser/integration và UI port còn là yêu cầu riêng; không tuyên bố target behavior đã chạy. Mobile, ảnh state variants, interaction, runtime accessibility và production acceptance chưa kiểm chứng.


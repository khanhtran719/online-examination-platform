# Codex Desktop V1 — Quy định thiết kế chung

Ngày 2026-10-12. Áp dụng cho ảnh desktop/dialog mới do Codex tạo theo yêu cầu người dùng. Mobile làm sau. Đây là specification hình ảnh và hành vi cần triển khai, không đổi Architecture Contract, API, quyền, dữ liệu hoặc production acceptance.

## 1. Nguồn và cách sử dụng

[Dashboard V2 tokens](../dashboard-v2/tokens.json) là nguồn màu/typography/spacing. [Ảnh preflight đã giữ](images/preflight-ready-v1.png) là tham chiếu cách tổ chức thông tin, không phải mẫu buộc sao chép mọi pixel. [Review pilot](../../concepts/codex-2026-10-12/README.md) và [review Stitch](../../stitch-05b1-review-2026-10-12.md) giữ findings. Giữ shell/rail gọn và tỷ lệ cột khoảng 2:1 của Stitch, dùng thông tin nhãn–giá trị và bảng cấu trúc rõ của ảnh pilot. Các mẫu cũ giữ nguyên.

Mỗi ảnh là một page/state thực sự, không collage, không board chứa nhiều thumbnail. Prompt phải đứng độc lập: tên màn/route/mục tiêu/actor, nguồn contract, fixture, style, từng vùng, controls, ý nghĩa hành động, trường hợp lỗi và tiêu chí review. Khoảng 1.000–1.500 từ khi nội dung cần; độ dài không thay cho nguồn hoặc tính đúng. Phần hướng dẫn interaction mô tả yêu cầu lúc code, không được biến toàn bộ thành chữ ghi chú trong ảnh.

## 2. Art direction và tokens cố định

Soft Bento/Tactile Cobalt–Apricot, sáng, gọn, tập trung tác vụ. Canvas #F3F6FC; surface #FFFFFF; Cobalt #315CF4; Apricot #FFB36B; primary tint #E8EEFF; ink #1B2540; muted #58627A. Không đổi thành tím/lavender, navy dashboard hoặc mint. Màu success/error chỉ dùng nhỏ ở trạng thái có ý nghĩa, luôn kèm icon/chữ. Không gradient nổi bật, glassmorphism, shadow nặng, hero marketing, 3D trang trí trong form/table/dialog.

Be Vietnam Pro cho heading/body, JetBrains Mono chọn lọc cho mã/điểm/thời gian. H1 khoảng 28–32px, H2 20–24px, H3 16–18px; body 16px, helper tối thiểu 14px. Không phóng đại heading/icon checklist như hero. Text thật bằng tiếng Việt, dấu đầy đủ; mã ngắn monospace. Không giả xác nhận font từ ảnh raster.

Nhịp 8px, card padding 24–32px, gutters 24px, radius card 20–24px, control radius 12px. Shadow nhẹ, border nhạt. Controls cao khoảng 44px; table đủ thoáng để đọc nhưng không biến mỗi cell thành card. Không lồng nhiều lớp card màu nhạt nếu divider/headings đã đủ phân nhóm. Tiêu đề dài wrap, không bị ellipsis khi là ngữ cảnh chính.

## 3. Shell và bố cục

Desktop bố cục tương đương rộng 1280px; ảnh output có kích thước thực khác thì ghi manifest, không gọi đó là viewport đã test. Header trắng cao khoảng 68px, rail trắng icon-only khoảng 72px, main gutter 24–32px. Logo là phiếu thi/check đơn giản trong ô Cobalt; dùng wordmark ExamPlatform. Không tự vẽ logo mũ tốt nghiệp. Admin header có badge Quản trị, avatar MA/Minh Anh. Active rail theo capability thật; không tự thêm mục công nghệ, billing hoặc tính năng.

Breadcrumb + title + helper/action là header gọn, không banner lớn lặp title. Page review/form có main/sidebar gần 2:1; main khoảng 2/3 và checklist/help khoảng 1/3. Table/report chiếm phần lớn chiều ngang. Sidebar ngắn thì chấp nhận khoảng trống tự nhiên, không thêm analytics giả để lấp. Action bar không che nội dung. Public 404 giữ public header, không ép Admin shell lên mọi trang.

## 4. Dữ liệu và business correctness

Dùng dữ liệu mẫu công khai được xác định trong prompt; không dùng dữ liệu cá nhân hoặc telemetry thật. Mỗi prompt đặt fixture nhất quán giữa page nền và dialog, giữa các tổng và từng row. Những thời điểm được backend cung cấp có thể minh họa bằng timestamp cố định có nguồn field; không tự thêm “2 phút trước” hay lịch sử tác giả nếu không có field. Không thêm chart lịch sử từ snapshot, số online từ trạng thái attempt, hoặc claim SLO/production đạt.

Câu hỏi chỉ Một lựa chọn/Nhiều lựa chọn/Đúng–Sai. Điểm mỗi câu 1–1000. Câu single/multiple có 2–10 options; true/false đúng hai options và một key. Không essay/audio/WYSIWYG/AI/proctoring/webcam/chống sao chép/thanh toán/chứng chỉ. Không endpoint mới vì hình có control. Search/filter chỉ trong phạm vi có thật; chưa có global search thì phải nói “trong phần đã tải”.

Exam fixture chuẩn: “Nền tảng điện toán đám mây — Bài ôn tập 01”, IT Certification, bản sửa 4, chưa phát hành, edits chưa lưu, 90 phút, mở 15/11/2026 08:00, đóng 12:00, Giờ Việt Nam UTC+7, tối đa 3 lượt, lời giải sau kết quả, leaderboard dùng bí danh. Ba phần Kiến thức nền 2 câu/20 điểm, Quyền truy cập & bảo mật 2/30, Tình huống triển khai 2/50; tổng 3/6/100. Chỉ thay fixture khi tên state cần, ghi đầy đủ các chênh lệch và tính lại totals.

Nullable score là “Chưa có điểm”, không phải 0. Empty khác load error. Thiếu provider metrics là “Chưa có dữ liệu”, không fake số. Keys/explanations chỉ lộ trong Admin form hoặc review được phép; không tự thêm vào Candidate preview, list hoặc report không có quyền. Audit chỉ metadata an toàn, không raw payload/token/answers/secrets. Replay chỉ FAILED + quyền và lý do; không sửa điểm/answer hoặc tạo lượt mới.

## 5. Dialog và state

Dialog trắng centered 520–600px; compare conflict có thể 780–840px; backdrop trung tính, page nền vẫn nhận diện được. Mỗi dialog phải dùng đúng nền/draft của thao tác. Nền chưa mutation nếu đang chờ confirm. Nếu dùng công cụ sửa ảnh, giữ page nền và chỉ thêm/thay overlay; không tự dựng đề khác hoặc số liệu khác. Close, cancel và primary rõ; không toàn modal đỏ. Destructive chỉ đỏ tiết chế.

Publish cần save rồi publish, chỉ báo thành công sau receipt. Lưu xong nhưng publish lỗi phải tách kết quả. Pending chặn gửi lặp; timeout/unconfirmed không được gọi là failed hoặc success. Retry giữ đúng intent. Archive/unpublish không xóa lượt đã bắt đầu. Remove section chỉ đổi membership bản đang sửa, giữ câu trong bank. Conflict giữ local edits và không hứa auto-merge/force-save. Copy trong sản phẩm dùng ngôn ngữ người dùng, không expectedRevision/JWT/SQL/HTTP codes.

## 6. Review và bằng chứng

Trước generation: kiểm tra source/API/brief, fixture, scope, source chưa hỗ trợ và prompt không mâu thuẫn. Sau generation: nhìn trực tiếp từng ảnh, kiểm tra text, sums, states, shell, rail, màu, hierarchy, CTA và background. Lỗi dữ liệu/capability phải sửa hoặc không giữ làm template đạt. Sai khác font/icon/spacing nhỏ được ghi thành finding khi port. Không tick mobile/interaction/production từ ảnh desktop.

Mỗi ảnh có ID local riêng (không bịa Stitch ID), PNG, prompt nguyên bản, kích thước thật, SHA-256, nguồn và trạng thái review. Agent chỉ ghi thư mục được giao; root sở hữu manifest tổng, registry và acceptance. Không sửa app/API/schema/AWS, không gọi Stitch generation, không thay template cũ. Không commit/deploy. Công cụ image generation tích hợp; nếu không hoạt động phải báo lỗi thật, không âm thầm chuyển API/CLI có chi phí hay dựng placeholder thay ảnh.

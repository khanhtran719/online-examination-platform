# Prompt — Admin preflight ready concept v1

Generated with the built-in `image_gen` tool on 2026-10-12. This is a new visual concept using the repository's documented style and fixture, not an edit or export of a Stitch screen. No reference image was passed into the generation call. The Dashboard V2 and Admin section screenshots were inspected beforehand to inform the prompt. Preview only; not a selected template or runtime evidence.

```text
Use case: ui-mockup
Asset type: one high-fidelity desktop browser application screen, full-page flat UI design, for the existing Vietnamese Online Examination Platform.
Primary request: Create the first visual concept for the Admin "Rà soát trước khi phát hành" screen, matching the established Soft Bento / Tactile Cobalt–Apricot style. This is an implementable app screen, not a marketing poster or a device mockup. One complete screen only. Aim for a 1280px wide desktop layout and about 1408px page height; show all content and the action bar without clipping. Render crisp readable Vietnamese typography with accurate diacritics.

STYLE SYSTEM
Canvas #F3F6FC. White #FFFFFF surfaces. Primary Cobalt #315CF4. Apricot accent #FFB36B. Pale Cobalt #E8EEFF. Dark ink #1B2540. Muted copy #58627A. Font Be Vietnam Pro, semibold headings, regular body; selective JetBrains Mono for numeric totals. Restrained soft shadows, thin pale borders, card corner radius 20–24px, spacing in multiples of 8px, 24–32px card padding, 24px gutters. Main copy equivalent to 16px; helper copy at least 14px. Buttons height 44px and corner radius 12px, consistent throughout. Clean outline icons with consistent weight. No purple cast, dark-mode panels, glossy 3D objects, gradients or decorative hero imagery. Color carries hierarchy, not decoration.

SHELL
White narrow 72px navigation rail on the left, full page height. At its top a Cobalt rounded square with a simple exam-paper/check icon. Below: compact icons for overview, exam documents (active pale Cobalt tile), question bank, import, monitor and reports; settings at bottom. Do not use a graduation cap.
White horizontal header to the right of the rail: "ExamPlatform" wordmark, small pale-Cobalt "Quản trị" badge, right side a circle avatar with initials MA and "Minh Anh". Header is compact, about 68px tall.
Main content starts below the header with a restrained breadcrumb "Quản trị / Đề thi / Sửa bản nháp" and a right-aligned link "← Danh sách đề".
Page title "Nền tảng điện toán đám mây — Bài ôn tập 01" in strong dark ink, allowing two lines rather than truncation, with a small Apricot "Bản nháp" badge. Under it muted text "IT Certification · Bản sửa 4 · Chưa có phiên bản phát hành". Do not duplicate the long title inside narrow information tiles.

STEPPER
Three steps in a single compact horizontal row: "1 Thông tin", "2 Phần & câu hỏi", "3 Kiểm tra & phát hành". The third is active in Cobalt and the first two neutral completed steps with small checks. Do not show an invented progress percentage.

CONTENT
Two-column desktop content about 2:1, main review card on the left and checklist/notice on the right. Align top edges and keep whitespace comfortable.

LEFT WHITE CARD
Heading "Rà soát trước khi phát hành" with small paper/check outline icon.
Subsection "Thông tin cơ bản", right side link "Sửa thông tin". A compact two-column key/value display:
"Danh mục" — "IT Certification"
"Thời lượng" — "90 phút"
Thin separator.
Subsection "Lịch và chính sách".
"Giờ mở" — "15/11/2026 · 08:00"
"Giờ đóng" — "15/11/2026 · 12:00"
Full-width helper with clock icon "Giờ Việt Nam · UTC+7"
"Số lượt tối đa" — "3 lượt"
"Lời giải" — "Mở sau khi có kết quả"
"Bảng xếp hạng" — "Dùng bí danh"
Thin separator.
Subsection "Cấu trúc đề", right side link "Sửa cấu trúc".
A tidy three-row list/table with small numbered rounded tiles and aligned columns "Phần thi", "Số câu", "Điểm":
"01" "Kiến thức nền" "2" "20"
"02" "Quyền truy cập & bảo mật" "2" "30"
"03" "Tình huống triển khai" "2" "50"
Wrap long section names cleanly; all counts and scores stay on the same row.
A pale-Cobalt total strip with exact text "3 phần · 6 câu · 100 điểm", large enough to scan. Do not add score-range policies or essay labels.

RIGHT COLUMN
White card title "Kiểm tra bản nháp". Small clear badge "5/5 mục đạt".
Five separate compact rows, each with a check icon AND readable text:
"Thông tin bắt buộc đầy đủ"
"Lịch đóng sau lịch mở"
"Mỗi phần có câu hỏi"
"6 câu không trùng"
"Điểm từng câu hợp lệ"
A separator and helper "Máy chủ sẽ kiểm tra lại khi phát hành".
Below it a separate pale Apricot notice card with a small info icon, heading "Nội dung được giữ cố định", body "Phiên bản phát hành giữ nội dung cố định cho các lượt thi bắt đầu với phiên bản đó." Use dark warm ink with sufficient contrast; this is informational, not an alert or a certification badge.

ACTION BAR
White rounded action bar below both columns, with a gentle shadow and sufficient spacing above. Left: small Apricot dot plus "Có thay đổi chưa lưu". Right: secondary "Quay lại", outlined "Lưu nháp", primary Cobalt "Lưu và phát hành" with a small right arrow. All enabled in this valid local-check concept. No success toast or confirmation dialog on this screen.

CONTENT CONSTRAINTS
Only three supported question types exist in this product: single choice, multiple choice, true/false. No essay questions, AI features, proctoring, webcam, full-screen enforcement, copy protection, payments or certificates. No invented candidate counts, usage analytics, timestamps, publication history, browser autosave claims, security certification claims, "Live" badges, server-approved claims or version numbers other than the loaded draft revision 4. No answer keys or explanations displayed. No UI labels EP-20, V4, P1 or implementation details. Exact fixture totals: 3 sections, 6 questions, 100 points; section scores 20 + 30 + 50.
Output: one complete polished screen image, no surrounding presentation board, no captions outside the app, no duplicate variations or collage.
```

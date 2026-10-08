# Soft Bento Study — hướng thiết kế mới để duyệt

Ngày 2026-10-08. Yêu cầu: đổi toàn bộ phong cách UI theo ảnh tham chiếu của người dùng; giữ chức năng hiện có. **Chỉ thiết kế trên Stitch, chưa sửa code sản phẩm.**

Dự án mới: [ExamPlatform — Soft Bento Study](https://stitch.withgoogle.com/projects/16100512382267958253), ID `16100512382267958253`, PRIVATE. Dự án cũ `11777231516922865355` được giữ nguyên.

## Đặc điểm phong cách

Soft Bento: nền sáng, thẻ trắng bo 20–24px, thanh điều hướng viên nang trắng mảnh, icon active hình tròn đậm, grid bất đối xứng có chủ đích, typography thân thiện và bóng mềm. Vật thể 2.5D chuyển từ thẻ tài chính của ảnh sang tập đề/phiếu câu hỏi/bút/đồng hồ. Không sao chép nghiệp vụ tài chính hoặc biến toàn web thành dashboard.

Home có bố cục giới thiệu; auth có form rõ; Candidate có bento workspace; phòng thi giữ bố cục tập trung; Admin giữ mật độ dữ liệu phù hợp. Cùng ngôn ngữ hình ảnh, không ép mọi trang dùng cùng một grid.

## Bốn bảng màu đề xuất

| Hướng                             | Canvas    | Surface   | Primary   | Accent    | Ink       |
| --------------------------------- | --------- | --------- | --------- | --------- | --------- |
| Cobalt + Apricot — ưu tiên thử    | `#F3F6FC` | `#FFFFFF` | `#315CF4` | `#FFB36B` | `#1B2540` |
| Mint + Tangerine — gần ảnh nhất   | `#F3F7F2` | `#FFFFFF` | `#087F6D` | `#FFBD69` | `#172D29` |
| Violet + Lemon — trẻ và khác biệt | `#F6F3FC` | `#FFFFFF` | `#6D49D8` | `#F5D867` | `#272137` |
| Lagoon + Lime — tươi mát          | `#EFF8F7` | `#FFFFFF` | `#087F8C` | `#C7E85B` | `#15363B` |

Đây là đề xuất cảm nhận thị giác, không cam kết màu sắc cải thiện khả năng học hoặc ngăn buồn ngủ. Giữ phần lớn diện tích neutral/white, tints nhẹ, màu mạnh ở actions/selected/illustration. Accent sáng dùng chữ ink đậm; màu error/success tách riêng. Tính tương phản sRGB cho cặp white/primary lần lượt 5.29, 4.92, 5.84 và 4.75; chưa là audit toàn giao diện.

Typography thử: Be Vietnam Pro cho heading/body, JetBrains Mono cho thời gian/mã. Đây là đề xuất thiết kế, chưa đổi font trong ứng dụng.

## Nhịp duyệt

1. Dựng ba mẫu đại diện Home/Dashboard/Exam theo palette Cobalt + Apricot để kiểm tra phong cách; chưa coi palette này là người dùng đã chọn.
2. Người dùng chọn palette và chốt các mẫu đại diện; có thể đổi sang một trong ba palette khác.
3. Mở rộng cùng design system ra 32 loại trang theo [route inventory](stitch-review-2026-10-08.md), tạo mobile/state variants. Không dùng screenshot tài chính để tự thêm chức năng.
4. Chỉ sau khi người dùng chốt UI mới tiếp tục sửa code. Các diff cũ giữ nguyên, không tự rollback/stage/commit.

## Prompt đã gửi cho ba màn đại diện

MCP hiện nhận text prompt; mô tả dưới đây phân tích từ ảnh người dùng. Không nhận đã đính kèm file ảnh trực tiếp vào Stitch.

```text
Create exactly THREE independent desktop screen designs in this NEW project: ExamPlatform — Soft Bento Study · 2026-10-08. These are a visual direction exploration for owner review, not final UI acceptance or implementation. Do not access or modify the older project 11777231516922865355. Create a NEW design system for this project; do not reuse its old navy/teal theme.

REFERENCE STYLE — the owner provided a compact property/finance dashboard image ONLY AS A VISUAL STYLE REFERENCE. Translate these described visual qualities into an examination product. Do not copy its financial functions, text, balances, charts or credit cards:
- A light warm-gray/near-white outer canvas, generous margins, a clean greeting outside the cards.
- Slim floating WHITE vertical capsule navigation, generous space around simple outline icons, a dark circular active icon, small profile circle at bottom. This replaces a broad dark sidebar. Accessible labels/tooltips for icon-only navigation; do not enlarge it into a conventional 240px dark rail.
- Asymmetric bento grid of opaque WHITE rounded cards, varied spans according to content importance, deliberate shared alignment. Cards feel soft and tactile with very restrained shadows. Not a generic row of four KPI tiles followed by charts.
- Large friendly sans-serif headings, dark ink, readable secondary text. Avoid the reference's tiny faint labels. Body 15–16px minimum for main content, headings 28–40px on dashboard and 48–56px for the Home hero at desktop.
- Crisp flat controls contrasted with occasional tangible 2.5D objects. Signature illustration: a stack of examination booklets/question sheets, a slim pencil and small timer, with visible layers and consistent side light, contact shadows and a floating angle. This translates the reference's stacked card object into the exam domain.
- No heavy neumorphic inset inputs, no glass/blur over text, no neon glow, no massive gradients or dark hero, no decorative chart when no chart data exists.

EXPLORATORY PALETTE — Cobalt + Apricot (not yet chosen by the owner):
Canvas #F3F6FC; surfaces #FFFFFF; primary cobalt #315CF4; accent apricot #FFB36B; heading/body ink #1B2540; secondary text #58627A. Use pale cobalt tints for selected/subtle backgrounds. Keep approximately 80% neutral surfaces, 15% soft tints, 5% strong color. Apricot is a decorative/support accent with DARK ink, not white small text or an error semantic. Primary buttons cobalt with white text. Error red and success green remain separate functional tokens. Saturation is concentrated in actions and one illustration/card, not every card.
Typography: Be Vietnam Pro for headlines and body (correct Vietnamese diacritics), JetBrains Mono for timer and identifiers. Cards radius about 20–24px; pills for small controls; whitespace 8px rhythm, 16–24px gutters, 24–32px card padding. Refined, optimistic and encouraging, suitable for focused studying and examinations rather than a game for children.

FUNCTIONAL SCOPE — retain the existing examination platform's functions. All data is synthetic and clearly marked Dữ liệu mẫu. Only plaintext SINGLE_CHOICE, MULTIPLE_CHOICE and TRUE_FALSE, integer exact-match scores. No new study planner, daily streak, badges/rewards, AI tutoring/proctoring, webcam, financial/billing UI, social login, password reset, role switch, pause/cancel attempt, export or official TOEIC/IELTS score conversion. Do not invent performance guarantees, aggregate totals/averages or history charts from a page of records. Do not print API/permission technical notes into user copy.

SCREEN SB-PU-01 — Trang chủ — Desktop — route /
Public header is slim and light with ExamPlatform OMR glyph, Trải nghiệm, Cách bắt đầu, Trợ giúp, Đăng nhập/Tạo tài khoản. Hero combines a bold friendly headline “Vào nhịp thi. Tập trung từng câu.”, short reassuring copy and two clear CTAs “Trải nghiệm 3 câu mẫu” / “Tạo tài khoản”. Large 2.5D stack of exam papers on the right inside the bento composition, with a small apricot/cobalt accent; no dark full-width hero. Follow with interactive sample preview area, three concise benefit cards for question navigation/mark-for-review/save confirmation, category cards (TOEIC, IELTS, IT Certification, Đại học, Tuyển dụng, Nội bộ), compact FAQ and a strong but restrained closing CTA. No user-count/rating/latency claims. FAQ: server acknowledgment confirms saved answers; unconfirmed changes are only in memory and may be lost on reload. Define decorative float only in art, with pause and reduced-motion/static note. Do not place art over readable text.

SCREEN SB-CA-01 — Bảng làm việc — Desktop — route /dashboard
Use the floating WHITE capsule rail from the reference; Candidate items Bảng làm việc, Đề thi, Lịch sử, Hồ sơ. No unconditional Admin item. Top greeting “Chào Lan, sẵn sàng cho câu tiếp theo?” outside the cards, profile/log out quiet in header. Asymmetric grid: the dominant wide card is “Lượt đang làm”, frozen exam title or version fallback, startedAt and a prominent “Vào phòng thi” action. Small 2.5D exam booklet sits at the opposite side of this card. Explain time continues when leaving; no paused label, fake countdown/progress or cancel. Secondary cards: up to three recent attempts with lifecycle status and nullable earned/possible, a calm “Bắt đầu như thế nào?” guide, and actual exam category/browse cards below with duration/question count and “Xem đề”. Use only sourced synthetic fields, no total completed/average time/streak invented. Recent history/catalog empty and error states are separate variants, not all displayed on the default. Match visual softness and grid rhythm of the reference without its financial content.

SCREEN SB-CA-04 — Phòng thi — Desktop — route /attempts/:attemptId
Use the SAME visual language and palette but a focused exam shell, not the Candidate rail: compact light status header with exam/version context, explicit save state, clear MONOSPACE timer and “Nộp bài”; exit action is quieter. Large readable white question card on the left (about 70%) and white OMR question map on right (about 30%). Circular A/B/C/D labels, generous native radio/checkbox rows, pale cobalt selected surface and cobalt indicator; mark-for-review has icon + text. Three supported question-type variants, no richer media/essay types. Keep answer selection separate from “Đã lưu” after server ACK. Deadline remains server-based; no reset while offline/reauth/dialog. Scope labels when only a page is loaded; no invented total count. Native navigation and sheet controls. Add a separate submit-confirmation variant if possible, never overlay every state on the default. NO floating art, parallax or timer pulsing inside the exam.

Handoff: each of the three screens independently named as above, one H1, screen ID/route, common tokens, and notes for 390px mobile adaptation (not squeezed desktop). 44px touch controls and visible focus; meaningful text contrast and states beyond color. Preserve all generated outputs in this new project for owner review. Return actual screen IDs; do not claim all 32 product pages redesigned. First establish this style on these three representative pages; the complete 32-page route inventory will be supplied in a later batch after owner selects the palette and visual direction.

```

## Kết quả generation

Đang chờ output. Chỉ bổ sung IDs và trạng thái sau khi nhận/kiểm tra inventory; không tính gửi prompt là đã tạo xong.

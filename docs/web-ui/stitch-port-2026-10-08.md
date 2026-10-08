# Triển khai UI theo Stitch — Home, Dashboard, phòng thi

Ngày 2026-10-08. Phạm vi increment: ba mẫu đã được người dùng duyệt trong [ExamPlatform UI/UX Redesign](https://stitch.withgoogle.com/projects/11777231516922865355), cùng các shell/tokens cần thiết. Đây là một đợt port presentation; chưa xác nhận toàn bộ 32 trang đã được port hoặc nghiệm thu live/production.

## Kết quả

| Mẫu Stitch                                   | Phần triển khai                                                                                                                   | Điều chỉnh để đúng chức năng                                                                                                                                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home `43fe592b5ebe411aacc87c1f5aadb71b`      | Header sáng, hero hai cột, minh họa giấy/bút/đồng hồ trong thẻ trắng, mẫu ba câu nhúng, ba lợi ích, sáu danh mục, FAQ và CTA navy | Mẫu nhúng dùng reducer hiện có, không tạo attempt hoặc gọi business API. Không thêm các số liệu hiệu năng, lời hứa sao lưu hoặc chứng nhận trong prototype.                                          |
| Dashboard `0e91fe7b89774fcfb0d9469494281dc6` | Rail navy, lời chào gọn, thẻ tiếp tục, lịch sử gần đây, thẻ hướng dẫn và danh mục đề                                              | Browse thêm tối đa bốn đề qua `PlatformApi.browseExams`, lọc category thật. Lỗi history và catalog độc lập. Không suy tổng/average từ một trang; title chỉ dùng frozen memory khi đúng exam/version. |
| Exam `268f0679a2154b91828af861b8b6bfec`      | Header navy tập trung, đồng hồ monospace, trạng thái lưu, thẻ câu hỏi trắng, đáp án xanh nhạt/mint, huy hiệu A/B và phiếu câu hỏi | Giữ native radio/checkbox, coordinator và handlers hiện tại. “Đã lưu” vẫn cần ACK; deadline, conflict, reauth, submit và quyền xem bài không đổi.                                                    |

Font JetBrains Mono được self-host cùng Source Sans 3/Noto Sans. Brand dùng glyph phiếu trả lời SVG. Canvas sáng `#f8f9ff`, white surfaces, navy text/chrome, primary teal `#0f766e`, hover `#005c55`, mint accents; không thay art direction bằng một theme khác.

Chiều sâu được làm rõ bằng cạnh/lớp giấy, phối cảnh, ánh sáng và bóng trong frame trắng. Home tái sử dụng renderer Three.js có sẵn và CSS fallback; có nút dừng, reduced-motion, offscreen pause và context-loss recovery. Dashboard tái sử dụng minh họa CSS3D. Phòng thi giữ tĩnh. Không thêm thư viện 3D, backend hoặc storage mới.

## Files và ranh giới

- `apps/web/src/features/experience`: Home/public styles, hero frame, tách panel mẫu dùng chung giữa Home và `/experience`.
- `apps/web/src/features/catalog/dashboard-page.tsx`, `dashboard.module.css`: bố cục dashboard và catalog read độc lập.
- `apps/web/src/features/assessment/room-toolbar.tsx`, `room.module.css`: presentation phòng thi.
- `apps/web/src/shared/{styles,ui}`, `src/main.tsx`, package manifest/lock: tokens, font và brand.
- `apps/web/src/app/router.tsx`: import trực tiếp route mẫu vì Home đã dùng chung module; WebGL và phòng thi vẫn lazy riêng.
- Tests mới cho catalog khi history lỗi, category request, lựa chọn mẫu nhúng, page title và focus trong Strict Mode. Selector E2E banner được scope theo nội dung vì Home nay có thêm answer status.

Chủ sở hữu là frontend presentation của Public/Catalog/Assessment. Catalog read qua public frontend API adapter hiện có; pageSize 4 hợp lệ theo OpenAPI/backend. Không thay contract HTTP, transaction, schema/migration, event, queue, scoring, auth hoặc permissions. Không sao chép JavaScript timer/scoring giả của Stitch vào engine.

## Validation

| Lệnh/check                                                                    | Kết quả                                                           |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `npm --prefix apps/web test`                                                  | 24 files, **96 tests PASS**                                       |
| `npm --prefix apps/web run lint`                                              | PASS                                                              |
| `npm --prefix apps/web run build:demo`                                        | TypeScript + Vite demo PASS                                       |
| `npm --prefix apps/web run build`                                             | TypeScript + Vite live PASS                                       |
| `WEB_EVIDENCE_DIR=…/stitch-port-2026-10-08 npm run test:e2e` trong `apps/web` | **24 Chromium cases PASS**, 0 skipped/flaky/unexpected; 62,191 ms |
| `git diff --check`                                                            | PASS                                                              |

E2E có Home/sample tại 320/390/768/1024/1440, keyboard/navigation/focus, native question types, save/conflict/frozen-version/submit/result, Admin permission boundaries, reduced-motion/pause/offscreen/context-loss/fallback và axe tại các điểm được test. Các axe scans không có serious/critical violations; không coi đây là chứng nhận WCAG cho toàn web. Public demo/live không phát sinh request asset ra ngoài origin trong những ca kiểm tra này.

Lần chạy trước có ba failures: selector status banner không còn duy nhất khi nhúng mẫu, và hai ca axe cùng phát hiện tương phản eyebrow 4.46:1. Đã scope selector banner, đổi màu chữ eyebrow sang teal đậm và chạy lại cả 24 cases với bản build mới. Strict Mode không tự focus/cuộn vào mẫu khi Home mở lần đầu; test đã RED trước và GREEN sau khi sửa.

Ảnh và summary tại [evidence](evidence/stitch-port-2026-10-08/README.md). Đã xem trực tiếp screenshot Home, dashboard và phòng thi; sửa clipping minh họa dashboard trước bản build cuối.

## Giới hạn và phần tiếp theo

Đợt này đóng ba mẫu gốc và shared presentation nêu trên. Các màn hình Stitch được sinh bổ sung cần đối chiếu output với route/contract trước khi port; [review](stitch-review-2026-10-08.md), [prompt đầy đủ](stitch-completion-prompts-2026-10-08.md) và [plan](stitch-implementation-plan-2026-10-08.md) theo dõi riêng.

Demo dùng fixture tổng hợp có banner. Các bài thi cũ thiếu metadata vẫn hiển thị fallback theo version, không lấy tiêu đề publication mới. Live không fallback sang demo. Chưa chạy lại Identity HTTPS/API thật hoặc matrix live Catalog/Assessment/Reporting trong đợt visual này; FE7/32 và production ledger không được tự nâng trạng thái. Chưa deploy hoặc commit. Các thay đổi tài liệu backend đang có song song trong workspace được giữ nguyên.

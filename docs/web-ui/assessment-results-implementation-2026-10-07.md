# Web UI đợt 3 — Làm bài và kết quả

## Phạm vi và kế hoạch

User yêu cầu tiếp tục sau đợt2. Baseline HEAD `80710f5` cùng các thay đổi đợt2 chưa commit; giữ nguyên đợt2 và tài liệu ngoài Web UI đang có trong workspace. Phạm vi6 pages: phòng thi, trạng thái xử lý, kết quả, giải thích, lịch sử và bảng xếp hạng theo bộ mẫu secondary-pages.

Chủ sở hữu: browser Assessment/Results. Giữ controller autosave/clock/submit, frozen versions, ACK-only saved state, draft/conflict/reauth, server deadlines và result/review permissions. Reads dùng API hiện có; không thêm endpoint, backend, migration, scoring, summary API hoặc transaction mới. R58/59: không có API/use case backend mới; frontend không thay invariant nghiệp vụ. API Assessment/Reporting thật còn gate riêng.

Art direction: kế thừa navy/mint và type của đợt1/2. Phòng thi giống giấy làm bài, header có timer/save status, option có ký hiệu A/B/C, phiếu câu hỏi có legend bằng chữ và biểu tượng. Không ambient animation trong bài thi. Kết quả nhấn điểm thật và phần trăm do API trả; section scores rõ. History/leaderboard dùng table với vùng cuộn keyboard trên mobile, không tổng/average từ partial page và không podium/identity join. Status chỉ diễn giải trạng thái thật, không tiến độ xử lý giả.

- [x] Regression trước sửa cho route status không giữ bài cũ, native question group, leaderboard refresh/access và manual status refresh.
- [x] Room toolbar/navigator/question/dialog presentation, giữ controller.
- [x] Result/status/review/history/leaderboard layouts và copy.
- [x] Unit, typecheck/build/lint, browser critical flows và visual5 widths/axe.
- [x] Self-review, status/evidence và preview bàn giao.

## Kết quả

Hoàn tất named scope visual của6 pages. Phòng thi có thẻ câu hỏi trắng, helper theo loại câu, native controls và ký hiệu lựa chọn A/B/C. Toolbar tách đồng hồ, lưu và nộp; legend/phiếu có chữ và biểu tượng. Mobile dùng dock và dialog giữ focus/Escape. Chọn một/nhiều/đúng–sai, đánh dấu, clear, conflict, draft guard và điều hướng vẫn đi qua controller cũ.

Status có card và3 bước diễn giải lifecycle thật, active/failed/completed, cùng thao tác kiểm tra lại sau khi polling dừng. Result nhấn earned/possible, percentage và điểm theo phần; không tự chấm hoặc quy đổi thang điểm. Review chỉ đọc, phân biệt lựa chọn/đáp án được công bố và có explanation riêng. History/leaderboard là semantic tables với named keyboard scroll region, nullable score, cursor loadmore và manual refresh. Không thêm aggregate, podium, fake filters hoặc identity join.

Đã sửa2 lỗi quan sát được trong phạm vi trang: status giữ kết quả lượt trước khi đổi route; leaderboard còn hiển thị payload cũ sau403. Manual refresh bỏ snapshot/cursor cũ. Việc kiểm tra lại status tạo một vòng polling mới theo thao tác người dùng; không tự khởi động lại terminal loop. Regression review xác nhận403 gỡ keys/explanation khỏi DOM và query cache sau khi tách page.

## Files và kiến trúc

- [Exam room](../../apps/web/src/features/assessment/exam-room.tsx), [question view](../../apps/web/src/features/assessment/question-view.tsx), room-toolbar/navigator/dialogs và room.module.css: tách presentation khỏi file phòng thi lớn.
- [Results barrel](../../apps/web/src/features/results/result-pages.tsx), status/result/review/history/leaderboard pages, [polling hook](../../apps/web/src/features/results/use-attempt-polling.ts) và results.module.css: tách page, giữ polling algorithm cũ.
- [Browser regressions](../../apps/web/e2e/assessment-results.e2e-spec.ts), question/status/leaderboard/review component regressions và [test inventory](../test-inventory.md).

Đối chiếu R58/R59 và workflow47/48: owner là browser Assessment/Results; reads và save/submit contracts giữ nguyên. Không sửa DTO, API adapter, backend, migration, event/outbox, transaction, clock/autosave/submit coordinator hoặc scoring. Không thêm dependency/runtime3D cho các trang này. CSS dùng tokens hiện có. Tên đề/phần chỉ từ frozen context hợp lệ; cache thiếu dùng suffix phiên bản.

Các thay đổi backend Assessment và tài liệu dự án do increment song song tạo được giữ nguyên. Root test count có phần backend đó; không nhận chúng là deliverable của đợt Web UI này. Workspace vẫn có đợt2 chưa commit; không stage/commit hoặc tạo PR trong đợt3.

## Validation

[Evidence và ảnh](evidence/assessment-results-2026-10-07/README.md), [manifest](evidence/assessment-results-2026-10-07/manifest.json).

| Kiểm tra                       | Kết quả quan sát                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root npm test, lần cuối        | 217 PASS:94 API +37 tooling +86 Web/22 files                                                                                                       |
| Typecheck và demo/live builds  | PASS                                                                                                                                               |
| npm run lint/quality/contracts | PASS;46 operations,425 examples                                                                                                                    |
| Chromium browser               | 20 PASS,0 retries/skips:18 ca cũ +2 luồng mới                                                                                                      |
| Browser luồng thi              | Keyboard radio, single/multiple/true-false, ACK, marked-only filter, Escape/focus, submit→status→6/6 và100.00%→released review read-only           |
| Browser bảng                   | Keyboard horizontal scroll320px, nullable history score, refresh và leaderboard không chứa profile name/email                                      |
| Visual                         | 17 states ×5 widths320/390/768/1024/1440 =85 probes;34 axe scans;0 serious/critical,0 document horizontal overflow,0 page errors/external requests |
| Room motion/zoom               | 0 running animations khi reduced-motion; CSS zoom200% không tràn ngang                                                                             |

Ảnh chính: [phòng thi desktop](evidence/assessment-results-2026-10-07/screenshots/room-selected-1440.png), [multiple choice mobile](evidence/assessment-results-2026-10-07/screenshots/room-multiple-390.png), [kết quả](evidence/assessment-results-2026-10-07/screenshots/result-1440.png), [giải thích](evidence/assessment-results-2026-10-07/screenshots/review-390.png), [status failed](evidence/assessment-results-2026-10-07/screenshots/status-failed-390.png), [history](evidence/assessment-results-2026-10-07/screenshots/history-1440.png), [leaderboard](evidence/assessment-results-2026-10-07/screenshots/leaderboard-1440.png). Có thêm frozen-title gap, conflict,120-câu paged room, long prompt, locked review và denied board.

Root run ban đầu gặp một test Assessment policy RED khi backend còn chỉnh song song; [log ban đầu](evidence/assessment-results-2026-10-07/tests.log) được giữ. [Log cuối](evidence/assessment-results-2026-10-07/tests-final.log) PASS sau cập nhật backend. Các lỗi selector trong hai browser tests mới được chỉnh theo tên native controls; bộ20 ca trên final application build đều PASS.

## Giới hạn và bước sau

Ảnh và luồng Assessment/Results dùng synthetic demo fixtures, có banner dữ liệu mẫu. Browser default suite cũng kiểm tra live mode không fallback sang demo; không chứng minh live Assessment/Reporting UI đã hoạt động với backend thật. Identity HTTPS10 là evidence đợt2, không chạy lại trong đợt3 vì transport/auth không thay đổi. Không chạy lại toàn bộ W-16/W-18 diagnostic, browser multi-tab/lost-ACK/deadline/release-window matrix hoặc opt-out. Chromium, CSS zoom200% và axe scans không thay full WCAG/CWV/cross-browser/production acceptance. FE vẫn7/32 checked; các named visual increments không tick toàn FE14–21.

Bước visual kế tiếp là Admin pages. Bước integration riêng là nối và chạy matrix browser với Assessment core/backend Reporting khi đầy đủ capability. Không tuyên bố capacity, SLO, AWS savings hoặc production readiness từ bộ ảnh này.

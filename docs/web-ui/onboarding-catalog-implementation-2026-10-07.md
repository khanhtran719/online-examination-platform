# Đợt 2 — Onboarding, dashboard và catalog

## Phạm vi và kế hoạch

Baseline `80710f5`, working tree sạch; đợt 1 đã được merge. User yêu cầu triển khai đợt 2 ngày 2026-10-07.

Chủ sở hữu: browser features Auth/Identity và Catalog/Candidate. Đổi presentation của login, register, check-email, verify-email, dashboard, browse và exam detail theo bộ mẫu secondary-pages. Không thêm API, schema, transaction, quyền hay scoring. Auth vẫn generic 202, token chỉ trong memory sau scrub, xác nhận bằng thao tác người dùng; login không áp minimum của register. Start giữ khóa khi mất ACK; deadline và quyền do máy chủ quyết định. Dashboard chỉ dùng history đã tải và metadata đúng frozen version trong memory, không suy ra tổng/điểm trung bình hay fetch N+1.

Art direction: navy `#081c25`, mint `#a3f2d0`, trắng giấy `#f5f8f7`, ink `#14283f`, nền `#f4f7fa`; dùng tokens đợt 1, Source Sans 3 cho heading và Noto Sans cho body. Dấu ấn giấy/bút CSS perspective; chuyển động vào trang hữu hạn, không thêm WebGL cho form. Form nằm trước illustration trên mobile. Auth split panel; dashboard welcome + continue/recent + category shortcuts; catalog các hàng đề; detail nội dung + sidebar bắt đầu.

- [x] Regression cho resend failure/429 và dashboard partial/frozen history. RED cho success feedback sai khi lỗi và missing recent result; GREEN sau sửa. Negative frozen-owner check bảo vệ metadata hiện có.
- [x] Auth frame và minh họa chung, copy/hints và recovery links.
- [x] Dashboard, browse và detail theo dữ liệu thực.
- [x] Build live/demo, unit/regression browser, HTTPS Identity, visual 5 widths, axe và review diff.
- [x] Cập nhật status/evidence và bàn giao preview.

R-58/59 đã đối chiếu: không có API/use case backend mới. Các invariants/contract/test liên quan nêu trên là gate frontend. FE checklist toàn dự án không tự đóng từ việc hoàn thành nhóm trang này.

## Kết quả và kiểm chứng

Hoàn thành named scope 7 pages. Auth dùng split navy/white, form ở trước trên mobile, các bước onboarding thực tế, password hints có `aria-describedby` và link gửi lại email. Giữ API/form exports và validation cũ. Resend phân biệt hướng dẫn ban đầu, accepted202, HTTP429 và lỗi mạng; không còn success title khi request lỗi. Không hứa email đã được giao. Illustration aria-hidden, CSS perspective/stacked paper/pen, entrance850ms hữu hạn, reduced-motion tắt animation; không thêm dependency/runtime WebGL.

Dashboard dùng Profile.displayName và history API đầu20; recent tối đa3 dòng, score do server trả. Lookup metadata bằng publishedVersionId và kiểm tra examId; fallback ID suffix phân biệt fixtures thay vì ghép tên mới vào lượt cũ. Có resume link cho active và result/status links đúng trạng thái, không tính aggregate từ trang đầu. Browse dùng hàng đề có paper icon nổi, category buttons `aria-pressed`, pageSize20/100, URL state, empty-clear CTA và cursor/reset cũ. Detail chia cấu trúc/lịch và sidebar bắt đầu; leaderboard chỉ liên kết khi phiên bản bật. Dialog/cancel/focus, pending guard, retry key và điều hướng phòng thi giữ nguyên. Bỏ hai notices Catalog chưa được triển khai đã lỗi thời; không thay lỗi máy chủ bằng fixtures.

Source được tách theo page trong feature Catalog, router giữ imports public qua `catalog-pages.tsx`. Auth dùng `auth-frame.tsx`; illustration native dùng `shared/ui/paper-art.tsx`. Không đổi backend, migrations, permissions, auth transport, frozen payload hay scoring. Các thay đổi tài liệu ngoài `docs/web-ui` xuất hiện đồng thời trong workspace không thuộc increment này và được giữ nguyên.

| Kiểm chứng | Kết quả |
| --- | --- |
| `npm run lint` gồm quality/contracts | PASS;46 operations/425 examples |
| `npm test` | PASS206:89 API +37 tooling +80 web |
| `npm run web:typecheck`, builds demo/live | PASS |
| Chromium suite cuối | PASS18;16 existing +2 onboarding/catalog |
| Identity HTTPS/API/PG/SMTP thật | PASS10; không trace/cookie/email-link raw |
| Visual 13 screens/states ×5 widths | PASS65 probes;320/390/768/1024/1440, không document overflow |
| Axe | 26 scans,0 serious/critical |
| Reduced-motion và CSS zoom200% login | animation none; không overflow |
| Runtime visual capture | 0 pageerrors,0 external requests |

Đã xem ảnh login desktop/register mobile/dashboard desktop/catalog desktop/detail desktop và tiêu đề dài mobile. Lần chụp đầu axe khởi động lại CSS entrance làm giấy mờ; bỏ opacity fade và đợi animation hoàn tất trong capture. Capture cuối dùng build mới. [Evidence và lệnh tái lập](evidence/onboarding-catalog-2026-10-07/README.md) giữ ảnh/log/JSON riêng, không ghi đè bộ ảnh đợt1.

Preview demo: `http://127.0.0.1:4173/login`; tài khoản fixture trong “Kịch bản mẫu”. Live preview4174 khi backend không chạy hiện lỗi thực tế. Browser tab đã được gửi đến panel Codex; tool trả `queued`, chưa xác nhận hiển thị foreground.

## Giới hạn và bước kế tiếp

Ảnh Catalog/Candidate là fixture demo. HTTPS10 kiểm tra Identity thật, không chứng minh live Catalog/Assessment/Reporting đầy đủ. Backend Assessment/attempt và Reporting cùng authoritative permission source vẫn có gate riêng. FE12/13 còn partial cho live pagination/start lost-ACK matrix; toàn dự án giữ7/32. Chromium/axe/CSS zoom không chứng nhận WCAG, native OS popup, mọi browser hoặc FPS/Core Web Vitals/conversion/production capacity. Bước kế tiếp là đợt3: phòng thi, status/kết quả, lịch sử và leaderboard, giữ ưu tiên timer/save/conflict correctness.

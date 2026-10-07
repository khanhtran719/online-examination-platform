# Triển khai “Vào nhịp thi” — 2026-10-07

## Phạm vi được yêu cầu

Người dùng yêu cầu triển khai bản demo đã xem: homepage “Cổng ánh sáng / Vào nhịp thi”, hero phiếu thi 3D và ba câu mẫu công khai. Increment này thuộc frontend `apps/web`, không tạo use case/API hoặc dữ liệu kỳ thi. Đăng ký, xác thực email và các route bài thi thật giữ hợp đồng hiện tại. Working tree đã có công việc Identity HTTPS; các file đó được giữ và chỉ chỉnh đúng phần cần cho increment này.

## Kế hoạch

1. Cập nhật Web UI spec/ADR cho homepage và `/experience`; phân biệt nội dung mẫu công khai với adapter/fixtures kiểm thử riêng.
2. Thêm tokens public navy/mint; dùng Source Sans 3 và Noto Sans self-host hiện có. Dựng homepage với scene phiếu thi/bút/đồng hồ, các bước bắt đầu, danh mục và FAQ. Điểm nhấn là scene; form và phòng thi dùng nền sáng.
3. Cài Three.js 0.180.0 (phiên bản của demo) cùng typings tương ứng, lazy-load module graphics từ asset cùng origin. Có hình CSS fallback, pause/reduced-motion, pause ngoài viewport/hidden tab, cleanup khi đổi route và xử lý context loss. Đo kích thước build; không lấy bundle hoặc FPS làm lời hứa trước khi đo.
4. Viết test RED rồi triển khai ba câu tự tạo ở feature `experience`: lựa chọn, đánh dấu, chuyển câu, xem lại/kết quả mẫu, reset và CTA tới `/register`. State chỉ trong bộ nhớ; refresh bắt đầu lại. Không có API/scoring official/attempt ID trong feature này.
5. Chạy frontend lint/typecheck/unit/build live+demo, quality phù hợp và browser regression. Kiểm tra WebGL, fallback, reduced-motion, mobile/desktop, keyboard, axe, route đăng ký và bảo vệ attempt. Ghi evidence và review cuối ở báo cáo này.

## Quyết định

Three.js phục vụ yêu cầu cảnh 3D thật đã được xem/duyệt; CSS chỉ làm fallback. Không thêm framework 3D hoặc motion wrapper. Scene dùng geometry và texture tự tạo; không tải model, font hoặc script từ CDN khi chạy app. Theo hướng dẫn [installation](https://threejs.org/manual/pages/installation.html) và [cleanup](https://threejs.org/manual/pages/cleanup.html), tài nguyên graphics được đóng gói và dispose ở vòng đời component.

R-58/R-59: không có endpoint, write transaction, lock, repository, event hoặc outbox mới. Public contract mới là route `/experience` và nội dung minh họa có nhãn rõ. Authority của Assessment/Identity giữ ở các capability hiện có.

## Kết quả triển khai

- [x] Spec/API-state/ADR ghi ngoại lệ public experience và route `/experience`.
- [x] Homepage navy/mint, scene phiếu thi/bút/đồng hồ3D, header/menu responsive, lợi ích, bước bắt đầu, danh mục, FAQ và CTA đã tích hợp React.
- [x] Three.js0.180.0 và typings khóa phiên bản; graphics lazy-load cùng origin, CSS fallback, pause/reduced-motion, hidden/offscreen pause, context recovery và dispose khi rời route.
- [x] Ba câu công khai có chọn một/nhiều/đúng-sai, đánh dấu, chuyển/xóa, xem lại, kết quả mẫu, thử lại và CTA `/register` thật. State chỉ trong bộ nhớ.
- [x] Unit/browser regression, build live+demo, lint/typecheck, quality và self-review hoàn tất. [Bằng chứng](evidence/vao-nhip-thi-2026-10-07/README.md) có logs, browser JSON và ảnh.

Marketing được áp dụng vào thông điệp và luồng lần đầu: CTA trải nghiệm trước, thao tác ngắn có kết quả và đường tạo tài khoản rõ. Không thêm tracking, quảng cáo hoặc testimonial/số liệu giả. Chưa có dữ liệu chứng minh hiệu quả chuyển đổi.

## Kiểm tra và review

| Kiểm tra                                              | Kết quả                                                                                                                                                                                                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RED9 unit cases mới                                   | 8 fail/1 pass trước khi triển khai reducer/UI; sau triển khai9/9 pass                                                                                                                                                                    |
| `npm --prefix apps/web run test -- --run`             | 73 tests/16 files PASS, không bỏ qua                                                                                                                                                                                                     |
| `npm --prefix apps/web run lint` và `run typecheck`   | PASS                                                                                                                                                                                                                                     |
| `npm --prefix apps/web run build` và `run build:demo` | PASS                                                                                                                                                                                                                                     |
| `npm --prefix apps/web run test:e2e`                  | 12/12 PASS:8 public visual live+demo và4 regression hiện có                                                                                                                                                                              |
| Browser visual/accessibility                          | WebGL thật trong Chromium software rendering;5 widths320/390/768/1024/1440 không tràn ngang. Axe không serious/critical trên homepage320/1440 và sample/result390. Keyboard, focus chuyển câu/review, reduced-motion và mobile menu PASS |
| Scene lifecycle                                       | Số draw calls không tăng khi pause/offscreen; bật lại tiếp tục draw; forced WebGL failure/context loss hiển thị fallback, restore hoạt động; rời route không còn canvas                                                                  |
| API separation                                        | Luồng public sample không gọi business endpoint; owned attempt vẫn yêu cầu session. Live bundle không có fixture credentials/scenario markers được kiểm tra                                                                              |
| `npm run contracts:check` và `git diff --check` | PASS; contract checks46 operations/425 examples |
| `npm run quality` | Lượt trước PASS; lượt cuối báo3 lỗi link trong tài liệu Identity HTTPS đang thay đổi song song: thiếu `manifest.json` ở2 link và thiếu anchor validation. Không có lỗi link của increment UI. Giữ nguyên tài liệu/evidence của công việc đó; xem log |

Hai kỳ vọng browser cũ đã được sửa theo invariant hiện có: frozen attempt hiển thị thông báo thiếu metadata và nội dung version1 thay cho mã nội bộ `UI-GAP-02`; Candidate không có link Admin nên kiểm tra direct return `/admin`, sau đó kiểm tra quyền bị rút khi đang ở ngân hàng câu. Không sửa permission gate để làm test qua. Evidence hồi quy chuyển sang thư mục increment riêng; ảnh báo cáo cũ được giữ nguyên.

Self-review: `experience` không nhập DemoApi, DTO keys của Candidate, scoring/domain backend hoặc adapter nghiệp vụ; route mẫu không bypass RequireAuth của attempt/catalog. Không thay public HTTP contract, cookie, transaction, event, database, worker hay AWS resource. Thành phần dùng semantic tokens, font self-host, native controls và nhãn minh họa. Giữ các thay đổi Identity HTTPS đang có trong working tree.

## Chi phí và giới hạn

Build cảnh 3D: **520.18kB raw /132.21kB gzip**, cùng kích thước ở live/demo. Đây là chunk riêng và vượt ngưỡng cảnh báo500kB của Vite; không đưa vào tải đầu của trang ngoài homepage. Scene chỉ được yêu cầu khi hero vào viewport. Hình CSS và CTA có sẵn trước graphics. Public experience khoảng10.4kB JS /3.5kB gzip và9.86kB CSS /2.20kB gzip. Kích thước build không chứng minh Core Web Vitals hoặc FPS.

Hoàn tất phạm vi triển khai và kiểm tra cục bộ. Preview live dùng4174, demo dùng4173. Chưa phát hành production, chưa chạy Safari/thiết bị thật hoặc đo Core Web Vitals/FPS/conversion. Các gate AWS, SLO, cost, production acceptance giữ trạng thái riêng; không đóng bằng checks UI.

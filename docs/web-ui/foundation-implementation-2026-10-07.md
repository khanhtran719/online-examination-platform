# Web UI — đợt1: nền tảng giao diện, 2026-10-07

## Phạm vi và kế hoạch

User yêu cầu triển khai đợt1 từ bộ mẫu secondary pages, tiếp tục trên `main` sau merge baseline `e9606f0`. Owning scope là UI shared và app shells trong `apps/web`: brand, semantic tokens, type, Button/Input/Select/Alert/Table, navigation desktop/mobile và micro-interactions. Không đổi cấu trúc nội dung các trang đợt2–4, API/DTO, scoring, quyền, autosave hay transaction. R-58/R-59 không tạo API checklist cho thay đổi shell. Các thay đổi Catalog/Identity đang có trong working tree thuộc công việc khác và được giữ nguyên.

1. Dùng một Brand navy/mint và font self-host Source Sans3/Noto Sans; chuẩn hóa radius10/16px, type và shadow bề mặt theo bộ mẫu đã review.
2. Tách Navigation dùng chung cho Public và workspace: menu mobile có aria-expanded/controls, đóng khi chọn route/khi Escape, trả focus về trigger khi Escape. Desktop workspace dùng rail224px; mobile nội dung và menu nằm trong flow, không che form. Candidate và Admin dùng chung WorkspaceFrame; capability filters và logout confirmation giữ nguyên.
3. Chuẩn hóa control shared và các native control còn nằm ở page; form error/disabled/focus có trạng thái rõ, bảng cuộn bên trong container. Micro-interactions150–200ms bằng transform/opacity; không thêm ambient motion vào phòng thi/Admin. Scene3D public hiện có được giữ, giảm chuyển động theo hệ thống.
4. Viết regression browser cho menu trước implementation; chạy build/typecheck/lint/unit, E2E hiện có và kiểm tra ảnh ở320/390/768/1024/1440, zoom/reduced-motion/axe.
5. Review diff và ghi evidence, kết quả cùng giới hạn. Chỉ đánh dấu đợt1 hoàn tất bằng kiểm tra đã chạy; không tick các gate business live/production.

## Thiết kế

Palette: navy `#081C25`, mint `#A3F2D0`, teal `#0F766E`, canvas `#F4F7FA`, ink `#14283F`, white. Thay các public aliases bằng tokens brand chung, giữ status/focus semantics. Source Sans3 cho heading/brand, Noto Sans cho body, số tabular. Signature dùng mark chữ e dạng phiếu nghiêng, edge mint và chuyển động hover nhẹ; lớp giấy3D lớn vẫn thuộc trang chào đón, không đặt vào nội dung làm bài.

```text
Desktop: [Brand + rail224px] [Topbar: ngữ cảnh / hồ sơ / đăng xuất]
                              [Nội dung trang hiện có]
Mobile:  [Brand                         Menu]
         [Navigation mở trong flow khi cần]
         [Ngữ cảnh / hồ sơ / đăng xuất]
         [Nội dung trang]
```

Bộ mẫu đã có cho từng trang là mục tiêu của các đợt sau. Đợt1 chỉ thay hệ nền và shell để có bề mặt đồng bộ; không sao chép dữ liệu minh họa vào ứng dụng.

## Kết quả và validation

COMPLETE cho named scope đợt1, trên merge baseline `e9606f0`. Không đóng full Web/production gates.

- Một Brand và Navigation dùng chung cho Public/Candidate/Admin; desktop rail224px, mobile menu trong flow. Escape trả focus, link/Back/Forward tạo location mới luôn reset menu. NavLink giữ active semantics và icon có aria-hidden.
- WorkspaceFrame tái sử dụng ngữ cảnh, tên profile, logout và xác nhận unsaved. Candidate/Admin giữ whitelist/capability filters; live Admin vẫn bị chặn khi Profile không có authority permissions. Examination không có rail/marketing mới.
- Semantic brand aliases giữ scene3D public; controls44px, radius10/16px, type scale desktop/mobile và surface depth. Brand/card-link hover nhẹ; global reduced-motion tắt animations/transitions. Không thêm ambient vào workspace.
- Input/Select/TextArea/Button có states nhất quán. Field IDs, external helper và validation error liên kết đúng; password visibility disabled theo field. TableScroll được đặt tên/focusable và chỉ cuộn bên trong, đã ghép vào bảng exam/audit. Auth/profile/reading có gutter16px trên mobile.
- `/dev/ui` showcase có variants/states, native select/password/textarea, alerts, bảng và dialog. Dữ liệu chỉ demo. Không đổi request body, API, persistence, migration, events hoặc dependencies.

## Tự review

Owning scope nằm ở `app`/`shared/ui`/`shared/styles`; business pages chỉ thay TableScroll wrapper. Không đưa business adapters vào shared, không lấy role phía client để mở thêm quyền. Session/logout coordinator, deadline/autosave/submit và Candidate payload giữ nguyên; existing regressions và HTTPS suite kiểm tra các luồng đó. Bỏ các CSS shell/logo/nav cũ không còn consumer. Native elements giữ semantics và labels; màu không là tín hiệu duy nhất.

## Validation và evidence

Kết quả cuối ở [evidence](evidence/foundation-2026-10-07/README.md):

| Check                                  | Kết quả                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------- |
| Live/demo builds kèm TypeScript noEmit | PASS                                                                    |
| Root lint và quality/contracts         | PASS;46 operations/425 examples                                         |
| `npm test`                             | 202 PASS:89 API,37 tooling,76 Web                                       |
| Playwright Web, demo/live              | 16 PASS, gồm4 foundation cases                                          |
| Identity HTTPS thật                    | 10 PASS; API/PG/SMTP, snapshot live build cuối                          |
| Responsive                             | 16 screens ×5 widths =80 checks,0 body overflow                         |
| Axe                                    | 32 desktop/mobile scans +9 menu mở,0 serious/critical                   |
| Runtime                                | 0 page errors,0 requests ngoài local origins trong visual capture       |
| Motion/zoom                            | reduced-motion transition0s/animation none; CSS zoom200% không overflow |
| Diff whitespace                        | PASS                                                                    |

Đã xem ảnh thực tế của Candidate desktop/mobile-menu, Admin desktop, controls mobile và login mobile; sửa gutter của wrapper narrow/reading. Existing16-case suites giữ assertion, chỉ thêm tùy chọn evidence directory để không ghi đè31 ảnh lịch sử. Không đổi bytes migration hoặc domain/runtime backend.

Tests mới có reproduction RED cho Escape, router Back và field association/disabled. Một lần browser suite15/16 pass, ca select native dùng arrows không đổi popup trên headless macOS; diagnostic chứng minh typeahead chạy, test chuyển sang keyboard typeahead và không sửa UI để né lỗi.

## Giới hạn và tiếp theo

Các page bodies vẫn là implementation nghiệp vụ hiện có. Đợt2 sẽ áp bố cục/copy/CTA của các mẫu auth/dashboard/catalog/detail; đợt3/4 xử lý Assessment và Admin editor. Không đóng full FE-05/06 vì Drawer/SaveStatus/radio/checkbox showcase/full route-state matrix vượt scope đợt1. Chromium/axe và CSS zoom không chứng nhận WCAG hay native popup/thiết bị thật; không đo FPS/Core Web Vitals/conversion hoặc production capacity. Backend permission source và các API live còn gate riêng.

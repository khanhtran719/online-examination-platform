# Prompt bàn giao cho Grok 4.7

Copy toàn bộ phần bên dưới. Đính kèm repository và thư mục docs/web-ui; nếu không có repository, đính kèm thêm OpenAPI/product/security. Word count được ghi trong validation theo cách tách khoảng trắng, không tính heading/đoạn hướng dẫn này.

---

Bạn là Senior Frontend Engineer kiêm Product Designer. Hãy triển khai Web UI hoàn chỉnh cho Production-Grade Online Examination Platform trong repository được cung cấp. Tôi cần sản phẩm tương tác được, có trạng thái lỗi và kiểm chứng rõ ràng, không chỉ một landing page hoặc bộ ảnh mockup.

Trước khi code, đọc AGENTS.md, docs/project-profile.md, docs/web-ui/README.md, design-spec.md, api-and-state-contract.md, implementation-tasks.md, acceptance-checklist.md, docs/product-specification.md, docs/security-and-permissions.md và docs/contracts/openapi.yaml. Các file trong docs/web-ui là bộ bàn giao chính. Giữ Architecture Contract, ownership và public contracts. Không sửa backend, ORM, migrations hoặc AWS để làm UI trông như đã tích hợp.

Phong cách đã chốt là “phòng thi số”: sáng, chính xác, bình tĩnh. Nền #F4F7FA, surface trắng, chữ navy #14283F, teal #0F766E cho hành động, amber cho cảnh báo. Dùng Source Sans 3 cho heading, Noto Sans cho body, self-host fonts có tiếng Việt; system fallback nếu chưa có assets. Token hóa màu, spacing, typography, radius. Không gradient lớn, stock photo, carousel, fake KPI hoặc quá nhiều shadow.

Điểm nhận diện là bộ countdown, tiến độ, trạng thái lưu và bản đồ câu hỏi giống phiếu trả lời. Candidate dùng top navigation; phòng thi có layout riêng, câu hỏi là trung tâm; Admin dùng sidebar và bảng dữ liệu. Mobile một cột, timer/status sticky, navigator bottom sheet, controls không che nội dung. Tiếng Việt mặc định, câu hỏi tiếng Anh giữ nguyên. Kiểm tra320/390/768/1024/1440px.

Dùng React, TypeScript strict và Vite static SPA trong apps/web; React Router, TanStack Query cho server reads, CSS variables/CSS Modules. Chọn compatible pinned dependencies và bảo toàn root scripts. Output apps/web/dist, không ghi đè dist của API/migrations. Tách app bootstrap/shells, feature components/coordinators, typed API adapters và shared primitives. Không thêm SSR service, global god store hoặc nhiều thư viện cùng vai trò.

Hiện chỉ chín business API Identity chạy local; Catalog/Assessment/Reporting/Admin mới có contract. Triển khai hai chế độ rõ ràng: demo với synthetic data, banner “Dữ liệu mẫu”, scenarios có state transitions; live gọi đúng endpoints và hiển thị unavailable khi capability thiếu. Không fallback live lỗi sang mock. Mock assets và permission switches phải bị loại khỏi live build. Không báo full live/production chỉ vì demo hoạt động.

Hoàn thiện public home, register, login, check-email, resend, verification và profile. Login chỉ email/password; magic link/GitHub để sau, không fake nút hoạt động. Register generic202, không auto-login. Verification đọc fragment token, scrub URL, giữ memory, không analytics hoặc POST tự động. User chọn final password, explicit confirmation với anonymous CSRF; success quay ordinary login. Không làm reset password khi chưa có contract.

Access/refresh nằm trong Secure/HttpOnly cookies; không localStorage, URL, JSON tokens hoặc private keys trong frontend. Unsafe requests dùng fresh CSRF và browser Origin. Đồng bộ refresh single-flight giữa tabs bằng coordination được kiểm chứng; timeout sau rotation không blind retry token cũ. Logout xóa private caches. Profile chưa có permissions, nên live Admin phải blocked tới khi có authoritative capability; không decode JWT hoặc role switch để cấp quyền.

Candidate có dashboard, browse/category/cursor, detail/start confirmation, resume, câu hỏi, marks, autosave, countdown, submit, status, result/review, history và version leaderboard. Ba types dùng native radio/checkbox, prompt/options plain text. Không tải keys trước release. Metadata frozen của attempt không được thay bằng current exam version. API thiếu total/title/remaining attempts thì dùng fallback đúng scope và ghi dependency, không bịa fields hoặc N+1 mỗi row.

Autosave là phần correctness quan trọng nhất. Debounce500ms, dirty flush10s±20% jitter, batch1–20 distinct questions, một in-flight. Capture immutable key/body/versions và local sequence. Retry cùng UUIDv7 key/body với bounded backoff, honor Retry-After. Chỉ Saved sau ACK. Old ACK không xóa newer draft; versions cập nhật monotonically.409 giữ local intent, refetch và hỏi reconcile, không last-writer-wins. Marks và clear-answer cũng đi cùng pipeline.

Countdown dựa serverNow/deadline và monotonic elapsed, resync khi reconnect/visible; client clock không kéo dài giờ. Manual submit freeze edits, flush và đợi ACK; save lỗi khi còn giờ cho retry/cancel. Hết hạn stop new saves, nộp persisted answers, giữ warning phần unconfirmed. Submit không answer body; lost ACK dùng cùng key/status reconciliation. Không tạo lượt mới hoặc chấm điểm trong browser.

Status polling2→10s+jitter, honor server hints, pause hidden và dừng terminal/5 phút.202 result là pending success; không fake progress. Result dùng earned/possible/basis points, không IELTS band/TOEIC conversion. Review chỉ fetch khi được release. Leaderboard pseudonyms, đúng version, opt-in; không join danh tính thật. Cursor không có total/page number giả. Background refetch không overwrite dirty editor hoặc tạo request storm.

Admin gồm exam drafts/sections/membership/publish/unpublish/archive, question bank/editor, JSON import/dry-run/report, monitor/submissions/result/replay, statistics/metrics/audit. Permission theo capability, expectedRevision và stable mutation keys. Import chỉ JSON1MiB/1–100 entries, atomic; dry-run không committed. Replay cần reason/current revision; thiếu capability thì blocked live. Metrics thiếu dữ liệu không hiển thị0 hoặc charts/cost giả; audit read-only, không secrets/raw payload.

Thực hiện FE-01–32 theo thứ tự trong checklist, mỗi task giao files, behavior, checks, screenshots và data mode đã kiểm chứng. Làm foundations/Identity trước exam engine rồi results/Admin; tests cho auth, autosave, conflict, old ACK, deadline và lost acknowledgement trước polish. Loading/empty/error/offline/permission/conflict states đều phải có hành động rõ. Accessibility gồm keyboard, labels, focus/dialog, contrast, reduced motion và zoom; không dùng màu làm tín hiệu duy nhất.

Trong mỗi lát cắt, bắt đầu từ schema và acceptance, dựng state rồi mới nối controls. Mọi nút chính phải có tác dụng hoặc lý do unavailable rõ ràng. Dùng content tiếng Việt, thử tiêu đề dài, nhiều lựa chọn và dữ liệu rỗng. Nếu môi trường không có browser hay backend, ghi thiếu evidence thay vì tự đánh dấu pass. Giữ screenshot lỗi và conflict cạnh screenshot đẹp; reviewer cần thấy hệ thống phản ứng thế nào khi người dùng gặp sự cố.

Cuối cùng chạy actual typecheck/lint/build/component/coordinator/browser checks, kiểm tra HTTPS Identity khi môi trường cho phép, đo bundle/render/request budgets và review leaks. Giao runbook, screenshots, scenario IDs, raw results, checklist cập nhật và UI-GAP register. Ghi PASS/FAIL/BLOCKED/NOT RUN trung thực. Không tự bắt đầu ORM/AWS hoặc tuyên bố production readiness; mục tiêu là frontend chất lượng, demo đầy đủ, live integration rõ phạm vi và bằng chứng.

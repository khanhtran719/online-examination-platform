# Dọn artifact kiểm thử UI và quy định lưu trữ

Ngày2026-10-13. COMPLETE locally theo yêu cầu người dùng; đã xác nhận giữ template,
dọn artifact kiểm thử. Đây là maintenance, không thay đổi Architecture Contract,
API, behavior sản phẩm hoặc trạng thái nghiệm thu production.

- [x] Kiểm kê dung lượng, duplicate, nguồn artifact và các dependency/link.
- [x] Xác định scope: Web UI raw outputs và screenshots Identity; giữ template,
  concept thiết kế, source tests, báo cáo/quy chuẩn/runbook và dữ liệu benchmark
  backend cần cho các quyết định correctness/performance/cost.
- [x] Chuyển browser outputs về ignored local folders; chặn tích tụ trong docs.
- [x] Xóa artifact đã xác định, giữ reports và sửa links/thông báo retirement.
- [x] Quality/contracts/lint/type/list-tests và kiểm tra hash nguồn/template.

## Phạm vi và đánh đổi

`docs/web-ui/evidence` trước cleanup:7.564 files,636,22MiB logical size;
3.822 PNG,11 JPG,24 ZIP traces và nhiều gallery/probe/JSON/log/build snapshots.
1.258 duplicate binaries trong chính thư mục này chiếm169,53MiB dư thừa.
Approved `templates` riêng có91 PNG,82,58MiB tổng, không duplicate; giữ images,
prompts/manifests/assets nguyên bytes. Ba brief chỉ sửa link tới artifact đã thu hồi.
Không nhầm template làm screenshot kiểm thử, không xóa application assets/fonts.

Giữ README/review/result summaries bằng Markdown; bỏ raw DOM error-context,
gallery/PNG/JPG/trace/JSON/log/probe/asset copy/checksum của evidence UI đã đóng.
Screenshots Identity trong `docs/evidence` cũng bỏ; security/DB/benchmark receipts
còn lại giữ vì thuộc scope khác. Không xóa actual tests hay thay assertion.

Reports giữ kết quả đã chạy ở thời điểm bàn giao. Sau cleanup không còn raw visual
receipts trong checkout để độc lập đối chiếu ảnh/matrix cũ; không dùng report đó
làm current visual/production acceptance. Muốn đối chiếu thì rerun source tests
trên cùng source/config/environment, hoặc đọc bản file đã commit trong Git.
Không làm Git history rewrite/GC; xóa working-tree artifacts không làm lịch sử
Git/clone size giảm tương ứng và không là cam kết purge dữ liệu nhạy cảm.

## Artifact đã thu hồi

Các link tới raw output đã xóa được chuyển tới mục này, labels ghi rõ archived
hoặc retired thay vì giả rằng gallery/raw receipt vẫn tồn tại. Mỗi phase README
có notice; không sửa số PASS/FAIL cũ thành kết quả mới. Manifests/checksums đã xóa
không được tái tạo bằng danh sách rỗng rồi gọi là “verified”. Các summary/status
thành văn giữ tính lịch sử; production vẫn NOT ACCEPTED.

## Quy trình từ nay

Browser config mặc định ghi screenshots/probe JSON vào `.local/web-evidence/latest`
(Git ignored). Named PORT-05G/H/06A config dùng local phase folders và giữ tự quản lý
previews. Identity HTTPS outputs tiếp tục local như hiện có. Không xuất raw artifacts
vào docs để commit khi chạy regression bình thường. `WEB_EVIDENCE_DIR` có thể
chỉ định thư mục tạm ngoài tracked docs cho visual review; kiểm tra privacy trước
khi chia sẻ, xóa local artifacts sau khi review hoặc khi không còn cần.

PORT-06A config đặt cả JSON reporter, captures và Playwright `outputDir` vào
`.local/web-evidence/port-06a`. Full-page capture bắt đầu ở document origin để
fixed offscreen controls không hiện giả trong ảnh ở vị trí scroll cũ. Giữ source
test/config và [report](port-06a-2026-10-13.md), dọn raw sau review; không tạo gallery.

Trong docs chỉ lưu changes, findings, environment/commands, test counts/limits,
decisions, remediation và runbook. Templates do người dùng chốt có manifest và
lifecycle riêng. Production/benchmark evidence cần retention riêng, không dùng
cleanup này để bỏ capacity/cost/security/restore measurements.

## Kết quả kiểm tra

Đã xóa7.532 files,667.111.759 bytes (636,21MiB logical). Trong đó Web UI raw
outputs7.530 và Identity screenshots2. Web UI evidence còn34 Markdown reports,
không PNG/JPG/ZIP/JSON/log/gallery. Đã sửa483 file links và4 directory links tới
retirement notice;61 tài liệu bị ảnh hưởng trực tiếp có notice/link remediation.
Các status/profile/roadmap/acceptance docs cũng ghi raw receipts là historical.

Source/API/application assets/approved templates:807 protected files giữ SHA-256.
Ba template brief chỉ sửa links;91 template PNG và các concept thiết kế còn nguyên.
14 E2E test bodies khớp trước/sau sau khi chuẩn hóa destination literals và bỏ
import declarations; các import của file touched được sort theo lint hiện có.
Không skip/đổi selector/assertion/axe threshold để giảm artifact.

| Check | Kết quả mới cho cleanup |
| --- | --- |
| Root lint + quality/contracts | PASS;48 operations/445 examples |
| Root format + E2E format/touched lint | PASS |
| Web typecheck | PASS |
| Browser discovery | Base/PORT-05G/PORT-05H:70 tests/18 files; Identity:10 tests/1 file |
| Focused Chromium |4 PORT-05H cases PASS với new local output configuration |
| Output isolation |58 local outputs/28 captures,0 raw artifact được tạo lại trong docs |
| Source/template protection |807 files unchanged;14 test bodies unchanged |
| Diff/cleanup |git diff --check PASS; managed previews stopped |

28 local captures và probe metadata của lượt kiểm tra mới đã được kiểm chứng rồi
xóa cùng các raw outputs khác của lượt này. Chỉ giữ summary/log phục vụ tự-review
ở ignored `.local/artifact-cleanup-2026-10-13`, không commit thêm raw evidence.
Một lượt discovery sau focused run ghi đè JSON reporter trong local output; kết
quả4 PASS dựa trên full console receipt của actual run, không nhầm discovery0
thành run acceptance. Initial quality phát hiện4 links thư mục đã bị xóa; đã sửa.
Initial scoped check phát hiện import ordering trong E2E, chỉ normalize14 touched
files. Không thay architecture checker hoặc thêm suppression/baseline để lách lỗi.

Không rerun full933 unit/70 browser/10 actual HTTPS, build, DB integration hoặc
AWS trong cleanup: application/backend/source/templates không thay đổi và đây là
artifact-path/config/documentation maintenance. Historical test counts không phải
new results. Capacity/SLO/security/durability/cost và production vẫn NOT ACCEPTED.
Không commit, Git history rewrite, archive lên dịch vụ ngoài hoặc thay AWS resource.


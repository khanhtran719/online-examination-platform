# Questions & Import — Codex Desktop V1

**Root checkpoint2026-10-12:** đã nhìn trực tiếp tất cả 13 ảnh chọn cuối, giữ làm visual reference có port findings. [Review tổng](../../review-2026-10-12.md) và [gallery](../../gallery.html); không runtime/mobile/production acceptance.

Phạm vi: **13 ảnh desktop/dialog riêng**, mỗi ảnh đúng một trạng thái, mobile làm sau. Đã hoàn tất13 brief chức năng/style,13 prompt đứng độc lập và13 ảnh chọn cuối sau root prompt review/go-ahead. Đã dùng18calls built-in:13frames +5targeted corrections; giữ cả5originals lỗi tại `images/versions/`. Cả13ảnh đã xem trực tiếp; root đã review ảnh; chỉ giữ visual reference có findings. Không sửa app/API/schema/dependency/AWS, không thay template cũ, không chạy suite lớn, không commit/deploy.

## Kế hoạch và bằng chứng

1. Đọc AGENTS/project profile, design contract chung, prompt gốc EP-21–24, source Admin và OpenAPI; đã thực hiện.
2. Chuẩn hóa fixture công khai và mô tả từng frame, các input/actions/pending/error và chênh lệch current-vs-target; đã ghi trong brief/screens.
3. Root đã review13prompts và gửi internal go-ahead generation; đã thực hiện, không thêm permission người dùng.
4. Đã tạo8base pages và5overlays; new pages không truyền reference, dialog/correction đều xem ảnh nền và dùng đúng local path.5corrections vẫn bằng built-in, prompt nguyên văn lưu riêng.
5. PNG/prompt nguyên văn/local ID/dimensions thực/SHA256/source/review đều lưu screens.json. Đã sửa lỗi preview radio, counter58→60, Up state, JSON bị tool bịa và railactive; không dùng CLI/API.

[screens.json](screens.json) là manifest nhóm; [fixtures.json](fixtures.json) giữ dữ liệu coherent; [sample-import.json](sample-import.json) là lô JSON 3 câu hợp lệ. Mã Q-012…Q-015/BC-0101…0102 là label mẫu local; UUID thực nằm trong fixture. Không bịa ID Stitch.

| Local ID | Frame | Loại | Từ prompt |
|---|---|---|---:|
| `ep21-question-bank` | EP-21 — Ngân hàng câu hỏi | page | 1326 |
| `ep22-edit-single` | EP-22 — Sửa câu một lựa chọn | page | 1473 |
| `ep22-edit-multiple` | EP-22 — Sửa câu nhiều lựa chọn | page | 1472 |
| `ep22-edit-true-false` | EP-22 — Sửa câu Đúng–Sai | page | 1396 |
| `ep22-create-single` | EP-22 — Tạo câu một lựa chọn | page | 1401 |
| `ep23-json-input` | EP-23 — Chọn hoặc dán JSON | page | 1399 |
| `ep23-dry-run-valid` | EP-23 — Kiểm tra hợp lệ, chưa nhập | page | 1376 |
| `ep23-import-confirm` | EP-23 — Xác nhận nhập câu hỏi | dialog | 1353 |
| `ep24-committed-report` | EP-24 — Báo cáo nhập đã ghi ngân hàng | page | 1386 |
| `ep22-type-change-confirm` | EP-22 — Xác nhận đổi loại câu hỏi | dialog | 1340 |
| `ep22-archive-confirm` | EP-22 — Xác nhận lưu trữ câu hỏi | dialog | 1330 |
| `ep22-question-conflict` | EP-22 — Xung đột khi lưu câu hỏi | dialog | 1366 |
| `ep22-candidate-preview` | EP-22 — Xem câu hỏi như thí sinh | dialog | 1358 |

Tất cả word count dùng `len(prompt.split())`, nghĩa là từ tách bằng whitespace, không khẳng định token count hoặc từ vựng ngôn ngữ học. Mỗi prompt nằm trong khoảng 1000–1500 từ theo yêu cầu.

## Fixture và invariants

Bank có 4 câu: Q-012 IaaS SINGLE_CHOICE/10 điểm/bản3/key2; Q-013 bảo vệ quản trị MULTIPLE_CHOICE/15/bản2/key1+3; Q-014 mã hóa TRUE_FALSE/10/bản1/key1; Q-015 DNS archived SINGLE_CHOICE/5/bản4. Chỉ 4 câu đã tải, còn cursor, không số tổng toàn ngân hàng. Create DNS mới có2options/5điểm/key1, chưa mã/bản sửa.

Import có đúng3entries cloud-001/002/003, mỗi loại1, điểm10/15/10. Dry-run valid=true/committed=false/issues=[]/questions=[]; report thật valid=true/committed=true có3 mappings mới Q-016/017/018, UUID khác bank trước nhập. createdAt dry 12/10/2026 09:15 UTC+7, commit09:16 UTC+7. Atomic, không “đã nhập một phần”. Báo cáo chỉ mapping, không giả prompt/points/key trong DTO report. Conflict cùng Q-012 nhưng local points12/baseRevision3; remote revision/content chưa biết và không được bịa.

## Khác biệt current source và target thiết kế

Shared contract thắng khác biệt thị giác hiện tại: bank không phơi keys; current QuestionListPage có key column khi được quyền. Search/filter chỉ cục bộ trong items đã tải, không backend global search. Row Lên/Xuống/xóa, counters, stepper/download mẫu và bảng preview là mục tiêu prompt gốc, không khẳng định đã có handler. Source có add/remove option cuối, sidebar preview, archive/type-change/import-confirm dialogs. Candidate modal tái dùng projection prompt/options/type không key/explanation; hiện preview còn inline. Conflict hiện error inline giữ draft; dialog và read-only inspection bảo toàn draft là target, không force-save/auto-merge và không invent remote comparison. Những delta được ghi từng frame, không âm thầm biến thiết kế thành capability mới.

## Review

Pre-generation đã đối chiếu question limits1–1000điểm,2–10options,TRUE_FALSE2options/1key; import1MiB/schemaVersion1/1–100entries; dry-run/commit rõ; quyền đọc key riêng; frozen snapshots không sửa theo bank. Đã visual review cả13selected: tiếng Việt,rows/totals,radio/checkbox,key visibility,CTA/backdrop và đúng fixture nền. Kiểm metadata/SHA/wordcount/source paths bằng read-only script. Không chạy unit/e2e vì không đổi runtime. Lỗi business/capability phải sửa hoặc không giữ làm template đạt. Sai lệch nhỏ typography/icon/spacing ghi finding khi port. Không tick interaction/mobile/production từ ảnh.

Nguồn chính: [prompt EP-21–24](../../../../stitch-page-prompts-v3/06-admin-questions-import.md), [design contract](../../design-contract.md), `docs/contracts/openapi.yaml` (QuestionWriteRequest/AdminQuestion/ImportRequest/ImportReport và Catalog operations), Admin source/validation/tests ghi trong screens.json. Đã đọc `admin-workflows.unit.spec.ts` để kiểm chứng archive/type-change/import confirmation và oversized-file behavior; không cần chạy tests cho việc viết specification/ảnh.

## Kết quả generation và findings còn lại

Có13selected PNG và5superseded originals. Dimensions thường1536×1024; dry-run1486×1059, confirm import1487×1058, archive1448×1086. Đây là kích thước raster thật, không phải viewport được test. Built-in chỉnh ảnh có thể resample/reflow nền; fixture/câu hỏi/key/điểm/bản sửa giữ đúng, không claim pixel-identical.

Lỗi nghiệp vụ đã sửa: Multiple preview radio→4checkbox rỗng; Create explanation counter58→60 và Up hàng2 enabled; JSON cloud-001 đổi từ nội dung EC2 tự bịa sang literal fixture; nhập/report chọn đúng upload rail, bỏ iconcode; chấm TRUE_FALSE tím→muted. Prompt correction nguyên văn và original images được giữ, history/hashes/dimensions đầy đủ trong screens.json.

Finding nhỏ còn lại: bank chipmultiple hơi tím/rail rộng, vàiheader thấp; formfooter/counters sát nhau; một sốmodal hẹp hơn520–600px; importconfirmtype line sát mép; green statusbar dry-run hơi lớn. Khi port dùng design-contract/tokens làm nguồn số đo, không đo font từ raster. Conflict/Candidateoverlay và cáccontroltarget còn cần handler như ghi trong delta, chưa runtime proof. Selected business data/privacy đúng theo self-review; root visual review đã hoàn tất, runtime acceptance vẫn mở.

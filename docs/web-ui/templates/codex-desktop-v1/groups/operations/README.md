# Operations — Codex Desktop V1

**Root checkpoint2026-10-12:** đã nhìn trực tiếp tất cả 4 ảnh chọn cuối, giữ làm visual reference có port findings. [Review tổng](../../review-2026-10-12.md) và [gallery](../../gallery.html); không runtime/mobile/production acceptance.

Ngày 2026-10-12. Bốn màn desktop EP-25–28; **4/4 PNG đã tạo và review trực tiếp**, có findings nhỏ khi port. Chỉ sửa thư mục operations.

## Phạm vi và kế hoạch

1. Đọc AGENTS.md, project profile, brief07, design-contract, source Admin/Reporting, DTO/OpenAPI và test liên quan.
2. Viết một mô tả chức năng/style và prompt độc lập cho từng frame; fixture nhất quán, nguồn/phạm vi/freshness tách rõ.
3. Root review rồi mới tạo đúng một ảnh cho mỗi màn bằng công cụ imagegen tích hợp.
4. Giữ PNG, prompt nguyên bản, actual dimensions, SHA-256 và findings sau khi nhìn từng ảnh; sửa hoặc block lỗi dữ liệu/capability nghiêm trọng.

Không đổi app/backend/schema/dependency/AWS; không commit/deploy; không dùng Stitch hoặc API/CLI thay công cụ tích hợp. Mobile và ảnh riêng của các state phụ làm sau.

## Tệp màn hình

| ID | Chức năng | Mô tả | Prompt | Từ trong prompt |
| --- | --- | --- | --- | ---: |
| EP-25 | Tổng quan quản trị | [Brief](ep-25-admin-overview.brief.md) | [Prompt](ep-25-admin-overview.prompt.md) | 1395 |
| EP-26 | Chọn đề để giám sát | [Brief](ep-26-monitor-index.brief.md) | [Prompt](ep-26-monitor-index.prompt.md) | 1485 |
| EP-27 | Giám sát đề thi | [Brief](ep-27-exam-monitor.brief.md) | [Prompt](ep-27-exam-monitor.prompt.md) | 1445 |
| EP-28 | Bài đã nộp | [Brief](ep-28-submissions.brief.md) | [Prompt](ep-28-submissions.prompt.md) | 1491 |

Đếm từ bằng whitespace Unicode, gồm phần nhãn spec và yêu cầu hành vi. [screens.json](screens.json) là manifest riêng nhóm; [fixtures.json](fixtures.json) chứa dữ liệu công khai cố định. Local ID không phải Stitch ID.

## Nguồn và quyết định

- [Hợp đồng thiết kế](../../design-contract.md): Cobalt–Apricot, header 68px, rail icon-only 72px, Be Vietnam Pro, main bảng full width, desktop trước.
- [Brief07](../../../../stitch-page-prompts-v3/07-admin-overview-monitor-submissions.md): bốn màn mục tiêu.
- [OpenAPI](../../../../../contracts/openapi.yaml) và source references từng màn trong manifest xác định allowlist, quyền, scope/freshness.
- EP-25 dùng **implemented** Reporting /v1/admin/business-metrics và reporting.read. AdminHomePage hiện chưa nối endpoint; old combined Metrics parser không dùng. Counts là trạng thái hiện tại của start-time cohort, completed/failed là subset submitted, không funnel cộng trạng thái.
- EP-26 list có revision; nhãn Bản sửa không bịa numeric published version. Không có per-exam active counts hoặc server filters. Catalog list Tải lúc là client receipt time.
- EP-27 scope qua mọi frozen version của exam; không có version field/filter theo row. Active metadata.asOf là DB statement timestamp. Web hiện dùng client dataUpdatedAt và shared Page/parsePage chưa hỗ trợ active asOf; ghi port requirement, chưa sửa code.
- EP-28 ledger bao gồm cả chưa nộp, helper nói rõ. Filter text publishedVersionId có thật, không dropdown version bịa. Nullable score là Chưa có điểm; submissions metadata không có asOf.
- Admin live capability discovery vẫn thiếu trong source; hình chỉ là target và demo public fixture, không chứng minh browser integration.

## Fixture và tính nhất quán

asOf 15/11/2026 10:00 UTC+7, cohort 14/11 10:00 đến trước 15/11 10:00. Primary Cloud exam giữ revision 4, 90 phút, lịch 15/11 08:00–12:00, 3 phần/6 câu/100 điểm và tối đa 3 lượt; khác canonical editor ở published=true, hai frozen versions và 10 retained attempts.

Bốn active ở f002 có deadlines 10:05–10:20 đều lớn hơn asOf. Sáu lượt f001 đã nộp gồm 2 completed, 1 submitted, 1 processing, 1 expired, 1 failed. Completed 90/100 và 70/100; bốn score null. expired chỉ a003. Overview 4/6/2/1 không cộng thành 13; started 10. Hai đề Catalog phụ không có attempt trong cohort fixture, nhưng không render số active vì list endpoint không có field.

## Checklist và validation

- [x] Bốn prompt độc lập trong khoảng 1000–1500 từ, mô tả riêng cho mỗi ảnh.
- [x] Đối chiếu field, permission, timestamp/source scope và target-vs-current Web.
- [x] Fixture: sums/subsets, score null, version scope, order và started/deadline/asOf.
- [x] Không PII, online presence, chart/history/cost/SLO, unsupported filters, force submit hoặc fake total.
- [x] Root duyệt prompt và cho phép bắt đầu generation nội bộ.
- [x] Bốn PNG tạo bằng imagegen tích hợp, actual dimensions và SHA-256.
- [x] Review trực tiếp từng ảnh; 0 severe data/capability errors, minor port findings ghi rõ.
- [ ] Mobile, state variants và runtime/interaction checks: ngoài phạm vi đợt này.
- [ ] Production acceptance: không xác lập từ ảnh.

Validation đợt tài liệu đã chạy và PASS: JSON parse; link/file/source references tồn tại; word counts 1395/1485/1445/1491; UUIDv7 fixture; order theo startedAt; thời lượng mỗi lượt 90 phút; started/deadline/asOf; version scope; score null; cohort subsets; tổng 6 câu/100 điểm. Không chạy unit/integration/browser tests vì không sửa runtime hoặc contract. Existing tests được đọc để đối chiếu semantics, không ghi là đã rerun.

## Kết quả và giới hạn

4/4 PNG, 4 calls built-in, 0 edit/retry; mỗi output raster thật 1448×1086, không phải viewport đã test. [Visual review](review.md) ghi kết quả từng màn và findings nhỏ về rail/header/logo/tỷ lệ card. SHA-256 ảnh/prompt và original output paths có trong screens.json. Source-supported target additions là công việc port sau, chưa phải implementation đã giao. Mobile/state variants/runtime và production acceptance còn ngoài phạm vi.


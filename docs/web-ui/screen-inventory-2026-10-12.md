# Danh mục màn hình và phần còn thiếu — 2026-10-12

**Checkpoint lựa chọn mới nhất:** người dùng đã tạm chốt [ba main references điều chỉnh EP-14/EP-15/EP-19](templates/codex-desktop-adjustments-2026-10-12/selection.md). Hiện33/33 page families có named visual reference,0 main references chờ chọn,0 prompt-only. Bộ35 references trước giữ nguyên, ba ảnh mới nằm trong bundle riêng. Mobile/full variants/states và application port vẫn mở; các counts30/3/0,16/4/13 phía dưới giữ lịch sử.

**Checkpoint mới sau inventory:** [Codex Desktop V1](templates/codex-desktop-v1/README.md) giữ 35 ảnh chọn cuối, gồm 34 frame mới và preflight đã chọn. Registry hiện 30 families có named visual reference/3 main references review chờ chọn/0 prompt-only. [Review và checklist còn lại](templates/codex-desktop-v1/review-2026-10-12.md) ghi rõ mobile, full variants/states và port chưa đóng. Các con số 16/4/13 và thứ tự Stitch bên dưới là lịch sử trước đợt Codex.

**Cập nhật sau inventory:** [Review05B-1](stitch-05b1-review-2026-10-12.md) đã hoàn tất cho cả3 frame, có findings mở; chưa chọn/lưu template hoặc port. Các phần “chưa review” dưới đây là checkpoint lúc phát hiện preview, được thay thế bởi kết quả review này. Nhóm kế vẫn05B-2 sau quyết định giữ hướng mẫu.

**Có 33 nhóm màn sản phẩm: 16 đã chốt template, 4 đã review chờ chọn, 13 chưa có template được lưu/review.** Chưa nhóm nào được nghiệm thu port sang bộ Cobalt–Apricot mới chỉ từ các con số này. [Review giao diện đang chạy](template-alignment-review-2026-10-12.md) ghi khoảng trống triển khai riêng.

Lượt kiểm tra này đối chiếu [registry](stitch-page-prompts-v3/page-registry.json), 5 manifest template, file ảnh thực tế, các review/implementation notes, router và tab Stitch của project `18257628123124303955`. **Phát hiện mới: ba preview 05B-1 đã có trên Stitch**, dù tài liệu cũ ghi mới chuẩn bị prompt. Không gửi lại prompt tạo 05B-1. Chúng chưa được xuất/lưu thành template hoặc review đầy đủ.

## 1. Quy ước và số lượng

| Đơn vị | Kết quả | Ý nghĩa |
| --- | --- | --- |
| Nhóm màn sản phẩm | 33 | EP-01–32 và SY-01/404; một editor có thể có nhiều route/bước |
| Route pattern | 39 | Khớp router khi giải quyết prefix `/admin`; gồm create/edit, 3 alias/redirect và `/dev/ui` |
| Nhóm đã chốt template | 16 | Có mẫu thị giác đã lưu; không khẳng định đủ variants/states hoặc port xong |
| Nhóm đã review chờ chọn | 4 | EP-14/15/19/20; 05B-1 mới là phần bổ sung cho EP-20 |
| Nhóm chưa có template lưu/review | 13 | EP-21–32 và SY-01; giữ nghĩa coverage chưa xác minh, không khẳng định chưa bao giờ được tạo ở nơi khác |
| PNG template hiện hành | 38 | 18 desktop +20 mobile, gồm cả dialog/state; không phải 38 nhóm màn |
| Shared state families | 6 | SY-02–07 bổ sung cho các trang; không cộng thành nhóm trang mới trong tổng33 |

Đã kiểm tra toàn bộ38 PNG tồn tại và SHA-256 khớp manifest; các đường dẫn reference trong registry đều tồn tại. [Evidence](evidence/screen-inventory-2026-10-12/README.md) giữ kết quả cùng quan sát Stitch. Không dùng số frame canvas để suy số trang hoàn thành.

## 2. Mười sáu nhóm đã chốt mẫu

Dấu `[x]` trong bảng chỉ xác nhận **đã lưu template thị giác**, không đóng implementation hoặc toàn bộ coverage.

| Mẫu đã lưu | ID | Màn | Desktop/mobile đã lưu | Phần bổ sung còn mở |
| --- | --- | --- | --- | --- |
| [x] | EP-01 | Home | V3 / V3 | States và responsive/interactions khi port |
| [x] | EP-02 | Bảng làm việc | V2 / V3 | Không có lượt đang làm, lịch sử rỗng, lỗi từng vùng |
| [x] | EP-03 | Phòng thi | V3 / V3; mobile question sheet | Dạng câu, lưu/conflict, mất mạng, hết phiên/hết giờ, submit/exit và states còn thiếu |
| [x] | EP-04 | Đăng nhập | Auth V3 / V3 | Form pending, validation, sai credentials, rate limit, network error |
| [x] | EP-05 | Đăng ký | Auth V3 / V3 | Form pending/error, validation, tên/email dài |
| [x] | EP-06 | Kiểm tra email | Auth V3 / V3 | Resend ready/cooldown/pending/error, nhập email khi thiếu |
| [x] | EP-07 | Xác thực email | Auth V3 / V3 | Tách valid/pending/expired/success/session conflict thành states hợp lý |
| [x] | EP-08 | Danh sách đề | Normal V4 / V4; thêm7 mobile states | 7 desktop counterparts; findings02B và shell consistency |
| [x] | EP-09 | Chi tiết đề/bắt đầu thi | Normal V4 / V4; start confirmation hai viewport | 7 mobile +7 desktop states chi tiết ở mục5 |
| [x] | EP-10 | Hồ sơ | Normal V4 / V4; profile conflict hai viewport | 7 mobile +7 desktop states chi tiết ở mục5 |
| [x] | EP-11 | Trạng thái bài nộp | Desktop Processing V4 | Mobile; chưa có ACK, hoàn tất, FAILED, replay requested, chờ lâu/lỗi tải |
| [x] | EP-12 | Kết quả | Desktop Completed V4 | Mobile; pending, nộp hết giờ, review chưa mở, lỗi tải |
| [x] | EP-13 | Xem lại bài | Desktop Released review V4 | Mobile; thu hồi quyền xem, loading/retry/paging, lời giải trống |
| [x] | EP-16 | Trải nghiệm mẫu | Desktop Single choice selected V4 | Mobile; multiple choice, true/false, rà soát và kết quả mẫu |
| [x] | EP-17 | Cách hoạt động | Desktop Guide V4 | Mobile và supplementary states |
| [x] | EP-18 | Trợ giúp | Desktop FAQ expanded V4 | Mobile và supplementary states |

Nguồn: [V3](templates/stitch-v3/README.md), [Auth](templates/auth-v3/README.md), [Catalog/Profile](templates/catalog-profile-v4/README.md), [Results](templates/results-v4/README.md), [Public](templates/public-v4/README.md). Các findings đã hoãn vẫn mở; đặc biệt bảng mô phỏng/handoff hoặc mô tả state nằm chung một ảnh không thay cho frame trạng thái hoàn chỉnh.

## 3. Bốn nhóm đã review nhưng chưa chọn template

| Chưa chốt | ID | Màn | Bằng chứng hiện có | Còn làm |
| --- | --- | --- | --- | --- |
| [ ] | EP-14 | Lịch sử thi | Desktop Loaded đã review | Chọn mẫu; sửa phân bố cột/badge/shell khi port; mobile, loading/empty/error/stale/loadmore |
| [ ] | EP-15 | Bảng xếp hạng | Desktop Loaded đã review | Chọn mẫu; thống nhất rail/brand; mobile, empty/disabled/forbidden/paging/error |
| [ ] | EP-19 | Admin — Danh sách đề | Desktop Loaded05A đã review | Chọn mẫu; menus/permission, mobile, loading/empty/error |
| [ ] | EP-20 | Admin — Tạo/sửa đề | Hai bước Edit05A đã review; thêm3 preview05B-1 quan sát ngày12/10 | Review/lưu/chọn05B-1; chốt05A; Create, mobile, các dialog/states còn lại |

Không cần tạo lại bốn nhóm từ đầu. [03B review](stitch-03b-review-2026-10-08.md) và [05A review](stitch-05a-review-2026-10-08.md) giữ findings. EP-20 có ba bước: Thông tin → Phần & câu hỏi → Kiểm tra & phát hành. Hai route Create/Edit không được tính thành hai nhóm màn mới.

## 4. Mười ba nhóm chưa có template được lưu/review

| Còn mở | ID | Màn | Route chính | Yêu cầu đáng chú ý |
| --- | --- | --- | --- | --- |
| [ ] | EP-21 | Ngân hàng câu hỏi | `/admin/questions` | Danh sách, search/filter trong phần đã tải, tải thêm và permission |
| [ ] | EP-22 | Tạo/sửa câu hỏi | `/admin/questions/new`, `/admin/questions/:questionId/edit` | Create/Edit; single choice, multiple choice, true/false; đáp án/điểm/lời giải và validation |
| [ ] | EP-23 | Import câu hỏi JSON | `/admin/imports/new` | Chọn/dán JSON → preview/dry-run → xác nhận; lỗi có vị trí, giới hạn payload |
| [ ] | EP-24 | Báo cáo import | `/admin/imports/:importId` | Kết quả, lỗi từng dòng/mục, retry/status phù hợp contract |
| [ ] | EP-25 | Tổng quan quản trị | `/admin` | Business metrics có phạm vi/thời điểm; loading/error/unavailable |
| [ ] | EP-26 | Danh sách kỳ thi cần giám sát | `/admin/monitor` | Chọn đề/version và điều hướng đúng scope |
| [ ] | EP-27 | Giám sát một kỳ thi | `/admin/exams/:examId/monitor` | Active candidates/trạng thái và freshness; không tạo realtime guarantee |
| [ ] | EP-28 | Danh sách bài nộp | `/admin/exams/:examId/submissions` | Nullable score, lifecycle, paging, permission |
| [ ] | EP-29 | Chi tiết lượt thi/xử lý lại | `/admin/attempts/:attemptId` | Scoring status; replay có lý do, xác nhận và pending/error |
| [ ] | EP-30 | Thống kê câu hỏi | `/admin/exams/:examId/versions/:versionId/statistics` | Đúng frozen version; denominator/zero-data/freshness |
| [ ] | EP-31 | Metrics | `/admin/metrics` | Phạm vi/chỉ số/nguồn thật; technical metrics chưa có provider phải unavailable |
| [ ] | EP-32 | Audit log | `/admin/audit` | Danh sách, filter/paging và detail drawer; trường dữ liệu theo permissions |
| [ ] | SY-01 | 404 — Không tìm thấy trang | `*` | Desktop/mobile và đường quay lại phù hợp session |

Brief đã có: [06 Questions/Import](stitch-page-prompts-v3/06-admin-questions-import.md), [07 Operations](stitch-page-prompts-v3/07-admin-overview-monitor-submissions.md), [08 Reports](stitch-page-prompts-v3/08-admin-attempt-statistics-metrics-audit.md), [09 Shared](stitch-page-prompts-v3/09-shared-states-handoff.md). Cần chia lượt nhỏ khi thực hiện; prompt chuẩn bị không chứng minh có frame.

## 5. Các biến thể còn thiếu trong những nhóm đã có màn chính

### Admin05B

**05B-1 đã có3 preview desktop1280px**, được xác nhận qua DOM iframe, heading và screenshot overview:

| Preview đã thấy | Screen ID | Trạng thái |
| --- | --- | --- |
| Rà soát trước khi phát hành | `bef67930ab4e4b5e93f17f82d06d7193` | Observed; chưa review đầy đủ/chọn/lưu template |
| Xác nhận lưu và phát hành | `8bdb6a1a0a4c4814a9017994e6f05355` | Observed; chưa review đầy đủ/chọn/lưu template |
| Validation: cần sửa2 mục | `3a591de37dfc4248b3151e7ffe17725d` | Observed; chưa review đầy đủ/chọn/lưu template |

Canvas còn hiện nhãn “Generating Screen...” trên các node này dù iframe đã có nội dung. Không dùng nhãn placeholder đó làm kết luận render chưa có; cũng không suy ra toàn bộ generator đã hoàn tất. Không click các CTA mockup để thực hiện nghiệp vụ.

- [ ] Review đầy đủ05B-1, đối chiếu fixture/layout/copy và xuất/lưu bản tham chiếu được chọn.
- [ ] 05B-2: gỡ phát hành, lưu trữ đề, bỏ phần có câu — 3 desktop frames chưa được kiểm chứng.
- [ ] 05B-3: rời editor có thay đổi chưa lưu, xung đột bản nháp — 2 desktop frames chưa được kiểm chứng.
- [ ] Create variant của editor; mobile; saving/saved/error/unconfirmed/permission states.

### Catalog/Profile02B

Danh sách đề đã có7 mobile states: Loading, Empty category, Search no match, Error, Load more pending, Load more error, Filter sheet. Không tạo lại chúng.

- [ ] **Danh sách đề:** 7 desktop counterparts.
- [ ] **Chi tiết đề:** Resume, Not open, Closed, Attempt limit, Start pending, Start error, Start unconfirmed — 7 mobile +7 desktop.
- [ ] **Hồ sơ:** Edited, Saving, Saved, Save error, Name validation error, Save unconfirmed, Unsaved exit confirmation — 7 mobile +7 desktop.

Tổng riêng backlog02B là **35 frame đối ứng**: 14 mobile +21 desktop; không cộng chúng vào số33 nhóm màn. Start confirmation và Profile conflict hai viewport đã lưu riêng, không tính lại là thiếu.

### Các nhóm khác

- [ ] Auth: tách states theo [AUTH-02/04/05](templates/auth-v3/implementation-notes.md); form submitting/error/rate-limit, resend/cooldown, expired/success/session conflict.
- [ ] Results/History/Leaderboard: mobile cho cả5 nhóm EP-11–15 và các variants trong [brief03](stitch-page-prompts-v3/03-results-history-ranking.md).
- [ ] Public: mobile cho EP-16–18; sample multiple choice/true-false/review/result. Main desktop đã có, không regenerate.
- [ ] Home/Dashboard/Exam: empty/error/network/conflict/deadline/submit/exit và question-type coverage. Question sheet mobile V3 đã có; phần sửa/coverage bổ sung vẫn cần đối chiếu findings.
- [ ] Admin Questions/Import/Operations/Reports: mobile và loading/empty/error/permission/pending/conflict theo từng trang, sau desktop.

## 6. Shared states và handoff

| Còn mở | ID | Nhóm state cần hoàn thiện |
| --- | --- | --- |
| [ ] | SY-02 | 403 — Thiếu quyền |
| [ ] | SY-03 | Unavailable/loading/empty/error, retry/cooldown và stale có thời điểm |
| [ ] | SY-04 | Hết phiên đăng nhập ngoài/trong phòng thi; timer không dừng |
| [ ] | SY-05 | Pending/Saving/Saved/Retrying/Offline/Unconfirmed và answer conflict |
| [ ] | SY-06 | Submit/submit pending/unconfirmed/exit; question sheet và states cần sửa |
| [ ] | SY-07 | Dialog Admin còn thiếu: đổi loại câu hỏi, replay có lý do, audit drawer và biến thể lỗi/pending |

Một số ví dụ đã tồn tại trong template/handoff; bảng trên không khẳng định toàn bộ chưa có. Tái sử dụng phần đã chốt, tạo đúng phần còn thiếu. Publish/profile/start/question-sheet đã quan sát hoặc lưu không được yêu cầu tạo trùng.

- [ ] Handoff cuối cùng: tokens/components, focus/hover/disabled/loading/error, responsive và page/state index đã đối chiếu. Đã có board/spec/brand hiện hành; cần hợp nhất coverage, không dựng lại design system từ đầu hoặc đặt ghi chú kỹ thuật lên sản phẩm.

## 7. Thứ tự tiếp theo đã điều chỉnh

1. **Review/lưu/chốt05B-1 đang có**, thay cho đề xuất cũ “gửi prompt05B-1”.
2. Tiếp05B-2,05B-3 sau khi đối chiếu frame thật; xử lý việc chọn mẫu03B/05A theo hướng đã review.
3. Hoàn thiện desktop nhóm06 →07 →08 →09, gồm Create variants còn thiếu.
4. Bổ sung mobile/dialogs/states; đối chiếu coverage và thống nhất shell theo DashboardV2/mobileV3.
5. Port shared foundation và từng nhóm trang theo kế hoạch; visual, chức năng/API và production acceptance có bằng chứng riêng.

Lượt này chỉ kiểm tra/cập nhật tài liệu. Không gửi generation/refinement, chọn mẫu thay người dùng, sửa application, chạy AWS hoặc tick roadmap implementation. Không có unit/E2E/axe mới vì không đổi code. Kiểm tra links/contracts, số lượng/route/reference hashes và whitespace được ghi trong [evidence](evidence/screen-inventory-2026-10-12/README.md).

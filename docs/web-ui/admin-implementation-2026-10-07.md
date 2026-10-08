# Web UI đợt4 — Quản trị

## Phạm vi và kế hoạch

Tiếp tục sau đợt3 theo yêu cầu user: Admin overview, exam list/editor, question bank/editor, JSON import/report, monitor index/exam, submissions/attempt, statistics, metrics và audit. Kế thừa bộ mẫu secondary-pages và hướng “Không gian nổi”; không đổi Identity/Candidate/exam-room hoặc backend work đang có trong workspace. Baseline HEAD80710f5 cộng các thay đổi đợt2/3 và Assessment core chưa commit.

Owner: browser Admin. READ qua Catalog/Reporting APIs hiện có, WRITE qua existing draft/question/import/publish/archive/replay callbacks và intent machine. Backend là authority cho quyền, revision, immutable publications và results. Không endpoint, migration, transaction, event, dependency, fabricated metrics hoặc permission source mới. Live Admin tiếp tục bị chặn khi chưa có nguồn quyền authoritative.

Art direction: navy/mint, Source Sans3 display + Noto Sans body, thẻ giấy nổi làm điểm nhận diện ở overview; các trang thao tác dùng bảng/panel rõ và ít trang trí. Editor gồm3 vùng thông tin/cấu trúc/kiểm tra, picker riêng thay vì lặp bank trong từng phần, summary local có nhãn bản nháp. Import tách kiểm tra dữ liệu và xác nhận ghi. Metrics/statistics chỉ minh họa đúng snapshot/count API trả; audit read-only.

- [x] Regression trước đổi hành vi cho editor steps/picker, native keys/type conversion, protected editor và import confirmation/file bounds; thêm RED trước xác nhận archive question.
- [x] Overview/lists và editor presentation, giữ intent/revision contracts.
- [x] Import/report, monitor/submissions/attempt, statistics/metrics/audit.
- [x] Unit/typecheck/build/lint, browser critical admin actions, visual5 widths/axe.
- [x] Self-review, cập nhật status/evidence và preview.

## Kết quả

Hoàn thành named scope đợt4, kiểm tra cuối ngày **2026-10-08** trên branch `codex/web-ui-admin`, chưa commit. Có14 page exports Admin; create/edit là trạng thái của cùng editor. Các đợt visual chỉ đóng named scope, không tick full FE22–28/live/production từ ảnh.

## Thay đổi và lỗi được sửa

- Overview dùng giấy/bút CSS3D có entrance hữu hạn và task shortcuts lọc theo quyền mẫu. Bảng đề/ngân hàng, monitor/submissions/audit có header rõ, status bằng chữ, vùng cuộn keyboard và cursor “Tải thêm”; không tính tổng từ partial pages.
- Exam editor có3 bước giữ state, summary của bản nháp và picker chung. Câu đã dùng trong phần khác bị khóa; thêm/reorder/bỏ vẫn tạo membership positions/points theo payload cũ. Đổi edit route remount đúng đề/revision;403 gỡ form và query payload. Thanh hành động đặt sau form để không che trường nhập.
- Question editor dùng radio/checkbox native cho keys, preview chỉ nhận prompt/type/options, không nhận keys/explanation. Đổi loại gây mất keys/options cần xác nhận; câu TRUE_FALSE giữ2 options. Archive có xác nhận riêng, giữ revision hiện tại.
- Import kiểm tra `File.size` trước `file.text()`, xử lý lỗi đọc tệp, giữ giới hạn UTF-8 phía validator. Dry-run chưa ghi; thay nội dung vô hiệu kết quả kiểm tra. Commit cần xác nhận riêng và logical key mới; retry unknown outcome vẫn giữ frozen key/body.
- Phát hành bản đã lưu và lưu rồi phát hành có copy/confirmation riêng. Gỡ phát hành, archive và replay giữ callback cũ. Review Admin hiển thị choices, lựa chọn của thí sinh, keys và giải thích chỉ qua capability hiện có. Replay ACK không được hiển thị thành chấm xong.
- Statistics dùng denominator hoàn thành của đúng frozen version, mẫu0 ghi “Chưa có mẫu”. Metrics dùng snapshot/asOf, giữ rõ missing fields; audit chỉ đọc safe DTO. Mã rút gọn có đầu và đuôi để phân biệt UUID cùng prefix.

Files chính nằm trong `apps/web/src/features/admin`: các file cũ là barrels; page/component/hook tách theo trách nhiệm, style trong `admin.module.css`. Hai suites mới ở `features/admin/__tests__/admin-workflows.unit.spec.ts` và `apps/web/e2e/admin-workflows.e2e-spec.ts`.

## Validation và self-review

| Kiểm tra | Kết quả quan sát |
| --- | --- |
| Root `npm test` |224 PASS:94 API +37 tooling +93 Web /23 Web files |
|7 regression Admin mới |6 RED trước implementation,1 archive RED bổ sung;7 GREEN |
| Default Playwright Chromium |24 PASS,0 skipped/flaky/retries;4 Admin flows mới |
| Typecheck + demo/live builds |PASS; TypeScript chạy trong cả hai builds |
| Root lint/quality/contracts |PASS;46 operations /425 examples không đổi |
| Visual layout |31 trạng thái ×5 widths320/390/768/1024/1440 =155 probes,0 document overflow |
| Axe |62 scans ở390/1440,0 serious/critical; không phải chứng nhận WCAG |
| Runtime capture |0 page errors,0 external requests |
| Reduced motion + CSS zoom200% |overview/editor/metrics không running animation và không tràn; CSS zoom không phải browser zoom |

Self-review theo R-58/R-59 và workflow47/48: owner browser Admin; dùng read/write contracts hiện có. Không có thay đổi API/schema/migration/transaction/event, không thêm dependency hoặc client-side permission source. [Manifest](evidence/admin-2026-10-07/manifest.json) so sánh AST:11 command/poll blocks giữ nguyên; question archive chỉ thêm null guard khi tách hook, UI confirmation đứng trước callback. `gate.tsx`, intent machine và tất cả source ngoài Admin giữ SHA từ đợt3. Backend dirty work và các đợt UI trước được giữ.

## Bàn giao và phần còn mở

[Evidence đầy đủ](evidence/admin-2026-10-07/README.md), [overview](evidence/admin-2026-10-07/screenshots/overview-1440.png), [editor desktop](evidence/admin-2026-10-07/screenshots/exam-information-1440.png), [question mobile](evidence/admin-2026-10-07/screenshots/question-multiple-390.png), [metrics](evidence/admin-2026-10-07/screenshots/metrics-1440.png).

Preview demo local `http://127.0.0.1:4173/login?return=%2Fadmin`: dùng `candidate@example.test` / `fixture-password-ok`, mở “Kịch bản mẫu” và chọn “Quản trị”. Dữ liệu chỉ trong bộ nhớ demo, reload mất phiên. Live Admin vẫn bị chặn theo UI-GAP-06 vì chưa có authoritative permissions/replay revision. Identity HTTPS10 và PostgreSQL integration không chạy lại trong đợt này. Firefox/WebKit, Admin browser lost-ACK/conflict matrix, keyboard option reorder, full WCAG/CWV và production/AWS acceptance còn mở trong FE tasks.

Bước tiếp theo là chốt contract/capability nguồn quyền Admin live và nối Reporting, rồi chạy acceptance matrix với API thật. Không cần thêm motion vào khu vực thi hoặc tạo số liệu để lấp khoảng trống.

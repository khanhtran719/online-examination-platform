# Evidence — Review05B-1, 2026-10-12

[Báo cáo/findings](../../stitch-05b1-review-2026-10-12.md). Browser Chrome, project Stitch `18257628123124303955`; đọc DOM và chụp canvas. Không gửi prompt generation/refinement hoặc click CTA Lưu/Phát hành của mockup.

| Màn | Logical iframe | DOM evidence | Canvas capture |
| --- | --- | --- | --- |
| Ready `bef67930ab4e4b5e93f17f82d06d7193` | 1280×1482 | [Text/buttons/styles](preflight-ready-dom.json) | [Ảnh toàn frame ở khoảng47%](preflight-ready-fit-canvas.jpg) |
| Confirmation `8bdb6a1a0a4c4814a9017994e6f05355` | 1280×1024 | [Text/background/buttons/styles](publish-confirmation-dom.json) | [Ảnh centered ở khoảng69%](publish-confirmation-centered-canvas.jpg) |
| Validation `3a591de37dfc4248b3151e7ffe17725d` | 1280×1492 | [Text/disabled controls/styles](validation-blocked-dom.json) | [Ảnh toàn frame ở khoảng47%](validation-blocked-fit-canvas.jpg) |

[Capture metadata Ready/Validation](fit-capture-metadata.json), [capture metadata Confirmation](confirmation-centered-capture-metadata.json), [canvas context](review-canvas-context.jpg), [primary control metrics ở2 frame đọc được](visual-metrics-visible-frames.json), [manifest/SHA-256](manifest.json). Ảnh là browser screenshots, không phải PNG nguồn được export. Các exploratory capture bị che/cắt được chuyển vào `.local`, không dùng làm evidence chính.

Body text đọc bằng DOM bao gồm background sau backdrop; nó xác nhận dialog foreground và background thuộc hai fixture khác nhau. Logical width1280px không có nghĩa ảnh canvas ở độ phân giải1:1. Metadata nêu zoom và bounds; phần typography/interaction chưa được nghiệm thu từ các ảnh này.

## Checks

- [x] Đúng3 IDs đã ghi ở inventory; iframe widths1280px và heights1482/1024/1492.
- [x] Ready6 câu/100 điểm; Validation4 câu/70 điểm; validation save/publish disabled, back enabled trong HTML mockup.
- [x] Đối chiếu brief, current Web source và contract; ghi metadata/capability/counter/background findings.
- [x] `npm run quality` — PASS; local links/boundaries và contracts (48 operations, 445 examples).
- [x] `git diff --check` — PASS; protected-file diff trống cho `apps`, `.ai`, dependencies và templates đã lưu.
- [x] Kiểm tra SHA-256 và kích thước — khớp cả 10 file trong manifest; registry giữ 33/16/4/13 và cả ba preview chưa được chọn làm template.

XuấtZIP qua UI không được xác nhận: download event chờ20s không trả file, kiểm tra Downloads không có ZIP mới. Không dùng việc bấm Export làm bằng chứng tải xong. Có một phép đọc DOM dùng `parseFloat` không được runtime hỗ trợ; sau khi sửa phép đọc, metric selector ở iframe Validation ngoài vùng preview cũng hết thời gian. Chỉ lưu2 frame primary metrics đọc được, không suy ra typography/contrast toàn bộ.

Không chụp hoặc lưu credential/cookie/token, không sửa app/template cũ/dependency/schema/API, không acceptance production. Prototype save/publish, focus trap/keyboard, mobile, retries hoặc persistence chưa được chạy. User-owned tab giữ mở; việc chọn frame/zoom chỉ phục vụ quan sát.

# Runbook giao diện web

Ngày 2026-10-07. Đây là SPA tĩnh React 19.3.0, TypeScript 5.9.2, Vite 8.3.3 trong `apps/web`. Không có SSR. Không phải bằng chứng production, cookie Secure hay AWS.

## Cài và lệnh

Từ gốc repository, sau khi đã có `apps/web/node_modules`:

```text
npm --prefix apps/web install --ignore-scripts
npm run web:dev          # demo, http://127.0.0.1:5173
npm run web:dev:live     # live, cùng cổng
npm run web:typecheck
npm run web:lint
npm run web:test
npm run web:build        # apps/web/dist
npm run web:build:demo   # apps/web/dist-demo
```

Browser:

```text
cd apps/web
./node_modules/.bin/vite preview --host 127.0.0.1 --port 4173 --mode demo --strictPort
./node_modules/.bin/vite preview --host 127.0.0.1 --port 4174 --mode live --strictPort
./node_modules/.bin/playwright test
```

`npx vite` ở gốc repository không phục vụ `apps/web`. Phải chạy binary trong `apps/web`.

## Hai chế độ

| Biến | Giá trị | Kết quả |
| --- | --- | --- |
| `VITE_DATA_MODE` | `demo` | File `apps/web/.env.demo`. Banner “Dữ liệu mẫu”. Server mẫu nằm trong bộ nhớ tab |
| `VITE_DATA_MODE` | `live` | File `apps/web/.env.live`. Không nhúng fixture, preset quyền hay banner mẫu |

Proxy Vite: `/v1`, `/live`, `/ready` tới `API_PROXY`, mặc định `http://127.0.0.1:3000`, `changeOrigin: false`. Không sửa `PUBLIC_ORIGIN` của API từ giao diện. Muốn Origin trình duyệt khớp API, người vận hành tự đặt `PUBLIC_ORIGIN` bằng origin trình duyệt. Preview HTTP không chứng minh cookie `Secure`.

## Tài khoản mẫu

Chỉ có trong bản demo:

- `candidate@example.test` / `fixture-password-ok`
- `pending@example.test` chưa có mật khẩu
- `disabled@example.test` bị từ chối với cùng câu đăng nhập

Tải lại trang demo làm mất đăng nhập. Hai tab demo không dùng chung phiên. Liên kết xác nhận trong hộp thư là tải cả trang để script xóa fragment chạy trước module. Liên kết lượt thi trong kịch bản là điều hướng trong app để không xóa phiên đang mở.

## Kịch bản đã gắn trong UI

| ID | Cách mở |
| --- | --- |
| D-01 | Đăng nhập tài khoản đã xác nhận |
| D-08 | “mở phòng” của lượt `…0402` |
| D-09 | “mở kết quả” của lượt `…0401`, 5/6 và 83.33% |
| Xung đột | Trong phòng thi, chọn “Xung đột phiên bản” rồi đổi đáp án |

Các lỗi `delay-ack`, `lose-ack`, `save-429`, `save-503`, `refresh-lost` có trong bộ chọn. Browser ngày 2026-10-07 mới chạy `conflict-save`.

## Chưa chạy

HTTPS Identity, thư thật, Catalog/Assessment/Reporting trên API, Firefox, WebKit, LCP/CLS vẫn BLOCKED hoặc NOT RUN. Đề 500 câu và layout viewport tương đương zoom 200% đã có trong [fix evidence](evidence/fix-2026-10-07/README.md); CSS zoom trên viewport cố định không được tính là browser zoom. Những mục còn mở không phải pass.

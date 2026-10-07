# Runbook giao diện web

Ngày 2026-10-07. SPA tĩnh React19.3.0/TypeScript5.9.2/Vite8.3.3 trong `apps/web`, không SSR. HTTP preview dưới đây không chứng minh cookie Secure; bộ [HTTPS Identity riêng](../runbooks/identity-https.md) đã chạy actual API/PG/SMTP, không phải AWS/public PKI acceptance.

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

| Biến             | Giá trị | Kết quả                                                                          |
| ---------------- | ------- | -------------------------------------------------------------------------------- |
| `VITE_DATA_MODE` | `demo`  | File `apps/web/.env.demo`. Banner “Dữ liệu mẫu”. Server mẫu nằm trong bộ nhớ tab |
| `VITE_DATA_MODE` | `live`  | File `apps/web/.env.live`. Không nhúng fixture, preset quyền hay banner mẫu      |

Proxy Vite: `/v1`, `/live`, `/ready` tới `API_PROXY`, mặc định `http://127.0.0.1:3000`, `changeOrigin: false`. Không sửa `PUBLIC_ORIGIN` của API từ giao diện. Muốn Origin trình duyệt khớp API, người vận hành tự đặt `PUBLIC_ORIGIN` bằng origin trình duyệt. Preview HTTP không chứng minh cookie `Secure`.

## Tài khoản mẫu

Chỉ có trong bản demo:

- `candidate@example.test` / `fixture-password-ok`
- `pending@example.test` chưa có mật khẩu
- `disabled@example.test` bị từ chối với cùng câu đăng nhập

Tải lại trang demo làm mất đăng nhập. Hai tab demo không dùng chung phiên. Liên kết xác nhận trong hộp thư là tải cả trang để script xóa fragment chạy trước module. Liên kết lượt thi trong kịch bản là điều hướng trong app để không xóa phiên đang mở.

## Kịch bản đã gắn trong UI

| ID       | Cách mở                                                   |
| -------- | --------------------------------------------------------- |
| D-01     | Đăng nhập tài khoản đã xác nhận                           |
| D-08     | “mở phòng” của lượt `…0402`                               |
| D-09     | “mở kết quả” của lượt `…0401`, 5/6 và 83.33%              |
| Xung đột | Trong phòng thi, chọn “Xung đột phiên bản” rồi đổi đáp án |

Các lỗi `delay-ack`, `lose-ack`, `save-429`, `save-503`, `refresh-lost` có trong bộ chọn. Browser ngày 2026-10-07 mới chạy `conflict-save`.

## Homepage và trải nghiệm công khai

`/` dùng giao diện “Vào nhịp thi” với cảnh phiếu thi/bút/đồng hồ3D. Module Three.js được tải từ asset cùng origin khi scene vào viewport; không có CDN/model bên ngoài. Người dùng có thể dừng hiệu ứng; reduced-motion giữ cảnh tĩnh. Scene ngừng render khi ngoài viewport hoặc tab bị ẩn. Không có WebGL2/mất context thì hiện hình CSS; đổi route dispose tài nguyên graphics.

`/experience` chạy trong cả live và demo, gồm ba câu tổng hợp công khai tự tạo. Chấm mẫu exact-match trong route này; không đọc ngân hàng đề, tạo attempt, gọi Assessment API hoặc lưu storage. Tải lại/rời route xóa lựa chọn. CTA dẫn tới form thật `/register`. Bộ mẫu công khai này tách khỏi fixtures, preset quyền và adapter DemoApi của bản demo.

Kiểm tra riêng increment:

```text
npm --prefix apps/web run test -- --run src/features/experience/__tests__
npm --prefix apps/web run test:e2e -- e2e/public-experience.e2e-spec.ts
```

Hai preview4173/4174 ở trên phải chạy trước browser suite. Suite graphics dùng Chromium software WebGL; không suy ra FPS hoặc tốc độ thiết bị thật từ kết quả này. [Báo cáo triển khai](vao-nhip-thi-implementation-2026-10-07.md) ghi kích thước build, kiểm tra và bằng chứng.

## Chưa chạy

Identity HTTPS/SMTP local đã PASS bằng `npm run test:identity:https` từ repository root;10 actual Chromium cases, gồm hai tab/Origin/cookie/CSRF/lost ACK/body timeout. [Evidence](../evidence/identity-https-2026-10-07/README.md). Live SES, Catalog/Assessment/Reporting APIs, Firefox/WebKit và LCP/CLS vẫn BLOCKED/NOT RUN. Đề500 và prior layout evidence không tự đóng các gate đó.

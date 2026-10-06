# Production-Grade Online Examination Platform

Giai đoạn hiện tại: **điều chỉnh bộ quy chuẩn và lập checklist triển khai** theo yêu cầu mới nhất. Đã có bootstrap TypeScript/Jest và các domain helper ban đầu; chưa có application runtime hay triển khai AWS.

- [Architecture Contract](architecture.md): trỏ đến contract được cung cấp trong `.ai/architecture.md`.
- [AGENTS.md](AGENTS.md): thứ tự quy chuẩn và quy trình làm việc.
- [Roadmap có đánh dấu](docs/implementation-roadmap.md): danh sách chi tiết theo từng phần, trạng thái và tiêu chí hoàn thành.
- [Project profile](docs/project-profile.md): quyết định dự án và phân biệt target với implementation.
- [Performance protocol](docs/performance.md): cách đo và chọn cấu hình theo performance/cost.
- [Production acceptance](docs/production-acceptance.md): các câu hỏi phải trả lời bằng evidence trước khi gọi là production-ready.

Các lệnh hỗ trợ hiện có:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run lint
npm run quality
```

Local dependency sandbox (chưa phải application):

```sh
docker compose up -d postgres sqs
docker compose ps
docker compose stop postgres sqs
```

PostgreSQL/ElasticMQ chỉ bind localhost. Credentials trong `.env.example` và Compose là dữ liệu local giả định, tuyệt đối không dùng cho AWS. Chưa có SQL migration/schema/application; kết nối container thành công không chứng minh concurrency hay durability của hệ thống. API/worker/frontend/Terraform/k6 sẽ được làm theo roadmap, không có lệnh chạy ứng dụng giả.

Local SQS: `.env.example` dành cho process chạy trên host, nên endpoint/queue URL cùng dùng `127.0.0.1:9324`. Client trong Docker network dùng `http://sqs:9324`; không dùng `127.0.0.1` bên trong container để truy cập container khác. ElasticMQ trả queue URL theo Host của request (`node-address.host="*"`), theo [hướng dẫn ElasticMQ](https://github.com/softwaremill/elasticmq#how-are-queue-urls-created). Cấu hình local queue là in-memory test dependency; chưa chứng minh durability của AWS SQS.

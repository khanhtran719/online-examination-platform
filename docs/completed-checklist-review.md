# Review các đầu mục đã hoàn thành

Đây là review lịch sử bootstrap trước khi làm Phần 02. Tiến độ mới nhất xem [roadmap](implementation-roadmap.md) và [review Phần 02](phase-02-review.md); số tests dưới đây thuộc lượt bootstrap review.

Ngày review: 2026-10-06. Phạm vi: 10 mục STD và 8 mục BOOT đã tick; không đánh giá hệ thống production chưa được triển khai. **Kết luận: đủ điều kiện chuyển sang phần 02 — product specification/public contracts**, sau khi sửa các findings dưới đây. Không còn finding chặn phase tiếp theo trong phạm vi được review.

## Findings và xử lý

| Finding | Ảnh hưởng | Xử lý / kiểm chứng | Trạng thái |
| --- | --- | --- | --- |
| REV-01: Attempt.restore nhận status không hợp lệ và expired/submittedAt/status mâu thuẫn | dữ liệu hydrate sai vẫn vào lifecycle; BOOT-06 chưa đủ guard | 8 regression cases đã fail trước sửa, nay pass; kiểm tra allowed states, timestamp/expiry provenance và SUBMITTED/EXPIRED consistency; bổ sung CREATED/start và restore COMPLETED-expired hợp lệ | fixed |
| REV-02: import checker bỏ sót TS import-type/import-equals, bare Node networking và technical folder barrels; chưa chặn Domain→Application | quality có thể pass sai một import vi phạm boundary | 4 tooling regression tests fail trước sửa, nay pass; parse các AST node tương ứng, normalize folder boundary và bổ sung Domain→Application guard | fixed |
| REV-03: SQS_QUEUE_URL trong env host trỏ hostname Docker `sqs` | local host client dùng QueueUrl có thể không resolve được | đổi env host sang 127.0.0.1; ElasticMQ queue URL theo request Host; GetQueueUrl với Host 127.0.0.1 trả localhost URL, request Docker trả `sqs` URL | fixed |
| REV-04: DB-11 yêu cầu concurrency của start/save/submit/inbox trước khi application flows tồn tại | checklist gate có thể buộc implementation sai phase hoặc tick thiếu bằng chứng | DB-11 tập trung technical fixtures/UoW/constraints/locks/timeouts; business integration thuộc ATT-10/ASYNC-11; ATT-08 result acceptance liên kết ASYNC-06/07 | fixed |
| REV-05: AGENTS ghi scope của một lượt làm việc thành chỉ dẫn lâu dài | người triển khai sau có thể hiểu nhầm bị giới hạn ở standards | thay bằng hướng dẫn bám active user scope, roadmap/evidence và quy trình reopen sau review; giữ roadmap như trạng thái, không coi là quyền chạy mọi phase | fixed |

REV-01/02 được sửa trong owning domain/tooling và giữ framework/infrastructure ngoài business code. Không thay scoring policy, HTTP envelope, infrastructure selection hoặc bắt đầu application phase. REV-03 theo [tài liệu ElasticMQ về queue URL](https://github.com/softwaremill/elasticmq#how-are-queue-urls-created), và đã kiểm tra HTTP trên chính phiên bản local hiện dùng. Đây không phải durability test của SQS production.

## Đối chiếu 18 mục

| Mục đã tick | Artifact / bằng chứng kiểm tra | Kết luận |
| --- | --- | --- |
| STD-01 | inspection trong lượt trước, [ADR-001](adr/001-project-adoption.md) ghi xung đột POS và yêu cầu mới | giữ hoàn thành |
| STD-02 | [AGENTS.md](../AGENTS.md), precedence/routing/status; sửa REV-05 | giữ sau sửa |
| STD-03 | [architecture entry](../architecture.md) trỏ đúng [.ai contract](../.ai/architecture.md); core layering vẫn giữ | giữ hoàn thành |
| STD-04 | [rules](../.ai/rules.md), [architecture](../.ai/architecture.md), [conventions](../.ai/conventions.md), [workflow](../.ai/workflow.md), [overview](../.ai/overview.md), [template](../.ai/module-template.md); review context, DI examples, transaction semantics | giữ hoàn thành |
| STD-05 | [ADR-001](adr/001-project-adoption.md): adoption khác biệt được ghi rõ, cache/compute/TLS chưa giả định đã thắng/triển khai | giữ hoàn thành |
| STD-06 | [ADR-002](adr/002-cursor-pagination.md); architecture/conventions/template thống nhất cursor contract | giữ hoàn thành |
| STD-07 | [profile](project-profile.md), [module guide](examination-module-guide.md); capability ownership và target vs implementation rõ | giữ hoàn thành |
| STD-08 | R-63–75 và §§76–85 tồn tại, hard gates/cost/evidence/security giữ nguyên; đây là chuẩn, không phải control đã chạy | giữ hoàn thành |
| STD-09 | [performance](performance.md), [contract tests](contract-tests.md), [acceptance](production-acceptance.md) ghi đầy đủ unmeasured/unimplemented | giữ hoàn thành |
| STD-10 | `npm run quality` pass; semantic/manual review + regressions REV-02/04/05; static checks có giới hạn được ghi rõ | giữ sau sửa |
| BOOT-01 | [package](../package.json), lockfile/configs; manifest và lock declarations khớp, typecheck/build/test/lint pass | giữ hoàn thành |
| BOOT-02 | chỉ dependency dev; npm audit hiện 0 high/critical, 20 moderate được ghi nhận; chưa có runtime deps | giữ, không coi là security acceptance |
| BOOT-03 | [Compose](../compose.yaml), [ElasticMQ config](../infra/local-sqs.conf); `compose config`, PostgreSQL healthy, ListQueues/GetQueueUrl pass | giữ hoàn thành |
| BOOT-04 | [.env.example](../.env.example), ignore files; fake/local-only credentials; sửa hostname REV-03 | giữ sau sửa |
| BOOT-05 | RED lịch sử trước source; lượt review RED thật: 8 assertions domain + 4 tooling tests fail trước fix | giữ hoàn thành |
| BOOT-06 | [Attempt](../apps/api/src/modules/assessment/domain/attempt.ts), [scoring](../apps/api/src/modules/assessment/domain/scoring.ts); 28 domain tests pass | giữ sau sửa |
| BOOT-07 | `npm test`, typecheck/build/lint/quality rerun; xem [validation](validation.md) | giữ sau kiểm chứng |
| BOOT-08 | PostgreSQL query + queue HTTP kiểm tra lại; không có schema/UoW/worker/system integration được claim | giữ hoàn thành |

## Validation và giới hạn

- 28 domain tests (20 Attempt + 8 scoring) + 9 tooling tests = **37 pass**, không skipped.
- `npm run typecheck`, `npm run build`, `npm run lint` và quality pass; Prettier áp dụng cho source/test thay đổi.
- `docker compose config --quiet`, healthy DB, SQL query và ListQueues/GetQueueUrl kiểm tra thành công; local containers dừng sau review, volume giữ lại.
- `npm audit --audit-level=high` exit 0: **20 moderate ở chuỗi dev Jest/sprintf-js, 0 high/critical**. Không force downgrade/override để tạo kết quả đẹp. Theo dõi tại SEC-06; phải review lại khi thêm runtime dependency và trước deployment.
- Chưa có Git/remote: không claim Git diff/commit/PR. BOOT-09 vẫn chưa làm.
- Import checker chưa resolve alias/transitive barrel exports hay xác minh Nest exports/public facade scope. Literal dependency checks không chứng minh toàn bộ architecture/runtime; phải mở rộng cùng alias/public boundaries khi các module được tạo.
- Chưa có migration/UoW/session/API/worker/frontend/AWS/k6; chưa có benchmark/restore/cost measurements. Các mục này giữ `[ ]`.

## Bước kế tiếp

Phần 02, bắt đầu SPEC-01–03: scoring/product scope, immutable publication versions và lịch/deadline. Tiếp đó attempt-limit/autosave/idempotency/state/release/leaderboard/permissions/API/SLO contracts (SPEC-04–11). Chốt behavior trước schema và application, và dùng regression cases hiện có để tránh thay domain semantics âm thầm. Git/remote setup và Nest bootstrap vẫn là các đầu mục riêng chưa hoàn thành.

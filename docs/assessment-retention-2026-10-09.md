# ATT-09 — Assessment retention closure

Kết luận2026-10-09: **ATT-09 hoàn tất và nghiệm thu local**. Roadmap
**79/216 checked,137 pending**.375 root tests và242 integration tests PASS.
Production vẫn **NOT ACCEPTED**; không suy ra AWS cost, sustainable capacity
hoặc SLO.

## Hành vi và invariant

| Phần | Cơ chế đã triển khai |
| --- | --- |
| Receipts | Prune Assessment start/save/submit tối thiểu7days; batch mặc định500/max1000; active/pending/FAILED/replay và unresolved delivery/failure được bảo vệ |
| Completed payload | Tối thiểu365days từ submit AND7days từ completion; không có recent7day receipt, replay, pending/leased/parked outbox hoặc quarantine chưa xử lý |
| Durability | Result + canonical successful inbox phải tồn tại; purge có row lock, kiểm tra lại facts, payload/projection/marker/audit cùng một UoW |
| Quota và redelivery | Giữ compact attempt/submission/generation/inbox; quota không reset; canonical source/DLQ duplicate không chấm lại hoặc tạo result mới |
| Candidate reads | Attempt/answers/result/review của purged identity không có projection; history loại nó; transport hiện hữu map not-found404 |
| Statistics/ranking | Trừ contribution của result bị purge, thay best entry bằng result còn giữ; không tạo score0 |
| Worker | One-shot, default-off, mỗi tick tối đa10attempts mặc định/max50; SIGTERM dừng admission và drain UoW đang chạy |

Mốc7/365days là policy tối thiểu. Incident/grace/lock/schedule có thể kéo dài thời
gian giữ; không bảo đảm delete ngay tại deadline. Job không xóa Identity/Catalog,
frozen keys/versions, successful inbox, audit hay pending/FAILED records. Compact
identity tồn tại để giữ quota và fencing; lifecycle của metadata/PII/backup/restore
ledger là gate riêng, không phải full privacy erasure.

## Kiến trúc và migration

[ADR-011](adr/011-assessment-retention-compaction.md) xác định ownership và quyết
định lưu identity nhỏ. Assessment sở hữu Domain policy/WRITE use case/port; plain
Application dùng UoW, không import pg/Nest/AWS. Private pg adapter thực thi3 fixed
RPC. Scheduler chỉ gọi public factory, từ chối ambient transaction để mỗi UoW
thực sự commit. Không thêm runtime dependency, cache, queue hoặc AWS resource.

Forward0017 thêm `purged_at`, partial due index, receipt resource index và deferred
completion guard cho compact COMPLETED. NOLOGIN maintenance group chỉ có USAGE +
EXECUTE3 entry functions; không direct DML, Catalog key/Identity read hay quyền
gọi private facts helper. Functions/trigger có trusted owner và secure search
path. SQL là enforcement của Domain policy, không nhận TTL/status/facts do caller
cung cấp. Recovery role chỉ thêm SELECT cột marker; các operation/event schema
không đổi.17 source/built migrations khớp;0001–0016 giữ checksum.

Lock order của purge khớp grader: attempt → question counters theo ID → option
counters theo question/option → leaderboard. Thiếu detail/counter hoặc âm count
fail closed. Fresh statements sau lock dùng DB facts; audit failure rollback toàn
bộ attempt. Receipt batch commit riêng; job lỗi ở attempt sau không rollback những
UoW đã commit. Reader/source/DLQ phải purged-aware trước khi bật job; rollback sau
purge phải giữ khả năng đó và migration0017. [Runbook](runbooks/assessment-retention.md)
quy định dedicated LOGIN/secret, enablement, counts, stop/drain và recovery.

## Validation và review

[Raw evidence](evidence/assessment-retention-2026-10-09/README.md) giữ cả RED/fixture
failures và GREEN; không sửa evidence cũ để tạo kết quả đẹp.

| Check | Kết quả |
| --- | --- |
| Domain/App fail-first | Thiếu source làm suite RED; grading/recovery compact identity tái hiện2 lỗi GRADING_STATE_UNAVAILABLE trước sửa |
| Root npm test |375 PASS =238 API/33 suites +41 tooling +96 Web;0 skipped |
| Restricted PostgreSQL integration |242 PASS/15 suites;0 skipped, trong đó18 retention cases mới |
| Typecheck/build | PASS; entry worker thực sự compiled,17 migrations bundled |
| Lint/quality/contracts | PASS;46 operations/425 examples, import/link/test-placement guards |
| Preservation |322 protected files =16 applied migrations +306 prior evidence; không đổi bytes |
| Cleanup |0 temporary DB/login/other-DB connections; PG55435/Mailpit stopped, volumes preserved; development55432 untouched |

18 real-PG cases bao gồm role/RPC boundaries; receipt batch/pruned-key rejection;
projection withdrawal/quota; young completion/recent receipt/quarantine/delivery
protection; pending/FAILED/replay protection; two-maintainer single effect;
SKIP LOCKED progress; purge/new-grade counter contention quan sát pg_stat_activity;
audit rollback của cả payload/receipts; deferred removal guard; synthetic lost
COMMIT ACK/rerun; maximum500questions/5000selections; compiled SIGTERM/drain/default-off;
finite-time/direct RPC, absolute168hour DST protection và natural index discovery
với100k FAILED rows. Purged visibility mới được kiểm
chứng trên actual query/WRITE-lock adapters; full regression giữ existing real
HTTP/auth flows. Không gọi chúng là mới chạy browser end-to-end cho retention.

Draft0017 ban đầu làm mất quyền đọc của deferred guard ở COMMIT:42501 khi maintenance
không có SELECT. Sửa trigger SECURITY DEFINER thay vì mở table grants; real-PG purge,
rollback và worker cases sau đó PASS. Fixtures ban đầu thiếu revision/causationId
được sửa theo contract hiện hữu, không nới rule để làm test qua.

Self-review bổ sung regression fail-first trực tiếp RPC: completion `-infinity`
bị coi đủ tuổi và purge trái Domain finite-time guard. Facts adapter SQL nay map
nonfinite completion thành null; authorized direct RPC lẫn scheduler bỏ qua và
giữ payload/audit nguyên. Intermediate full241/241 bao gồm cả `±infinity`; không nới quyền
hoặc sửa migration cũ. Raw RED được giữ tại rt-finite-red.log.

Self-review cũng tái hiện được receipt167.5hours bị prune khi caller đổi sang
timezone có DST: interval7calendar-days lúc đó ngắn hơn168hours. Function-scoped
UTC nay cố định policy cho cả RPC trực tiếp; không phụ thuộc default của API/DB
login. Regression dùng valid POSIX DST rules theo ngày DB hiện tại và thực sự
giữ lại receipt chưa đủ168hours. Raw RED ở rt-timezone-red.log; không shorten TTL
hoặc thêm infrastructure để giải quyết.

Natural-plan fixture từng vượt30s khi seed100k rows và teardown bị kéo theo;
cleanup riêng đã xóa đúng database/logins do run đó tạo. Fixture mới giữ nguyên
triggers/FKs, seed trong transaction rồi ANALYZE trước deferred COMMIT guards,
có statement timeout90s/test budget120s. Isolated plan và final full suite PASS;
không coi thay timeout fixture là performance optimization sản phẩm.

First full run239/240 PASS: Catalog republish/question-lock deadline test accepted
ngoài kỳ vọng. Isolated6/6 PASS nên chưa tái hiện được nguyên nhân chính xác. Fixture
đã được củng cố: holder connection quan sát trực tiếp stored `closes_at` (kể cả
update chưa commit), giữ lock qua close+5ms trước release; bỏ việc truyền boundary
qua JavaScript Date để quan sát. Không đổi production Catalog behavior. Final
full240/240 rồi241/241 và242/242 PASS; lỗi đầu được giữ nguyên log, không kết luận một runtime defect
đã được tái hiện/sửa. Tiếp tục theo dõi timing test này nếu CI xuất hiện lại.

Self-review theo R-58/59 và workflow47/48: thin scheduler, visible UoW/root guard,
module ownership/port-only business layers, fixed-policy least privilege, unchanged
submission/event/answer provenance, atomic audit/projections, bounded admission/
timeouts, no sensitive diagnostic values, no unnecessary resource/abstraction.

## Local measurement và giới hạn

Final full run: một maximum-payload job purge1attempt/500answers/5000selections
trong **63.438ms**, với **7 client SQL calls gồm2BEGIN/2COMMIT và3 RPCs**. Đây không
phải7 statements nội bộ PostgreSQL, p95/p99, jobs/sec sustainable hay AWS jobs/USD.
Hai UoW tách biệt; timings/lock observations có network/server work và được ghi
raw trong maximum-local.json. Không so sánh trước/sau từ một sample này.

Natural plan chạy exact discovery SELECT trích từ function đã migrate, dưới cùng
owner role, ANALYZE/BUFFERS, không ép enable_seqscan. Partial
`attempts_retention_due` được dùng với100.000 FAILED rows bị loại khỏi partial
index; local execution **2.115ms**. Đây không phải100k eligible/blocked COMPLETED
rows hay DB saturation test. Function có thể kiểm tra nhiều protected candidates
trước LIMIT; batch giới hạn effect, không giới hạn mọi row scan. Statement timeout
và dedicated pool giữ admission hữu hạn; cần large mixed-data/pool sweep để chọn
schedule/batch/index và đo vacuum/WAL/backup/storage cost.

Không rerun dependency audit, browser HTTPS, image/IaC, managed SQS, AWS deploy,
RDS failover/PITR/restore, load/saturation hoặc Performance–Cost Curve. Các control
và outcome local không thay production acceptance.

## Checklist và tiếp theo

RT-01–05 COMPLETE local; chỉ ATT-09 được đóng trong increment này.
Roadmap đã tăng từ78 lên79/216 (137 pending). ATT-10/11 vẫn SUBSET;
REP-04 public leaderboard/privacy/Admin reads, Admin replay HTTP và production
remain open. Tiếp theo rà coverage matrix ATT-10/11 cho timeout/ACK/restart của
các HTTP write; không đánh dấu full matrix từ synthetic retention ACK test.

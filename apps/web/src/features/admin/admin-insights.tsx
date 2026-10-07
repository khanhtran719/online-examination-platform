import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { formatDateTime, shortId } from "../../shared/format";
import { useProtectedAccess } from "../../shared/protected-access";
import { Button, Dialog, EmptyState, ErrorPanel, SkeletonLines } from "../../shared/ui/ui";
import { tableClass, tableWrapClass } from "../../shared/ui/ui";
import { rateLabel } from "../assessment/progress";
import styles from "../../shared/styles/layout.module.css";
import { CapabilityGate, useCapability } from "./gate";

export function StatisticsPage() {
  const { examId = "", versionId = "" } = useParams();
  useTitle("Thống kê câu");
  const gate = useCapability("reporting.read");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const stats = useInfiniteQuery({
    queryKey: ["stats", examId, versionId],
    enabled: gate === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api
        .getQuestionStatistics(examId, versionId, { pageSize: 20, cursor: pageParam })
        .then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(stats.error, [["stats", examId, versionId]], blocked, () =>
    setBlocked(true),
  );
  const rows = hidden ? [] : (stats.data?.pages.flatMap((page) => page.items) ?? []);
  return (
    <CapabilityGate permission="reporting.read">
      <h1 className={styles.title}>Thống kê phiên bản {shortId(versionId)}</h1>
      <p className={styles.muted}>
        Cột lựa chọn là số lượt chọn, không phải biểu đồ. Mẫu bằng 0 thì tỷ lệ là “Chưa có mẫu”.
      </p>
      {stats.isLoading ? <SkeletonLines /> : null}
      {stats.error ? (
        <ErrorPanel error={stats.error} onRetry={hidden ? undefined : () => void stats.refetch()} />
      ) : null}
      {stats.isSuccess && rows.length === 0 ? (
        <EmptyState title="Chưa có thống kê">Phiên bản này chưa có câu để thống kê.</EmptyState>
      ) : null}
      {rows.map((row) => (
        <article key={row.questionId} className={styles.card}>
          <h2>Câu {shortId(row.questionId)}</h2>
          <p>
            Hoàn thành {row.completedAttempts} · đúng {row.correct} · sai {row.incorrect} · chưa
            chọn {row.unanswered}
          </p>
          <p>Tỷ lệ đúng: {rateLabel(row.correct, row.completedAttempts)}</p>
          <h3>Lượt lựa chọn</h3>
          <ul>
            {row.options.map((option) => (
              <li key={option.optionId}>
                {shortId(option.optionId)} · {option.selectedCount}
              </li>
            ))}
          </ul>
        </article>
      ))}
      {stats.hasNextPage ? (
        <Button onClick={() => void stats.fetchNextPage()}>Tải thêm</Button>
      ) : null}
      <Link to={`/admin/exams/${examId}`}>Về đề</Link>
    </CapabilityGate>
  );
}

export function MetricsPage() {
  useTitle("Số liệu hệ thống");
  const gate = useCapability("system.metrics.read");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const metrics = useQuery({
    queryKey: ["metrics"],
    enabled: gate === "allowed" && !blocked,
    queryFn: () => api.getSystemBusinessMetrics().then((response) => response.data),
  });
  const hidden = useProtectedAccess(metrics.error, [["metrics"]], blocked, () => setBlocked(true));
  return (
    <CapabilityGate permission="system.metrics.read">
      <h1 className={styles.title}>Số liệu</h1>
      <p className={styles.muted}>
        Các số bên dưới là snapshot máy chủ trả về. p99, CPU, cơ sở dữ liệu, bộ nhớ đệm và chi phí
        chưa có nên để trống, không ghi số 0.
      </p>
      {metrics.isLoading ? <SkeletonLines /> : null}
      {metrics.error ? (
        <ErrorPanel
          error={metrics.error}
          onRetry={hidden ? undefined : () => void metrics.refetch()}
        />
      ) : null}
      {!hidden && metrics.data ? (
        <div className={styles.stack}>
          <p>
            Mốc snapshot mẫu: {formatDateTime(metrics.data.asOf)}. Đây không phải số đo production.
          </p>
          <p>Thí sinh đang làm trong snapshot: {metrics.data.activeCandidates}</p>
          <p>Đã nộp: {metrics.data.submitted}</p>
          <p>Đã hoàn thành: {metrics.data.completed}</p>
          <p>Thất bại: {metrics.data.failed}</p>
          <p>Hàng đợi trong snapshot: {metrics.data.queueDepth}</p>
          <h2>Vận hành</h2>
          <p>Yêu cầu mỗi giây: {metrics.data.httpRps}</p>
          <p>HTTP p95: {metrics.data.httpP95Ms} ms</p>
          <p>Job cũ nhất: {metrics.data.oldestJobSeconds} giây</p>
          <h2>Chưa có trong hợp đồng</h2>
          <p>HTTP p99: Chưa có dữ liệu</p>
          <p>CPU: Chưa có dữ liệu</p>
          <p>RDS: Chưa có dữ liệu</p>
          <p>Redis: Chưa có dữ liệu</p>
          <p>Chi phí: Chưa có dữ liệu</p>
        </div>
      ) : null}
    </CapabilityGate>
  );
}

export function AuditPage() {
  useTitle("Nhật ký");
  const gate = useCapability("audit.read");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const audit = useInfiniteQuery({
    queryKey: ["audit"],
    enabled: gate === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.getAudit({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(audit.error, [["audit"]], blocked, () => setBlocked(true));
  const rows = hidden ? [] : (audit.data?.pages.flatMap((page) => page.items) ?? []);
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  async function copyCorrelation(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyNote("Đã chép mã đối chiếu.");
    } catch {
      setCopyNote("Không chép tự động được. Hãy chọn mã và chép thủ công.");
    }
  }
  return (
    <CapabilityGate permission="audit.read">
      <h1 className={styles.title}>Nhật ký</h1>
      <p className={styles.muted}>Chỉ đọc. Không có nội dung thô, mật khẩu hay token.</p>
      {audit.isLoading ? <SkeletonLines /> : null}
      {audit.error ? (
        <ErrorPanel error={audit.error} onRetry={hidden ? undefined : () => void audit.refetch()} />
      ) : null}
      {audit.isSuccess && !hidden && rows.length === 0 ? (
        <EmptyState title="Chưa có dòng nhật ký">
          Các thao tác quản trị sẽ thêm dòng mới.
        </EmptyState>
      ) : null}
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th>Thời điểm</th>
              <th>Việc</th>
              <th>Kết quả</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatDateTime(row.occurredAt)}</td>
                <td>
                  {row.action} · {row.resourceType} · {shortId(row.resourceId)}
                </td>
                <td>{row.outcome}</td>
                <td>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCopyNote(null);
                      setSelectedId(row.id);
                    }}
                  >
                    Chi tiết
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {audit.hasNextPage && !hidden ? (
        <Button onClick={() => void audit.fetchNextPage()}>Tải thêm</Button>
      ) : null}
      {selected ? (
        <Dialog title="Chi tiết nhật ký" onClose={() => setSelectedId(null)}>
          <p>Người thực hiện: {selected.actorId ? shortId(selected.actorId) : "Không có mã"}</p>
          <p>Lý do: {selected.reason ?? "Không có"}</p>
          <p>Trường đổi: {selected.changedFields.join(", ") || "Không có"}</p>
          <p>
            Mã đối chiếu: <span className={styles.muted}>{selected.correlationId}</span>
          </p>
          <Button variant="secondary" onClick={() => void copyCorrelation(selected.correlationId)}>
            Chép mã đối chiếu
          </Button>
          {copyNote ? <p role="status">{copyNote}</p> : null}
        </Dialog>
      ) : null}
    </CapabilityGate>
  );
}

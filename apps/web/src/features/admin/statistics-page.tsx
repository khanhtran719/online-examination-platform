import { adminId as shortId } from "./admin-ui";
import { useState } from "react";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { useProtectedAccess } from "../../shared/protected-access";
import { CapabilityGate, useCapability } from "./gate";
import styles from "./admin.module.css";
import { Link, useParams } from "react-router";
import { EmptyState, ErrorPanel, SkeletonLines } from "../../shared/ui/ui";
import { AdminHeading, PageEnd } from "./admin-ui";
import { useInfiniteQuery } from "@tanstack/react-query";
import { rateLabel } from "../assessment/progress";

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
      <AdminHeading
        title={`Thống kê phiên bản ${shortId(versionId)}`}
        eyebrow="BÁO CÁO CÂU HỎI"
        description="Số liệu theo đúng phiên bản đã khóa. Mỗi câu dùng số lượt hoàn thành làm mẫu tính tỷ lệ."
      >
        <Link to={`/admin/exams/${examId}`}>← Về đề</Link>
      </AdminHeading>
      {stats.isLoading ? <SkeletonLines /> : null}
      {stats.error ? (
        <ErrorPanel error={stats.error} onRetry={hidden ? undefined : () => void stats.refetch()} />
      ) : null}
      {stats.isSuccess && !hidden && rows.length === 0 ? (
        <EmptyState title="Chưa có thống kê">Phiên bản này chưa có câu để thống kê.</EmptyState>
      ) : null}
      {rows.map((row) => (
        <article key={row.questionId} className={styles.panel}>
          <h2>Câu {shortId(row.questionId)}</h2>
          <dl className={styles.statGrid}>
            {[
              ["Hoàn thành", row.completedAttempts],
              ["Đúng", row.correct],
              ["Sai", row.incorrect],
              ["Chưa chọn", row.unanswered],
            ].map(([label, count]) => (
              <div className={styles.stat} key={label}>
                <dt>{label}</dt>
                <dd>{count}</dd>
              </div>
            ))}
          </dl>
          <p>
            Tỷ lệ đúng: <strong>{rateLabel(row.correct, row.completedAttempts)}</strong>
          </p>
          {row.completedAttempts > 0 ? (
            <meter
              aria-label={`Tỷ lệ đúng câu ${shortId(row.questionId)}`}
              min={0}
              max={row.completedAttempts}
              value={row.correct}
            >
              {rateLabel(row.correct, row.completedAttempts)}
            </meter>
          ) : null}
          <h3>Lượt lựa chọn</h3>
          <p className={styles.caption}>
            Câu nhiều lựa chọn có thể có nhiều lượt chọn trong cùng một bài.
          </p>
          <ul>
            {row.options.map((option) => (
              <li key={option.optionId}>
                {shortId(option.optionId)} · {option.selectedCount}
              </li>
            ))}
          </ul>
        </article>
      ))}
      {!hidden && stats.data ? (
        <PageEnd
          next={Boolean(stats.hasNextPage)}
          loading={stats.isFetchingNextPage}
          onMore={() => void stats.fetchNextPage()}
        />
      ) : null}
    </CapabilityGate>
  );
}

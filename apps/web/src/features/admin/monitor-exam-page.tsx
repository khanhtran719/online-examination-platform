import { adminId as shortId } from "./admin-ui";
import { useEffect, useRef, useState } from "react";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { useProtectedAccess } from "../../shared/protected-access";
import { CapabilityGate, useCapability } from "./gate";
import styles from "./admin.module.css";
import { Link, useParams } from "react-router";
import { formatDateTime, statusLabel } from "../../shared/format";
import {
  Button,
  EmptyState,
  ErrorPanel,
  SkeletonLines,
  TableScroll,
  tableClass,
} from "../../shared/ui/ui";
import { AdminBadge, AdminHeading, PageEnd } from "./admin-ui";
import { useInfiniteQuery } from "@tanstack/react-query";
import { canRestartPoll, monitorDelayMs } from "../assessment/polling";

export function MonitorExamPage() {
  const { examId = "" } = useParams();
  useTitle("Thí sinh đang làm");
  const gate = useCapability("reporting.read");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const rows = useInfiniteQuery({
    queryKey: ["monitor", examId],
    enabled: gate === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api
        .listActiveCandidates(examId, { pageSize: 20, cursor: pageParam })
        .then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(rows.error, [["monitor", examId]], blocked, () =>
    setBlocked(true),
  );
  const refetchRef = useRef(rows.refetch);
  refetchRef.current = rows.refetch;
  useEffect(() => {
    if (gate !== "allowed" || blocked) return;
    let stopped = false;
    let inFlight = false;
    let timer = 0;
    async function tick() {
      if (stopped || inFlight || document.hidden) return;
      inFlight = true;
      try {
        await refetchRef.current();
      } finally {
        inFlight = false;
        if (!stopped && !document.hidden) {
          timer = window.setTimeout(() => void tick(), monitorDelayMs(Math.random()));
        }
      }
    }
    timer = window.setTimeout(() => void tick(), monitorDelayMs(Math.random()));
    function onVisible() {
      if (
        !canRestartPoll({ hidden: document.hidden, cancelled: stopped, stopped: false, inFlight })
      )
        return;
      window.clearTimeout(timer);
      void tick();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [blocked, gate]);
  const items = hidden ? [] : (rows.data?.pages.flatMap((page) => page.items) ?? []);
  const loadedAt =
    rows.dataUpdatedAt > 0
      ? formatDateTime(new Date(rows.dataUpdatedAt).toISOString())
      : "Chưa tải";
  return (
    <CapabilityGate permission="reporting.read">
      <AdminHeading
        title="Đang làm bài"
        eyebrow="GIÁM SÁT ĐỀ THI"
        description="Mã thí sinh được giữ riêng. Trạng thái lượt thi không thể hiện tình trạng trực tuyến."
      >
        <Button
          variant="secondary"
          disabled={hidden || rows.isFetching}
          onClick={() => void rows.refetch()}
        >
          Tải lại
        </Button>
        <Link to={`/admin/exams/${examId}/submissions`}>Bài đã nộp</Link>
      </AdminHeading>
      <p className={styles.caption}>
        Lần tải gần nhất: {loadedAt} · tự tải lại khi trang đang hiển thị.
      </p>
      {rows.isLoading ? <SkeletonLines /> : null}
      {rows.error ? (
        <ErrorPanel error={rows.error} onRetry={hidden ? undefined : () => void rows.refetch()} />
      ) : null}
      {rows.isSuccess && !hidden && items.length === 0 ? (
        <EmptyState title="Không có thí sinh đang làm">
          Khi có lượt đang làm, dòng sẽ hiện ở đây.
        </EmptyState>
      ) : null}
      {!hidden && rows.isSuccess && items.length > 0 ? (
        <section className={styles.panel}>
          <TableScroll label="Thí sinh đang làm">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th scope="col">Mã thí sinh</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Hạn nộp</th>
                  <th scope="col">Lượt thi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.attemptId}>
                    <td className={styles.code}>{shortId(item.candidateId)}</td>
                    <td>
                      <AdminBadge tone="success">{statusLabel(item.status)}</AdminBadge>
                    </td>
                    <td>{formatDateTime(item.deadline)}</td>
                    <td>
                      <Link to={`/admin/attempts/${item.attemptId}`}>Xem lượt →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <PageEnd
            next={Boolean(rows.hasNextPage)}
            loading={rows.isFetchingNextPage}
            onMore={() => void rows.fetchNextPage()}
          />
        </section>
      ) : null}
    </CapabilityGate>
  );
}

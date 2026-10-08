import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { useMemory } from "../../app/memory";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { formatDateTime, statusLabel } from "../../shared/format";
import {
  Button,
  EmptyState,
  ErrorPanel,
  SkeletonLines,
  TableScroll,
  tableClass,
} from "../../shared/ui/ui";
import layout from "../../shared/styles/layout.module.css";
import styles from "./results.module.css";

export function HistoryPage() {
  useTitle("Lịch sử");
  const { api } = useRuntime();
  const memory = useMemory();
  const client = useQueryClient();
  const history = useInfiniteQuery({
    queryKey: ["history"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.getHistory({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const items = history.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <div className={layout.wrap}>
      <header className={styles.pageHeader}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>NHỮNG LƯỢT ĐÃ BẮT ĐẦU</p>
          <h1 className={layout.title}>Lịch sử</h1>
          <p className={layout.muted}>Tiếp tục bài đang làm, theo dõi xử lý hoặc mở kết quả.</p>
        </div>
        <Button
          variant="secondary"
          disabled={history.isFetching}
          onClick={() => void client.resetQueries({ queryKey: ["history"], exact: true })}
        >
          Làm mới
        </Button>
      </header>
      <p className={styles.caption}>
        Tên đề chỉ hiện khi đã mở đúng phiên bản. Danh sách phản ánh các lượt đã tải.
      </p>
      {history.isLoading ? <SkeletonLines /> : null}
      {history.error ? (
        <ErrorPanel error={history.error} onRetry={() => void history.refetch()} />
      ) : null}
      {history.isSuccess && items.length === 0 ? (
        <EmptyState
          title="Chưa có lượt thi"
          action={
            <Link className={styles.primaryLink} to="/exams">
              Tìm đề thi
            </Link>
          }
        >
          Chọn một đề để bắt đầu lượt làm bài đầu tiên.
        </EmptyState>
      ) : null}
      {items.length > 0 ? (
        <TableScroll label="Lịch sử các lượt thi">
          <table className={tableClass}>
            <thead>
              <tr>
                <th scope="col">Lượt thi / phiên bản</th>
                <th scope="col">Bắt đầu</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Điểm</th>
                <th scope="col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const frozen = memory.lookup(item.publishedVersionId);
                const title =
                  frozen && frozen.examId === item.examId
                    ? frozen.title
                    : `Phiên bản …${item.publishedVersionId.slice(-6)}`;
                const active = item.status === "IN_PROGRESS" || item.status === "CREATED";
                const href = active
                  ? `/attempts/${item.attemptId}`
                  : `/attempts/${item.attemptId}/${item.status === "COMPLETED" ? "result" : "status"}`;
                return (
                  <tr key={item.attemptId}>
                    <th scope="row">
                      <span className={styles.rowTitle}>{title}</span>
                      <small className={styles.rowSub}>Lượt …{item.attemptId.slice(-6)}</small>
                    </th>
                    <td>{formatDateTime(item.startedAt)}</td>
                    <td>
                      <span className={styles.badge} data-wrong={item.status === "FAILED"}>
                        {statusLabel(item.status)}
                      </span>
                      {item.expired ? <small className={styles.rowSub}>Đã hết giờ</small> : null}
                    </td>
                    <td className={styles.tableScore}>
                      {item.earned === null || item.possible === null
                        ? "Chưa có điểm"
                        : `${item.earned}/${item.possible}`}
                    </td>
                    <td>
                      <Link className={layout.chip} to={href}>
                        {active
                          ? "Tiếp tục"
                          : item.status === "COMPLETED"
                            ? "Kết quả"
                            : "Trạng thái"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
      ) : null}
      <div className={styles.pageHeader}>
        {history.hasNextPage ? (
          <Button
            disabled={history.isFetchingNextPage}
            onClick={() => void history.fetchNextPage()}
          >
            {history.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
          </Button>
        ) : history.isSuccess ? (
          <p className={styles.caption}>Đã hết danh sách đã tải.</p>
        ) : null}
        <Link className={layout.chip} to="/exams">
          Chọn đề khác →
        </Link>
      </div>
    </div>
  );
}

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMemory } from "../../app/memory";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { isApiError } from "../../shared/api/errors";
import { formatDateTime } from "../../shared/format";
import { useProtectedAccess } from "../../shared/protected-access";
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

export function LeaderboardPage() {
  const { examId = "", versionId = "" } = useParams();
  return <VersionBoard key={`${examId}/${versionId}`} examId={examId} versionId={versionId} />;
}
function VersionBoard({ examId, versionId }: { examId: string; versionId: string }) {
  useTitle("Bảng xếp hạng");
  const { api } = useRuntime();
  const memory = useMemory();
  const frozen = memory.lookup(versionId);
  const client = useQueryClient();
  const [blocked, setBlocked] = useState(false);
  const key = ["leaderboard", examId, versionId];
  const board = useInfiniteQuery({
    queryKey: key,
    enabled: !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api
        .getLeaderboard(examId, versionId, { pageSize: 20, cursor: pageParam })
        .then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(board.error, [key], blocked, () => setBlocked(true));
  const denied = hidden || (isApiError(board.error) && board.error.status === 404);
  const rows = denied ? [] : (board.data?.pages.flatMap((page) => page.items) ?? []);
  return (
    <div className={layout.wrap}>
      <header className={styles.pageHeader}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>XẾP HẠNG THEO PHIÊN BẢN</p>
          <h1 className={layout.title}>Bảng xếp hạng</h1>
          <p className={layout.muted}>
            {frozen && frozen.examId === examId && frozen.publishedVersionId === versionId
              ? frozen.title
              : `Phiên bản …${versionId.slice(-6)}`}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={blocked || board.isFetching}
          onClick={() => void client.resetQueries({ queryKey: key, exact: true })}
        >
          Làm mới
        </Button>
      </header>
      <p className={styles.caption}>
        Chỉ bí danh của người đã bật tham gia. Điểm thuộc phiên bản này; danh sách không đánh dấu
        dòng của bạn.
      </p>
      {board.isLoading ? <SkeletonLines /> : null}
      {denied ? (
        <EmptyState
          title="Bảng xếp hạng không mở"
          action={
            <Link className={layout.chip} to="/history">
              Về lịch sử
            </Link>
          }
        >
          Phiên bản này không công bố bảng, hoặc bạn không có quyền xem.
        </EmptyState>
      ) : null}
      {board.error && !denied ? (
        <ErrorPanel error={board.error} onRetry={() => void board.refetch()} />
      ) : null}
      {board.isSuccess && !denied && rows.length === 0 ? (
        <EmptyState title="Chưa có dòng nào">
          Chưa có bài hoàn thành nào được đưa vào bảng.
        </EmptyState>
      ) : null}
      {rows.length > 0 ? (
        <TableScroll label="Xếp hạng bằng bí danh">
          <table className={tableClass}>
            <thead>
              <tr>
                <th scope="col">Hạng</th>
                <th scope="col">Bí danh</th>
                <th scope="col">Điểm</th>
                <th scope="col">Hoàn thành</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.rank}-${row.pseudonym}`}>
                  <td>
                    <span className={styles.rank}>{row.rank}</span>
                  </td>
                  <th scope="row">{row.pseudonym}</th>
                  <td className={styles.tableScore}>
                    {row.earned}/{row.possible}
                  </td>
                  <td>{formatDateTime(row.completedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      ) : null}
      {board.hasNextPage && !denied ? (
        <Button disabled={board.isFetchingNextPage} onClick={() => void board.fetchNextPage()}>
          {board.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
        </Button>
      ) : null}
      <div className={styles.privacyNote}>
        <span aria-hidden="true">◈</span>
        <p>
          Bạn có thể chọn tham gia các bảng được mở bằng bí danh trong{" "}
          <Link to="/profile">hồ sơ</Link>.
        </p>
      </div>
    </div>
  );
}

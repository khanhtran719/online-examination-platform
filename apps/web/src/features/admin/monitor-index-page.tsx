import { adminId as shortId } from "./admin-ui";
import { useState } from "react";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { useProtectedAccess } from "../../shared/protected-access";
import { CapabilityGate, useCapability } from "./gate";
import styles from "./admin.module.css";
import { Link } from "react-router";
import {
  Alert,
  EmptyState,
  ErrorPanel,
  SkeletonLines,
  TableScroll,
  tableClass,
} from "../../shared/ui/ui";
import { AdminBadge, AdminHeading, PageEnd } from "./admin-ui";
import { useInfiniteQuery } from "@tanstack/react-query";

export function MonitorIndexPage() {
  useTitle("Giám sát");
  const reporting = useCapability("reporting.read");
  const manage = useCapability("catalog.manage");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const exams = useInfiniteQuery({
    queryKey: ["admin-exams", "monitor"],
    enabled: reporting === "allowed" && manage === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.listAdminExams({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(exams.error, [["admin-exams", "monitor"]], blocked, () =>
    setBlocked(true),
  );
  const items = hidden ? [] : (exams.data?.pages.flatMap((page) => page.items) ?? []);
  return (
    <CapabilityGate permission="reporting.read">
      <AdminHeading
        title="Giám sát"
        eyebrow="THEO DÕI KỲ THI"
        description="Chọn một đề để xem lượt đang làm và bài đã nộp."
      />
      {manage !== "allowed" ? (
        <Alert title="Không liệt kê đề">
          Cần quyền quản lý đề để lấy danh sách. Trang này không hỏi danh sách khi thiếu quyền đó.
        </Alert>
      ) : null}
      <p className={styles.muted}>
        Danh sách đề cần quyền quản lý đề. Người chỉ có quyền xem báo cáo mở đúng đường dẫn giám sát
        của một đề.
      </p>
      {exams.isLoading ? <SkeletonLines /> : null}
      {exams.error ? (
        <ErrorPanel error={exams.error} onRetry={hidden ? undefined : () => void exams.refetch()} />
      ) : null}
      {manage === "allowed" && !hidden && exams.isSuccess ? (
        <section className={styles.panel}>
          {items.length === 0 ? (
            <EmptyState title="Chưa có đề">Tạo bản nháp để bắt đầu.</EmptyState>
          ) : (
            <TableScroll label="Các đề cần giám sát">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th scope="col">Đề thi</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Theo dõi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((exam) => (
                    <tr key={exam.id}>
                      <td>
                        <span className={styles.rowTitle}>{exam.title}</span>
                        <span className={styles.rowSub}>Mã {shortId(exam.id)}</span>
                      </td>
                      <td>
                        <AdminBadge tone={exam.published ? "success" : "neutral"}>
                          {exam.archived
                            ? "Đã lưu trữ"
                            : exam.published
                              ? "Đang phát hành"
                              : "Bản nháp"}
                        </AdminBadge>
                      </td>
                      <td>
                        <Link to={`/admin/exams/${exam.id}/monitor`}>Giám sát →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
          <PageEnd
            next={Boolean(exams.hasNextPage)}
            loading={exams.isFetchingNextPage}
            onMore={() => void exams.fetchNextPage()}
          />
        </section>
      ) : null}
    </CapabilityGate>
  );
}

import { adminId as shortId } from "./admin-ui";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { categoryLabel } from "../../shared/format";
import { useProtectedAccess } from "../../shared/protected-access";
import { EmptyState, ErrorPanel, SkeletonLines, TableScroll, tableClass } from "../../shared/ui/ui";
import { CapabilityGate, useCapability } from "./gate";
import { AdminBadge, AdminHeading, PageEnd } from "./admin-ui";
import styles from "./admin.module.css";

export function AdminExamListPage() {
  useTitle("Đề thi quản trị");
  const gate = useCapability("catalog.manage");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const exams = useInfiniteQuery({
    queryKey: ["admin-exams"],
    enabled: gate === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.listAdminExams({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(exams.error, [["admin-exams"]], blocked, () =>
    setBlocked(true),
  );
  const items = hidden ? [] : (exams.data?.pages.flatMap((page) => page.items) ?? []);
  return (
    <CapabilityGate permission="catalog.manage">
      <AdminHeading
        title="Đề thi"
        eyebrow="QUẢN LÝ NỘI DUNG"
        description="Bản nháp, phiên bản đã phát hành và các thao tác quản lý."
      >
        <Link className={styles.primaryLink} to="/admin/exams/new">
          + Tạo bản nháp
        </Link>
      </AdminHeading>
      {exams.isLoading ? <SkeletonLines /> : null}
      {exams.error ? (
        <ErrorPanel error={exams.error} onRetry={hidden ? undefined : () => void exams.refetch()} />
      ) : null}
      {exams.isSuccess && !hidden && items.length === 0 ? (
        <EmptyState title="Chưa có đề">Tạo bản nháp từ ngân hàng câu.</EmptyState>
      ) : null}
      {items.length > 0 ? (
        <>
          <p className={styles.tableHint}>
            Cuộn ngang trong bảng để xem đủ các cột trên màn hình nhỏ.
          </p>
          <TableScroll label="Danh sách đề thi quản trị">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th scope="col">Đề thi</th>
                  <th scope="col">Danh mục</th>
                  <th scope="col">Thời lượng</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Revision</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((exam) => (
                  <tr key={exam.id}>
                    <th scope="row">
                      <Link className={styles.rowTitle} to={`/admin/exams/${exam.id}/edit`}>
                        {exam.title}
                      </Link>
                      <span className={styles.rowSub}>Đề {shortId(exam.id)}</span>
                    </th>
                    <td>{categoryLabel(exam.category)}</td>
                    <td>{exam.durationSeconds / 60} phút</td>
                    <td>
                      <AdminBadge
                        tone={exam.archived ? "neutral" : exam.published ? "success" : "warning"}
                      >
                        {exam.archived
                          ? "Đã lưu trữ"
                          : exam.published
                            ? "✓ Đang phát hành"
                            : "Bản nháp"}
                      </AdminBadge>
                    </td>
                    <td>{exam.revision}</td>
                    <td>
                      <Link to={`/admin/exams/${exam.id}/edit`}>Sửa đề →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </>
      ) : null}
      {!hidden && exams.isSuccess ? (
        <PageEnd
          next={Boolean(exams.hasNextPage)}
          loading={exams.isFetchingNextPage}
          onMore={() => void exams.fetchNextPage()}
        />
      ) : null}
      <div className={styles.notice}>
        <span aria-hidden="true">✓</span>
        <p>
          <strong>Phiên bản đã phát hành giữ nội dung cố định.</strong>
          <br />
          Chỉnh bản nháp không đổi nội dung của các lượt thi đang làm. Phát hành là một thao tác
          riêng.
        </p>
      </div>
    </CapabilityGate>
  );
}

import { adminId as shortId } from "./admin-ui";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { useProtectedAccess } from "../../shared/protected-access";
import { EmptyState, ErrorPanel, SkeletonLines, TableScroll, tableClass } from "../../shared/ui/ui";
import { CapabilityGate, useCapability } from "./gate";
import { AdminBadge, AdminHeading, PageEnd, questionTypeLabel } from "./admin-ui";
import styles from "./admin.module.css";

export function QuestionListPage() {
  useTitle("Ngân hàng câu");
  const gate = useCapability("catalog.manage");
  const { api, demo } = useRuntime();
  const canKeys = demo?.permissions.includes("catalog.keys.read") ?? false;
  const [blocked, setBlocked] = useState(false);
  const questions = useInfiniteQuery({
    queryKey: ["bank"],
    enabled: gate === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.listBankQuestions({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(questions.error, [["bank"]], blocked, () => setBlocked(true));
  const rows = hidden ? [] : (questions.data?.pages.flatMap((page) => page.items) ?? []);
  return (
    <CapabilityGate permission="catalog.manage">
      <AdminHeading
        title="Ngân hàng câu"
        eyebrow="QUẢN LÝ NỘI DUNG"
        description="Soạn, kiểm tra và sử dụng câu hỏi trong các bản nháp."
      >
        <Link className={styles.primaryLink} to="/admin/questions/new">
          + Tạo câu
        </Link>
      </AdminHeading>
      {!canKeys ? (
        <p className={styles.caption}>Không có catalog.keys.read nên đáp án không được hiển thị.</p>
      ) : null}
      {questions.isLoading ? <SkeletonLines /> : null}
      {questions.error ? (
        <ErrorPanel
          error={questions.error}
          onRetry={hidden ? undefined : () => void questions.refetch()}
        />
      ) : null}
      {questions.isSuccess && !hidden && rows.length === 0 ? (
        <EmptyState title="Ngân hàng trống">Tạo câu hoặc nhập JSON.</EmptyState>
      ) : null}
      {rows.length > 0 ? (
        <>
          <p className={styles.tableHint}>
            Cuộn ngang trong bảng để xem đủ các cột trên màn hình nhỏ.
          </p>
          <TableScroll label="Ngân hàng câu hỏi">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th scope="col">Câu hỏi</th>
                  <th scope="col">Loại</th>
                  <th scope="col">Điểm</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Revision</th>
                  <th scope="col">Đáp án</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((question) => (
                  <tr key={question.id}>
                    <th scope="row">
                      <Link className={styles.rowTitle} to={`/admin/questions/${question.id}/edit`}>
                        {question.prompt.slice(0, 180)}
                      </Link>
                      <span className={styles.rowSub}>Câu {shortId(question.id)}</span>
                    </th>
                    <td>{questionTypeLabel[question.type]}</td>
                    <td>{question.points}</td>
                    <td>
                      <AdminBadge tone={question.archived ? "neutral" : "success"}>
                        {question.archived ? "Đã lưu trữ" : "Đang dùng"}
                      </AdminBadge>
                    </td>
                    <td>{question.revision}</td>
                    <td>
                      {canKeys
                        ? `Vị trí ${question.correctOptionPositions.join(", ")}`
                        : "Đáp án đã ẩn"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </>
      ) : null}
      {!hidden && questions.isSuccess ? (
        <PageEnd
          next={Boolean(questions.hasNextPage)}
          loading={questions.isFetchingNextPage}
          onMore={() => void questions.fetchNextPage()}
        />
      ) : null}
    </CapabilityGate>
  );
}

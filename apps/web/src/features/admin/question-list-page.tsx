import { Link } from "react-router";

import { useTitle } from "@web/app/use-title";
import { QUESTION_TYPES, type QuestionType } from "@web/shared/api/dto";
import {
  ActionLink,
  Badge,
  Button,
  EmptyState,
  ErrorPanel,
  SelectField,
  SkeletonLines,
  tableClass,
  TableScroll,
  TextField,
} from "@web/shared/ui/ui";

import { adminId, PageEnd, questionTypeLabel } from "./admin-ui";
import styles from "./authoring.module.css";
import { CapabilityGate } from "./gate";
import { useQuestionList } from "./use-question-list";

export function QuestionListPage() {
  useTitle("Ngân hàng câu hỏi");
  const list = useQuestionList();
  return (
    <CapabilityGate permission="catalog.manage">
      <CapabilityGate permission="catalog.keys.read">
        <div className={styles.page}>
          <p className={styles.breadcrumb}>Quản trị / Ngân hàng câu hỏi</p>
          <header className={styles.heading}>
            <div>
              <h1>Ngân hàng câu hỏi</h1>
              <p>Soạn và sử dụng câu hỏi trong các bản nháp.</p>
            </div>
            <div className={styles.actions}>
              <ActionLink to="/admin/questions/new">+ Tạo câu</ActionLink>
              {list.canImport ? (
                <ActionLink variant="secondary" to="/admin/imports/new">
                  Nhập JSON
                </ActionLink>
              ) : null}
              <Button
                variant="secondary"
                disabled={list.unavailable || list.questions.isFetching}
                onClick={() => void list.questions.refetch()}
              >
                Tải lại
              </Button>
            </div>
          </header>
          {list.questions.error ? (
            <ErrorPanel
              error={list.questions.error}
              onRetry={list.hidden ? undefined : () => void list.questions.refetch()}
            />
          ) : null}
          {list.questions.isLoading ? <SkeletonLines /> : null}
          {!list.unavailable ? (
            <section className={styles.panel}>
              <div className={styles.filters}>
                <TextField
                  label="Tìm trong phần đã tải"
                  type="search"
                  value={list.search}
                  onChange={(e) => list.setSearch(e.target.value)}
                />
                <SelectField
                  label="Loại câu hỏi"
                  value={list.type}
                  onChange={(e) => list.setType(e.target.value as QuestionType | "")}
                >
                  <option value="">Tất cả</option>
                  {QUESTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {questionTypeLabel[type]}
                    </option>
                  ))}
                </SelectField>
              </div>
              <p className={styles.scope}>
                Đang hiển thị {list.filtered.length} trên {list.rows.length} câu đã tải. Đáp án và
                giải thích không hiển thị trong danh sách.
              </p>
              {list.questions.isSuccess && !list.rows.length ? (
                <EmptyState title="Ngân hàng trống">Tạo câu hoặc nhập JSON.</EmptyState>
              ) : list.rows.length && !list.filtered.length ? (
                <EmptyState title="Không khớp bộ lọc">
                  Chỉ tìm trong phần đã tải; thử đổi bộ lọc hoặc tải thêm.
                </EmptyState>
              ) : null}
              {list.filtered.length ? (
                <>
                  <p className={styles.scope}>Cuộn ngang trong bảng nếu cần để xem đủ các cột.</p>
                  <TableScroll label="Ngân hàng câu hỏi">
                    <table className={`${tableClass} ${styles.table}`}>
                      <thead>
                        <tr>
                          <th scope="col">Câu hỏi</th>
                          <th scope="col">Loại</th>
                          <th scope="col">Điểm</th>
                          <th scope="col">Trạng thái</th>
                          <th scope="col">Bản sửa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.filtered.map((q) => (
                          <tr key={q.id}>
                            <th scope="row">
                              <Link
                                className={styles.rowTitle}
                                to={`/admin/questions/${q.id}/edit`}
                              >
                                {q.prompt.slice(0, 180)}
                              </Link>
                              <span className={styles.rowSub}>Câu {adminId(q.id)}</span>
                            </th>
                            <td>{questionTypeLabel[q.type]}</td>
                            <td>{q.points}</td>
                            <td>
                              <Badge tone={q.archived ? "neutral" : "success"}>
                                {q.archived ? "Đã lưu trữ" : "Đang dùng"}
                              </Badge>
                            </td>
                            <td>{q.revision}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableScroll>
                </>
              ) : null}
              {list.questions.isSuccess ? (
                <PageEnd
                  next={Boolean(list.questions.hasNextPage)}
                  loading={list.questions.isFetchingNextPage}
                  onMore={() => void list.questions.fetchNextPage()}
                />
              ) : null}
            </section>
          ) : null}
        </div>
      </CapabilityGate>
    </CapabilityGate>
  );
}

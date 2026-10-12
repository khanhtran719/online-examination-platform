import { Link } from "react-router";

import { useTitle } from "@web/app/use-title";
import { CATEGORIES, type Category } from "@web/shared/api/dto";
import { categoryLabel, formatDateTime, formatDuration } from "@web/shared/format";
import { ExamGlyph } from "@web/shared/ui/brand";
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

import styles from "./exam-list.module.css";
import { examPublication, type Publication } from "./exam-list-model";
import { CapabilityGate } from "./gate";
import { useExamList } from "./use-exam-list";

export function AdminExamListPage() {
  useTitle("Đề thi quản trị");
  const { exams, hidden, rows, items, filters, changeFilter } = useExamList();
  return (
    <CapabilityGate permission="catalog.manage">
      <p className={styles.breadcrumb}>Quản trị / Đề thi</p>
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <span className={styles.headingIcon} aria-hidden="true">
            <ExamGlyph />
          </span>
          <div>
            <h1>Đề thi</h1>
            <p>Quản lý bản nháp, lịch thi và phiên bản phát hành.</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            disabled={hidden || exams.isFetching}
            onClick={() => void exams.refetch()}
          >
            {exams.isFetching ? "Đang tải…" : "↻ Làm mới"}
          </Button>
          <ActionLink to="/admin/exams/new">
            <span aria-hidden="true">＋</span>Tạo bản nháp
          </ActionLink>
        </div>
      </header>
      <section
        className={styles.panel}
        aria-label="Quản lý danh sách đề thi"
        aria-busy={exams.isFetching}
      >
        <div className={styles.filters}>
          <TextField
            type="search"
            label="Tìm trong các đề đã tải"
            placeholder="Nhập tên đề thi…"
            value={filters.search}
            onChange={(event) => changeFilter("search", event.target.value)}
          />
          <SelectField
            label="Trạng thái"
            value={filters.status}
            onChange={(event) => changeFilter("status", event.target.value as Publication | "all")}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="published">Đang phát hành</option>
            <option value="archived">Đã lưu trữ</option>
          </SelectField>
          <SelectField
            label="Danh mục"
            value={filters.category}
            onChange={(event) => changeFilter("category", event.target.value as Category | "all")}
          >
            <option value="all">Tất cả danh mục</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </SelectField>
        </div>
        <p className={styles.scope}>Tìm kiếm và lọc chỉ áp dụng cho các đề đã tải.</p>
        {exams.isLoading ? <SkeletonLines /> : null}
        {exams.error ? (
          <ErrorPanel
            error={exams.error}
            onRetry={hidden ? undefined : () => void exams.refetch()}
          />
        ) : null}
        {exams.isSuccess && !hidden && rows.length === 0 ? (
          <EmptyState title="Chưa có đề">Tạo bản nháp từ ngân hàng câu.</EmptyState>
        ) : null}
        {!hidden && rows.length > 0 && items.length === 0 ? (
          <EmptyState
            title="Không khớp trong phần đã tải"
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  changeFilter("search", "");
                  changeFilter("category", "all");
                  changeFilter("status", "all");
                }}
              >
                Xóa bộ lọc
              </Button>
            }
          >
            Thử bộ lọc khác hoặc tải thêm đề bên dưới.
          </EmptyState>
        ) : null}
        {items.length > 0 ? (
          <>
            <p className={styles.tableHint}>
              Cuộn ngang trong bảng để xem lịch thi, trạng thái và thao tác.
            </p>
            <TableScroll label="Danh sách đề thi quản trị">
              <table className={`${tableClass} ${styles.table}`}>
                <thead>
                  <tr>
                    <th scope="col">Đề thi</th>
                    <th scope="col">Thời lượng</th>
                    <th scope="col">Lịch thi</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((exam) => {
                    const status = examPublication(exam);
                    return (
                      <tr key={exam.id}>
                        <th scope="row">
                          <Link className={styles.title} to={`/admin/exams/${exam.id}/edit`}>
                            {exam.title}
                          </Link>
                          <Badge>{categoryLabel(exam.category)}</Badge>
                        </th>
                        <td>{formatDuration(exam.durationSeconds)}</td>
                        <td>
                          <div className={styles.schedule}>
                            <span>
                              Mở: <time dateTime={exam.openAt}>{formatDateTime(exam.openAt)}</time>
                            </span>
                            <span>
                              Đóng:{" "}
                              <time dateTime={exam.closeAt}>{formatDateTime(exam.closeAt)}</time>
                            </span>
                            <span>Giờ Việt Nam · UTC+7</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.status}>
                            <Badge
                              tone={
                                status === "archived"
                                  ? "neutral"
                                  : status === "published"
                                    ? "success"
                                    : "warning"
                              }
                            >
                              {status === "archived"
                                ? "Đã lưu trữ"
                                : status === "published"
                                  ? "✓ Đang phát hành"
                                  : "Bản nháp"}
                            </Badge>
                            <p>
                              {status !== "archived"
                                ? exam.published
                                  ? "Có phiên bản đã phát hành"
                                  : exam.publishedVersionId
                                    ? "Có phiên bản từng phát hành"
                                    : "Chưa có phiên bản phát hành"
                                : null}
                            </p>
                            <span className={styles.revision}>Bản sửa {exam.revision}</span>
                          </div>
                        </td>
                        <td>
                          <Link className={styles.edit} to={`/admin/exams/${exam.id}/edit`}>
                            {exam.archived ? "Xem đề" : "Sửa đề"}
                            <span aria-hidden="true"> →</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          </>
        ) : null}
        {!hidden && exams.data ? (
          <div className={styles.pageEnd}>
            <div>
              <p className={styles.count}>Đã tải {rows.length} đề</p>
              <p className={styles.scope} role="status">
                Hiển thị {items.length} trong phần đã tải
                {exams.hasNextPage ? ". Còn trang tiếp theo." : ". Đã tải hết danh sách."}
              </p>
            </div>
            {exams.hasNextPage ? (
              <Button
                variant="secondary"
                disabled={exams.isFetching}
                onClick={() => void exams.fetchNextPage()}
              >
                {exams.isFetchingNextPage ? "Đang tải…" : "Tải thêm đề"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>
      <p className={styles.notice}>
        <span aria-hidden="true">✓</span>Chỉnh bản nháp không đổi nội dung của các lượt thi đã bắt
        đầu. Phát hành là một thao tác riêng.
      </p>
    </CapabilityGate>
  );
}

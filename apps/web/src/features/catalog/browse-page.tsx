import { Link } from "react-router";

import { useTitle } from "@web/app/use-title";
import { CATEGORIES } from "@web/shared/api/dto";
import { isApiError } from "@web/shared/api/errors";
import { categoryLabel, formatDateTime, formatDuration, policyLabel } from "@web/shared/format";
import layout from "@web/shared/styles/layout.module.css";
import {
  Alert,
  Button,
  EmptyState,
  ErrorPanel,
  SelectField,
  SkeletonLines,
  TextField,
} from "@web/shared/ui/ui";

import styles from "./catalog-port.module.css";
import { useBrowse } from "./use-catalog";

export function BrowsePage() {
  useTitle("Đề thi");
  const c = useBrowse(),
    { query, hidden } = c;
  const expired = isApiError(query.error) && query.error.status === 400;
  return (
    <div className={`${layout.wrap} ${styles.page}`}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>KHÁM PHÁ / ĐỀ THI</p>
          <h1>Đề thi</h1>
          <p>Chọn đề, xem cấu trúc và lịch mở trước khi bắt đầu.</p>
        </div>
        <Button
          variant="secondary"
          disabled={hidden || query.isFetching}
          onClick={() => void c.refresh()}
        >
          Tải lại
        </Button>
      </header>
      {c.invalid ? (
        <Alert tone="warning" title="Bộ lọc không hợp lệ">
          Đang xem mọi danh mục. Hãy chọn một bộ lọc bên dưới.
        </Alert>
      ) : null}
      {hidden ? (
        <Alert title="Chưa thể đọc đề thi">
          Quyền truy cập hoặc phiên đăng nhập cần được kiểm tra lại.
        </Alert>
      ) : null}
      <section className={styles.filters} aria-label="Lọc đề thi">
        <div className={styles.filterTop}>
          <TextField
            label="Tìm trong các đề đã tải"
            type="search"
            value={c.search}
            disabled={hidden}
            onChange={(e) => c.setSearch(e.target.value)}
          />
          <SelectField
            label="Số dòng mỗi trang"
            value={c.pageSize}
            disabled={hidden}
            onChange={(e) => c.setPageSize(Number(e.target.value))}
          >
            <option value={20}>20</option>
            <option value={100}>100</option>
          </SelectField>
          <Button
            variant="secondary"
            disabled={hidden || (!c.category && !c.search && !c.invalid)}
            onClick={() => c.choose()}
          >
            Xóa bộ lọc
          </Button>
        </div>
        <p className={styles.muted} role="status">
          Hiển thị {c.items.length} trong {c.loaded.length} đề đã tải; tìm kiếm chỉ trong phần này.
        </p>
        <div className={styles.chips}>
          <Button
            variant={!c.category ? "primary" : "secondary"}
            disabled={hidden}
            aria-pressed={!c.category}
            onClick={() => c.choose()}
          >
            Tất cả
          </Button>
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={c.category === category ? "primary" : "secondary"}
              disabled={hidden}
              aria-pressed={c.category === category}
              onClick={() => c.choose(category)}
            >
              {categoryLabel(category)}
            </Button>
          ))}
        </div>
      </section>
      {query.isLoading ? <SkeletonLines /> : null}
      {expired ? (
        <Alert tone="warning" title="Con trỏ không còn dùng được">
          <p>Cần tải lại danh sách từ đầu.</p>
          <Button disabled={hidden || query.isFetching} onClick={() => void c.refresh()}>
            Tải lại từ đầu
          </Button>
        </Alert>
      ) : null}
      {query.error && !expired ? (
        <ErrorPanel error={query.error} onRetry={hidden ? undefined : () => void c.refresh()} />
      ) : null}
      {query.error && c.loaded.length ? (
        <p role="status">Đang giữ các đề đã tải trước; danh sách có thể đã thay đổi.</p>
      ) : null}
      {!hidden && query.isSuccess && c.loaded.length === 0 ? (
        <EmptyState
          title="Không có đề trong bộ lọc này"
          action={
            <Button variant="secondary" onClick={() => c.choose()}>
              Bỏ lọc
            </Button>
          }
        >
          Hãy chọn danh mục khác hoặc xem tất cả đề.
        </EmptyState>
      ) : null}
      {!hidden && c.loaded.length > 0 && c.items.length === 0 ? (
        <EmptyState
          title="Không khớp trong các đề đã tải"
          action={
            <Button variant="secondary" onClick={() => c.setSearch("")}>
              Xóa từ khóa
            </Button>
          }
        >
          Thử từ khóa khác hoặc tải thêm để mở rộng phần được tìm kiếm.
        </EmptyState>
      ) : null}
      <ul className={styles.cards}>
        {c.items.map((exam) => (
          <li key={exam.id} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.badge}>{categoryLabel(exam.category)}</span>
              <span className={styles.muted}>Phiên bản {exam.version}</span>
            </div>
            <h2>{exam.title}</h2>
            <p>
              {formatDuration(exam.durationSeconds)} · {exam.questionCount} câu
            </p>
            <dl className={styles.schedule}>
              <div>
                <dt>Mở</dt>
                <dd>{formatDateTime(exam.openAt, exam.displayTimezone)}</dd>
              </div>
              <div>
                <dt>Đóng</dt>
                <dd>{formatDateTime(exam.closeAt, exam.displayTimezone)}</dd>
              </div>
            </dl>
            <p className={styles.muted}>Múi giờ {exam.displayTimezone}</p>
            <p className={styles.policy}>{policyLabel(exam.explanationPolicy)}</p>
            <Link
              className={styles.primaryLink}
              to={`/exams/${exam.id}`}
              aria-label={`Xem đề ${exam.title}`}
            >
              Xem đề <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
      {!hidden && query.hasNextPage ? (
        <Button variant="secondary" disabled={query.isFetching} onClick={() => void c.more()}>
          {query.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
        </Button>
      ) : !hidden && query.isSuccess ? (
        <p className={styles.muted}>Đã hết danh sách trong bộ lọc này.</p>
      ) : null}
    </div>
  );
}

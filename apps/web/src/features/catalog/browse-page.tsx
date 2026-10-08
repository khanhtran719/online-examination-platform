import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { CATEGORIES, type Category } from "../../shared/api/dto";
import { isApiError } from "../../shared/api/errors";
import { categoryLabel, formatDateTime, formatDuration } from "../../shared/format";
import {
  Alert,
  Button,
  EmptyState,
  ErrorPanel,
  SelectField,
  SkeletonLines,
} from "../../shared/ui/ui";
import layout from "../../shared/styles/layout.module.css";
import styles from "./catalog.module.css";

export function BrowsePage() {
  useTitle("Đề thi");
  const { api } = useRuntime();
  const [params, setParams] = useSearchParams();
  const requested = params.get("category");
  const category = CATEGORIES.includes(requested as Category) ? (requested as Category) : undefined;
  const invalid = requested !== null && !category;
  const [pageSize, setPageSize] = useState(20);
  const queryClient = useQueryClient();
  const exams = useInfiniteQuery({
    queryKey: ["exams", category ?? "*", pageSize],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.browseExams({ pageSize, cursor: pageParam, category }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const items = exams.data?.pages.flatMap((page) => page.items) ?? [];
  const expired = isApiError(exams.error) && exams.error.status === 400;
  return (
    <div className={layout.wrap}>
      <header className={styles.pageHeading}>
        <p className={styles.eyebrow}>CHỌN THỬ THÁCH TIẾP THEO</p>
        <h1 className={layout.title}>Đề thi</h1>
        <p className={layout.muted}>Chọn danh mục, xem cấu trúc và lịch mở trước khi bắt đầu.</p>
      </header>
      {invalid ? (
        <Alert tone="warning" title="Bộ lọc không hợp lệ">
          Đang xem mọi danh mục. Hãy chọn một bộ lọc bên dưới.
        </Alert>
      ) : null}
      <section className={`${styles.panel} ${styles.filters}`} aria-label="Lọc đề thi">
        <div className={layout.chips}>
          <button
            type="button"
            className={`${layout.chip} ${!category ? layout.chipCurrent : ""}`}
            aria-pressed={!category}
            onClick={() => setParams({})}
          >
            Tất cả
          </button>
          {CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              className={`${layout.chip} ${item === category ? layout.chipCurrent : ""}`}
              aria-pressed={item === category}
              onClick={() => setParams({ category: item })}
            >
              {categoryLabel(item)}
            </button>
          ))}
        </div>
        <div className={styles.listSize}>
          <SelectField
            label="Số dòng mỗi trang"
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
          >
            <option value={20}>20</option>
            <option value={100}>100</option>
          </SelectField>
        </div>
      </section>
      {exams.isLoading ? <SkeletonLines /> : null}
      {expired ? (
        <Alert title="Con trỏ không còn dùng được">
          <Button
            onClick={() =>
              void queryClient.resetQueries({ queryKey: ["exams", category ?? "*", pageSize] })
            }
          >
            Tải lại từ đầu
          </Button>
        </Alert>
      ) : null}
      {exams.error && !expired ? (
        <ErrorPanel error={exams.error} onRetry={() => void exams.refetch()} />
      ) : null}
      {exams.isSuccess && items.length === 0 ? (
        <EmptyState
          title="Không có đề trong bộ lọc này"
          action={
            <Button variant="secondary" onClick={() => setParams({})}>
              Bỏ lọc
            </Button>
          }
        >
          Hãy chọn danh mục khác hoặc xem tất cả đề.
        </EmptyState>
      ) : null}
      <ul className={styles.examList}>
        {items.map((exam) => (
          <li key={exam.id}>
            <Link className={styles.examRow} to={`/exams/${exam.id}`}>
              <span className={styles.paperIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5" />
                </svg>
              </span>
              <div className={styles.examCopy}>
                <p className={styles.eyebrow}>{categoryLabel(exam.category)}</p>
                <h2>{exam.title}</h2>
                <p>
                  {formatDuration(exam.durationSeconds)} <span aria-hidden="true">·</span>{" "}
                  {exam.questionCount} câu <span aria-hidden="true">·</span> Phiên bản{" "}
                  {exam.version}
                </p>
                <p className={styles.caption}>
                  Mở {formatDateTime(exam.openAt, exam.displayTimezone)} · Đóng{" "}
                  {formatDateTime(exam.closeAt, exam.displayTimezone)} ({exam.displayTimezone})
                </p>
              </div>
              <span className={styles.rowAction}>
                Xem đề <span aria-hidden="true">↗</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {exams.hasNextPage ? (
        <Button disabled={exams.isFetchingNextPage} onClick={() => void exams.fetchNextPage()}>
          {exams.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
        </Button>
      ) : exams.isSuccess ? (
        <p className={styles.caption}>Đã hết danh sách trong bộ lọc này.</p>
      ) : null}
    </div>
  );
}

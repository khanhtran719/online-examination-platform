import { Link } from "react-router";

import { CATEGORIES } from "@web/shared/api/dto";
import { categoryLabel, formatDuration } from "@web/shared/format";
import { ExamGlyph } from "@web/shared/ui/brand";
import { Alert, Badge, Button, EmptyState, ErrorPanel, SkeletonLines } from "@web/shared/ui/ui";

import styles from "./dashboard.module.css";
import type { useDashboard } from "./use-dashboard";

export function DashboardCatalog({ model }: { model: ReturnType<typeof useDashboard> }) {
  const { catalog, category } = model;
  return (
    <section className={styles.catalog} aria-labelledby="dashboard-catalog-title">
      <div className={styles.sectionHeading}>
        <h2 id="dashboard-catalog-title">Khám phá danh mục đề thi</h2>
        <div className={styles.catalogActions}>
          <Button
            variant="secondary"
            disabled={model.catalogDenied || catalog.isFetching || model.catalogWait > 0}
            onClick={() => void model.retryCatalog()}
          >
            {model.catalogWait
              ? `Tải danh mục sau ${model.catalogWait} giây`
              : catalog.isFetching
                ? "Đang tải danh mục…"
                : "Tải lại danh mục"}
          </Button>
          <Link to={category ? `/exams?category=${category}` : "/exams"}>
            Xem tất cả đề thi <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      <p className={styles.caption}>
        Tối đa 3 đề trong danh mục đã chọn. Danh sách đầy đủ có trong trang đề thi.
      </p>
      <div className={styles.filters} role="group" aria-label="Lọc danh mục đề thi">
        <button
          type="button"
          disabled={model.catalogDenied || catalog.isFetching || model.catalogWait > 0}
          aria-pressed={!category}
          onClick={() => model.setCategory(undefined)}
        >
          Tất cả
        </button>
        {CATEGORIES.map((value) => (
          <button
            key={value}
            type="button"
            disabled={model.catalogDenied || catalog.isFetching || model.catalogWait > 0}
            aria-pressed={category === value}
            onClick={() => model.setCategory(value)}
          >
            {categoryLabel(value)}
          </button>
        ))}
      </div>
      {catalog.isLoading ? <SkeletonLines /> : null}
      {catalog.error ? <ErrorPanel error={catalog.error} /> : null}
      {catalog.error && catalog.data ? (
        <Alert tone="warning" title="Danh mục từ lần tải trước">
          Danh sách có thể đã thay đổi. Tải lại để kiểm tra trước khi chọn đề.
        </Alert>
      ) : null}
      {catalog.data?.items.length === 0 ? (
        <EmptyState
          title="Chưa có đề thi trong danh mục này"
          action={<Link to="/exams">Xem danh sách đề thi</Link>}
        >
          Chọn một danh mục khác hoặc quay lại sau.
        </EmptyState>
      ) : null}
      <div className={styles.examGrid}>
        {catalog.data?.items.map((exam) => (
          <Link key={exam.id} className={styles.examCard} to={`/exams/${exam.id}`}>
            <div className={styles.cardTop}>
              <span className={styles.examIcon} aria-hidden="true">
                <ExamGlyph />
              </span>
              <Badge>{categoryLabel(exam.category)}</Badge>
            </div>
            <h3>{exam.title}</h3>
            <p>
              {formatDuration(exam.durationSeconds)} · {exam.questionCount} câu hỏi
            </p>
            <span className={styles.cardAction}>
              Xem đề <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

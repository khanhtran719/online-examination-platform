import { useRef, useState } from "react";
import { useParams } from "react-router";

import { useSession } from "@web/app/session";
import { useTitle } from "@web/app/use-title";
import type { ReviewQuestion } from "@web/shared/api/dto";
import layout from "@web/shared/styles/layout.module.css";
import { ActionLink, Alert, Button, ErrorPanel, SkeletonLines } from "@web/shared/ui/ui";

import styles from "./result-detail.module.css";
import { useReleasedReview } from "./use-released-review";

const types = {
  SINGLE_CHOICE: "Một lựa chọn",
  MULTIPLE_CHOICE: "Nhiều lựa chọn",
  TRUE_FALSE: "Đúng / Sai",
};
export function ReviewPage() {
  const { attemptId = "" } = useParams(),
    session = useSession();
  return <ReleasedReview key={`${session.profile?.id}/${attemptId}`} attemptId={attemptId} />;
}
function ReleasedReview({ attemptId }: { attemptId: string }) {
  useTitle("Giải thích");
  const read = useReleasedReview(attemptId);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "correct" | "wrong">("all");
  const heading = useRef<HTMLHeadingElement>(null);
  const rows = read.rows;
  const ordinals = new Map(rows.map((item, index) => [item.question.id, index + 1]));
  const filtered = rows.filter(
    (row) => filter === "all" || (filter === "correct" ? row.correct : !row.correct),
  );
  const row = filtered.find((item) => item.question.id === selected) ?? filtered[0];
  const index = filtered.findIndex((item) => item === row);
  function choose(id: string) {
    setSelected(id);
    // Focus only follows an explicit navigation action, never an arriving page.
    requestAnimationFrame(() => heading.current?.focus());
  }
  return (
    <div className={layout.wrap}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>XEM LẠI BÀI LÀM</p>
          <h1 className={layout.title}>Giải thích</h1>
          <p className={layout.muted}>
            {read.gate.frozen?.title ?? "Xem lại bài làm khi đáp án và giải thích được công bố."}
          </p>
        </div>
        <ActionLink variant="secondary" to={`/attempts/${attemptId}/result`}>
          ← Về kết quả
        </ActionLink>
      </header>
      {read.gate.query.isFetching ? <SkeletonLines /> : null}
      {read.gate.query.error ? (
        <ErrorPanel
          error={read.gate.query.error}
          onRetry={read.gate.hidden ? undefined : () => void read.gate.refresh()}
        />
      ) : null}
      {read.gate.hidden ? (
        <Alert title="Không thể xem giải thích">
          Kiểm tra phiên đăng nhập và quyền xem rồi mở lại lượt thi từ lịch sử.
        </Alert>
      ) : null}
      {!read.allowed &&
      !read.gate.query.isFetching &&
      !read.gate.query.error &&
      !read.gate.hidden ? (
        <section className={styles.panel}>
          <h2>Chưa mở giải thích</h2>
          <p>Phần giải thích chỉ có khi được công bố cho lượt thi này.</p>
        </section>
      ) : null}
      {read.allowed ? (
        <>
          <div className={styles.reviewBanner}>
            {!read.hidden ? <span className={styles.badge}>✓ Đáp án đã công bố</span> : null}
            <p>Chế độ xem lại · Không thay đổi bài đã nộp</p>
            <Button
              variant="secondary"
              disabled={read.hidden || read.gate.query.isFetching || read.query.isFetching}
              onClick={() => void read.checkRelease()}
            >
              Làm mới quyền xem
            </Button>
          </div>
          {read.query.isLoading && !read.hidden ? <SkeletonLines /> : null}
          {read.query.error ? (
            <ErrorPanel
              error={read.query.error}
              onRetry={read.hidden ? undefined : () => void read.refresh()}
            />
          ) : null}
          {read.hidden ? (
            <Alert title="Đã đóng phần giải thích">
              Đáp án và giải thích đã được xoá khỏi trang này.
            </Alert>
          ) : null}
          {!read.hidden ? (
            <div className={styles.reviewGrid}>
              <div className={styles.reviewMain}>
                {row ? (
                  <>
                    <section className={styles.panel} aria-label="Câu đang xem">
                      <div className={styles.heading}>
                        <span className={styles.badge}>
                          Câu {ordinals.get(row.question.id)} trong {rows.length} câu đã tải
                        </span>
                        <span className={styles.caption}>
                          {types[row.question.type]} · {row.question.points} điểm
                        </span>
                      </div>
                      <div className={styles.actions}>
                        <Button
                          variant="secondary"
                          disabled={index <= 0}
                          onClick={() => choose(filtered[index - 1]!.question.id)}
                        >
                          Câu trước
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={index < 0 || index >= filtered.length - 1}
                          onClick={() => choose(filtered[index + 1]!.question.id)}
                        >
                          Câu sau
                        </Button>
                      </div>
                      {row.question.type === "MULTIPLE_CHOICE" ? (
                        <p className={styles.rule}>
                          ⓘ Câu nhiều lựa chọn chỉ có điểm khi chọn đúng trọn bộ đáp án.
                        </p>
                      ) : null}
                      <h2 ref={heading} tabIndex={-1} className={styles.prompt}>
                        {row.question.prompt}
                      </h2>
                      <ReviewOptions row={row} />
                      <div className={styles.verdict} data-correct={row.correct}>
                        <strong>{row.correct ? "✓ Đúng" : "! Chưa đúng"}</strong>
                        <span>
                          {row.correct
                            ? "Bộ lựa chọn khớp chính xác với đề."
                            : "Bộ lựa chọn chưa khớp chính xác với đề."}
                        </span>
                      </div>
                    </section>
                    <section className={styles.panel} aria-label="Lời giải câu đang xem">
                      <h2>Phân tích &amp; Lời giải chi tiết</h2>
                      <p className={styles.explanation}>
                        {row.explanation ?? "Chưa có giải thích."}
                      </p>
                    </section>
                  </>
                ) : read.query.isSuccess ? (
                  <section className={styles.panel}>
                    <h2>{rows.length ? "Không có câu khớp bộ lọc" : "Chưa có câu để hiển thị"}</h2>
                    <p>Chọn bộ lọc khác hoặc tải thêm câu nếu có.</p>
                  </section>
                ) : null}
              </div>
              <aside className={styles.navigator} aria-label="Danh sách câu hỏi đã tải">
                <h2>Danh sách câu hỏi</h2>
                <p className={styles.caption}>
                  {rows.length} câu đã tải ·{" "}
                  {read.query.hasNextPage ? "Còn trang tiếp theo" : "Đã tải hết"}
                </p>
                <p className={styles.legend}>
                  <span>✓ Đúng</span>
                  <span>! Chưa đúng</span>
                  <span>Viền đậm: đang xem</span>
                </p>
                <div className={styles.filters} aria-label="Lọc trong các câu đã tải">
                  {(
                    [
                      ["all", `Tất cả (${rows.length})`],
                      ["correct", `Đúng (${rows.filter((item) => item.correct).length})`],
                      ["wrong", `Chưa đúng (${rows.filter((item) => !item.correct).length})`],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={filter === value}
                      onClick={() => {
                        setFilter(value);
                        setSelected(null);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className={styles.caption}>Chỉ lọc trong các câu đã tải.</p>
                <nav className={styles.numbers} aria-label="Chọn câu để xem">
                  {filtered.map((item) => (
                    <button
                      key={item.question.id}
                      type="button"
                      data-correct={item.correct}
                      aria-current={item === row ? "true" : undefined}
                      aria-label={`Câu ${ordinals.get(item.question.id)}, ${item.correct ? "Đúng" : "Chưa đúng"}`}
                      onClick={() => choose(item.question.id)}
                    >
                      <span>{ordinals.get(item.question.id)}</span>
                      <small aria-hidden="true">{item.correct ? "✓" : "!"}</small>
                    </button>
                  ))}
                </nav>
                {read.query.hasNextPage ? (
                  <Button
                    variant="secondary"
                    disabled={read.query.isFetching}
                    onClick={() => void read.more()}
                  >
                    {read.query.isFetchingNextPage ? "Đang tải…" : "Tải thêm câu hỏi"}
                  </Button>
                ) : null}
              </aside>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
function ReviewOptions({ row }: { row: ReviewQuestion }) {
  const selected = new Set(row.selectedOptionIds),
    keys = new Set(row.correctOptionIds);
  return (
    <div className={styles.options}>
      {row.question.options.map((option, index) => (
        <div
          key={option.id}
          className={styles.option}
          data-correct={keys.has(option.id)}
          data-selected={selected.has(option.id)}
        >
          <span className={styles.letter} aria-hidden="true">
            {String.fromCharCode(65 + index)}
          </span>
          <p>{option.text}</p>
          <span className={styles.optionNote}>
            {selected.has(option.id) ? "Bạn đã chọn" : "Bạn không chọn"}
            {keys.has(option.id) ? " · ✓ Đáp án của đề" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

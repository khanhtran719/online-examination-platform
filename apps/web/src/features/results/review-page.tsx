import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { useProtectedAccess } from "../../shared/protected-access";
import { isReleasedReviewHref } from "../../shared/review-href";
import { Button, ErrorPanel, SkeletonLines } from "../../shared/ui/ui";
import layout from "../../shared/styles/layout.module.css";
import styles from "./results.module.css";

export function ReviewPage() {
  const { attemptId = "" } = useParams();
  return <ReleasedReview key={attemptId} attemptId={attemptId} />;
}
function ReleasedReview({ attemptId }: { attemptId: string }) {
  useTitle("Giải thích");
  const { api } = useRuntime();
  const [reviewBlocked, setReviewBlocked] = useState(false);
  const [resultBlocked, setResultBlocked] = useState(false);
  const gate = useQuery({
    queryKey: ["result", attemptId],
    enabled: !resultBlocked,
    queryFn: () => api.getResult(attemptId).then((response) => response.data),
  });
  const href = gate.data?.result?.review?.href ?? "";
  const allowed =
    gate.data?.result != null &&
    gate.data.result.review !== null &&
    isReleasedReviewHref(attemptId, href);
  const review = useInfiniteQuery({
    queryKey: ["review", attemptId],
    enabled: allowed && !reviewBlocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api
        .getReleasedReview(attemptId, { pageSize: 20, cursor: pageParam })
        .then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hideReview = useProtectedAccess(review.error, [["review", attemptId]], reviewBlocked, () =>
    setReviewBlocked(true),
  );
  const hideResult = useProtectedAccess(gate.error, [["result", attemptId]], resultBlocked, () =>
    setResultBlocked(true),
  );
  if (gate.isLoading)
    return (
      <div className={layout.wrap}>
        <SkeletonLines />
      </div>
    );
  if (hideResult || gate.error)
    return (
      <div className={layout.wrap}>
        <ErrorPanel
          error={gate.error}
          onRetry={hideResult ? undefined : () => void gate.refetch()}
        />
        <Link className={layout.chip} to="/history">
          Về lịch sử
        </Link>
      </div>
    );
  if (!allowed)
    return (
      <div className={layout.wrap}>
        <h1 className={layout.title}>Chưa mở giải thích</h1>
        <p>Phần giải thích chỉ có khi được công bố cho lượt thi này.</p>
        <Link className={layout.chip} to={`/attempts/${attemptId}/result`}>
          Về kết quả
        </Link>
      </div>
    );
  const rows = hideReview ? [] : (review.data?.pages.flatMap((page) => page.items) ?? []);
  return (
    <div className={layout.wrap}>
      <header className={styles.pageHeader}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>XEM LẠI BÀI LÀM</p>
          <h1 className={layout.title}>Giải thích</h1>
          <p className={layout.muted}>
            Lựa chọn của bạn và đáp án đã được công bố cho lượt thi này.
          </p>
        </div>
        <Link className={layout.chip} to={`/attempts/${attemptId}/result`}>
          ← Về kết quả
        </Link>
      </header>
      {review.isLoading ? <SkeletonLines /> : null}
      {review.error ? (
        <ErrorPanel
          error={review.error}
          onRetry={hideReview ? undefined : () => void review.refetch()}
        />
      ) : null}
      {rows.map((row) => (
        <article key={row.question.id} className={styles.panel}>
          <div className={styles.pageHeader}>
            <p className={styles.caption}>
              Câu {row.question.position} · {row.question.points} điểm
            </p>
            <span className={styles.badge} data-wrong={!row.correct}>
              {row.correct ? "✓ Đúng" : "! Chưa đúng"}
            </span>
          </div>
          <h2 className={styles.reviewPrompt}>{row.question.prompt}</h2>
          <div className={styles.reviewOptions}>
            {row.question.options.map((option, index) => {
              const selected = row.selectedOptionIds.includes(option.id);
              const correct = row.correctOptionIds.includes(option.id);
              return (
                <div
                  key={option.id}
                  className={styles.reviewOption}
                  data-correct={correct}
                  data-selected={selected}
                >
                  <span className={styles.optionLetter} aria-hidden="true">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <p>{option.text}</p>
                  {selected || correct ? (
                    <span className={styles.optionNote}>
                      {selected ? "Bạn đã chọn" : ""}
                      {selected && correct ? " · " : ""}
                      {correct ? "✓ Đáp án của đề" : ""}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className={styles.explanation}>
            <h3>Giải thích</h3>
            <p>{row.explanation ?? "Chưa có giải thích."}</p>
          </div>
        </article>
      ))}
      {review.hasNextPage && !hideReview ? (
        <Button disabled={review.isFetchingNextPage} onClick={() => void review.fetchNextPage()}>
          {review.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
        </Button>
      ) : null}
    </div>
  );
}

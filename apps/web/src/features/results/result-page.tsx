import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { useMemory } from "../../app/memory";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { formatBasisPoints, formatDateTime } from "../../shared/format";
import { isReleasedReviewHref } from "../../shared/review-href";
import { Alert, ErrorPanel, SkeletonLines } from "../../shared/ui/ui";
import layout from "../../shared/styles/layout.module.css";
import styles from "./results.module.css";

export function ResultPage() {
  const { attemptId = "" } = useParams();
  useTitle("Kết quả");
  const { api } = useRuntime();
  const memory = useMemory();
  const result = useQuery({
    queryKey: ["result", attemptId],
    queryFn: () => api.getResult(attemptId).then((response) => response.data),
  });
  const status = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => api.resumeAttempt(attemptId).then((response) => response.data),
    enabled: result.isSuccess,
  });
  if (result.isLoading)
    return (
      <div className={layout.wrap}>
        <SkeletonLines />
      </div>
    );
  if (result.error || !result.data)
    return (
      <div className={layout.wrap}>
        <ErrorPanel error={result.error} onRetry={() => void result.refetch()} />
      </div>
    );
  if (result.data.pending || !result.data.result)
    return (
      <div className={layout.wrap}>
        <h1 className={layout.title}>Kết quả chưa sẵn sàng</h1>
        <Alert tone="warning" title="Máy chủ đã nhận yêu cầu">
          Bài còn chờ xử lý. Điểm sẽ xuất hiện sau khi có kết quả.
        </Alert>
        <Link className={styles.primaryLink} to={`/attempts/${attemptId}/status`}>
          Theo dõi trạng thái
        </Link>
      </div>
    );
  const score = result.data.result;
  const frozen = memory.lookup(score.publishedVersionId);
  const href = score.review?.href ?? "";
  const reviewAllowed = score.review !== null && isReleasedReviewHref(attemptId, href);
  return (
    <div className={layout.wrap}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>KẾT QUẢ CỦA BẠN</p>
        <h1 className={layout.title}>Kết quả</h1>
        <p className={layout.muted}>
          {frozen?.title ?? `Phiên bản …${score.publishedVersionId.slice(-6)}`} · Hoàn tất{" "}
          {formatDateTime(score.completedAt)}
        </p>
      </header>
      <div className={styles.resultGrid}>
        <section className={styles.scorePanel} aria-label="Điểm bài thi">
          <p className={styles.eyebrow}>ĐIỂM BÀI TRẮC NGHIỆM</p>
          <span className={styles.resultCheck} aria-hidden="true">
            ✓
          </span>
          <p className={styles.scoreNumber}>
            {score.earned}
            <small>/{score.possible} điểm</small>
          </p>
          <p className={styles.percentage}>{formatBasisPoints(score.percentageBasisPoints)}</p>
          <p>Theo thang điểm cơ sở của bài này.</p>
          <dl className={styles.scoreFacts}>
            <div>
              <dt>Câu khớp chính xác</dt>
              <dd>
                {score.correct}/{score.total}
              </dd>
            </div>
            <div>
              <dt>Trạng thái nộp</dt>
              <dd>{score.expired ? "Hết giờ" : "Trong hạn"}</dd>
            </div>
          </dl>
          <p className={styles.scoreNote}>Không quy đổi sang IELTS band hoặc TOEIC.</p>
        </section>
        <section className={styles.panel}>
          <h2>Theo phần</h2>
          {!frozen ? (
            <p className={styles.caption}>Tên phần chỉ hiện khi có thông tin đúng phiên bản.</p>
          ) : null}
          <ul className={styles.sectionScores}>
            {score.sections.map((section) => {
              const known = frozen?.sections.find((item) => item.id === section.sectionId);
              return (
                <li key={section.sectionId}>
                  <div>
                    <h3>{known?.title ?? `Phần …${section.sectionId.slice(-6)}`}</h3>
                    <p className={styles.caption}>
                      {section.correct}/{section.total} câu khớp chính xác
                    </p>
                  </div>
                  <strong>
                    {section.earned}/{section.possible} điểm
                  </strong>
                </li>
              );
            })}
          </ul>
          <p className={styles.caption}>
            Chấm theo bộ lựa chọn khớp chính xác; không tính điểm từng lựa chọn.
          </p>
          {score.review === null ? (
            <p className={styles.releaseNote}>Đề này chưa mở phần giải thích.</p>
          ) : null}
          {score.review && !reviewAllowed ? (
            <Alert title="Không tải giải thích">Liên kết không nằm trong danh sách cho phép.</Alert>
          ) : null}
          {reviewAllowed ? (
            <>
              <p className={styles.releaseNote}>Giải thích đã mở cho lượt thi này.</p>
              <Link className={styles.primaryLink} to={`/attempts/${attemptId}/review`}>
                Xem giải thích đã mở
              </Link>
            </>
          ) : null}
          {status.data ? (
            <Link
              className={layout.chip}
              to={`/exams/${status.data.examId}/versions/${score.publishedVersionId}/leaderboard`}
            >
              Bảng xếp hạng của phiên bản này
            </Link>
          ) : null}
          <p className={styles.caption}>Bảng xếp hạng chỉ hiện khi phiên bản cho phép công bố.</p>
        </section>
      </div>
      <div className={styles.actions}>
        <Link className={layout.chip} to="/history">
          ← Về lịch sử
        </Link>
        <Link className={layout.chip} to="/exams">
          Chọn đề khác →
        </Link>
      </div>
    </div>
  );
}

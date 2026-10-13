import { useParams } from "react-router";

import { useTitle } from "@web/app/use-title";
import { formatBasisPoints, formatDateTime } from "@web/shared/format";
import { isReleasedReviewHref } from "@web/shared/review-href";
import layout from "@web/shared/styles/layout.module.css";
import { ActionLink, Alert, Button, ErrorPanel, SkeletonLines } from "@web/shared/ui/ui";

import styles from "./result-detail.module.css";
import { useAttemptResult } from "./use-attempt-result";

export function ResultPage() {
  const { attemptId = "" } = useParams();
  useTitle("Kết quả");
  const read = useAttemptResult(attemptId);
  const score = read.score;
  const reviewAllowed = !!score?.review && isReleasedReviewHref(attemptId, score.review.href);
  const sections = new Map(read.frozen?.sections.map((section) => [section.id, section.title]));
  return (
    <div className={layout.wrap}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>LỊCH SỬ THI / CHI TIẾT LƯỢT THI</p>
          <h1 className={layout.title}>
            {read.data?.pending ? "Kết quả chưa sẵn sàng" : "Kết quả"}
          </h1>
          <p className={layout.muted}>
            {read.frozen?.title ??
              (score
                ? `Phiên bản …${score.publishedVersionId.slice(-6)}`
                : "Điểm và kết quả của lượt thi của bạn.")}
          </p>
        </div>
        {score ? (
          <div className={styles.completed}>
            <span>HOÀN TẤT CHẤM ĐIỂM</span>
            <time dateTime={score.completedAt}>{formatDateTime(score.completedAt)}</time>
            <small>Giờ Việt Nam · UTC+7</small>
          </div>
        ) : null}
      </header>
      {read.query.isLoading && !read.hidden ? <SkeletonLines /> : null}
      {read.query.error ? (
        <ErrorPanel
          error={read.query.error}
          onRetry={read.hidden ? undefined : () => void read.refresh()}
        />
      ) : null}
      {read.hidden ? (
        <Alert title="Không thể xem kết quả">
          Mở lại lượt thi từ lịch sử sau khi kiểm tra phiên đăng nhập và quyền xem.
        </Alert>
      ) : null}
      {read.data?.pending ? (
        <section className={styles.panel}>
          <Alert tone="warning" title="Chưa có kết quả để hiển thị">
            Theo dõi trạng thái để biết lượt thi còn đang mở, chờ xử lý hay đã hoàn tất. Chỉ những
            đáp án có xác nhận lưu mới thuộc bài đã nộp.
          </Alert>
          <ActionLink to={`/attempts/${attemptId}/status`}>Theo dõi trạng thái</ActionLink>
        </section>
      ) : null}
      {score ? (
        <>
          <div className={styles.scoreGrid}>
            <section className={styles.scoreCard} aria-label="Điểm bài thi">
              <span className={styles.badge}>✓ Hoàn thành chấm điểm</span>
              <div>
                <p className={styles.eyebrow}>ĐIỂM BÀI TRẮC NGHIỆM</p>
                <p className={styles.score}>
                  {score.earned}
                  <small>/{score.possible} điểm</small>
                </p>
              </div>
              <p className={styles.caption}>
                Theo thang điểm cơ sở của đề. Không quy đổi sang IELTS band hoặc TOEIC.
              </p>
            </section>
            <section className={styles.metric} aria-label="Số câu đúng">
              <span className={styles.metricIcon} aria-hidden="true">
                ✓
              </span>
              <h2>Câu khớp chính xác</h2>
              <strong>
                {score.correct}
                <small> / {score.total} câu</small>
              </strong>
              <p className={styles.caption}>Khớp trọn bộ lựa chọn của đề.</p>
            </section>
            <section className={styles.metric} aria-label="Tỷ lệ điểm">
              <span className={styles.metricIcon} aria-hidden="true">
                %
              </span>
              <h2>Tỷ lệ điểm đạt</h2>
              <strong className={styles.percent}>
                {formatBasisPoints(score.percentageBasisPoints)}
              </strong>
              <p className={styles.caption}>Tỷ lệ điểm do máy chủ cung cấp.</p>
            </section>
          </div>
          <section className={styles.panel}>
            <div className={styles.heading}>
              <div>
                <h2>Kết quả từng phần thi</h2>
                <p className={styles.caption}>
                  Điểm và số câu khớp chính xác theo phiên bản đã làm.
                </p>
              </div>
              <span className={styles.badge}>{score.expired ? "◷ Hết giờ" : "✓ Trong hạn"}</span>
            </div>
            {!read.frozen ? (
              <p className={styles.caption}>
                Tên phần chỉ hiện khi có thông tin đúng đề và phiên bản.
              </p>
            ) : null}
            <ul className={styles.sections}>
              {score.sections.map((section, index) => (
                <li key={section.sectionId}>
                  <div>
                    <p className={styles.eyebrow}>PHẦN {String(index + 1).padStart(2, "0")}</p>
                    <h3>
                      {sections.get(section.sectionId) ?? `Phần …${section.sectionId.slice(-6)}`}
                    </h3>
                  </div>
                  <strong>
                    {section.earned}/{section.possible} điểm
                  </strong>
                  <span>
                    {section.correct}/{section.total} câu khớp chính xác
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.caption}>
              Chấm theo bộ lựa chọn khớp chính xác; không tính điểm từng lựa chọn.
            </p>
          </section>
          <section className={styles.panel} aria-label="Hành động sau kết quả">
            <div className={styles.actions}>
              {reviewAllowed ? (
                <ActionLink to={`/attempts/${attemptId}/review`}>Xem giải thích đã mở</ActionLink>
              ) : null}
              <ActionLink variant="secondary" to="/history">
                Về lịch sử
              </ActionLink>
              {read.attempt ? (
                <ActionLink
                  variant="secondary"
                  to={`/exams/${read.attempt.examId}/versions/${score.publishedVersionId}/leaderboard`}
                >
                  Bảng xếp hạng của phiên bản này
                </ActionLink>
              ) : null}
              <ActionLink variant="secondary" to="/exams">
                Chọn đề khác
              </ActionLink>
            </div>
            <p className={styles.caption}>
              {reviewAllowed
                ? "Giải thích đã mở cho lượt thi này."
                : "Đề này chưa mở phần giải thích."}{" "}
              Bảng xếp hạng chỉ hiện khi phiên bản cho phép công bố.
            </p>
            {score.review && !reviewAllowed ? (
              <Alert title="Không tải giải thích">
                Liên kết không nằm trong danh sách cho phép.
              </Alert>
            ) : null}
            <Button
              variant="ghost"
              disabled={read.query.isFetching}
              onClick={() => void read.refresh()}
            >
              {read.query.isFetching ? "Đang kiểm tra…" : "Kiểm tra lại kết quả"}
            </Button>
          </section>
        </>
      ) : (
        <ActionLink variant="secondary" to="/history">
          Về lịch sử
        </ActionLink>
      )}
    </div>
  );
}

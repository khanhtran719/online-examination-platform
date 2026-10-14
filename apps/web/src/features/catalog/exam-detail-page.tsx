import { Link, useParams } from "react-router";

import { useTitle } from "@web/app/use-title";
import { categoryLabel, formatDateTime, formatDuration, policyLabel } from "@web/shared/format";
import layout from "@web/shared/styles/layout.module.css";
import { Alert, Button, ErrorPanel, SkeletonLines } from "@web/shared/ui/ui";

import styles from "./catalog-port.module.css";
import { StartConfirmation } from "./start-confirmation";
import { useExamDetail } from "./use-catalog";
import { useExamStart } from "./use-exam-start";

export function ExamDetailPage() {
  const { examId = "" } = useParams();
  return <ExamDetail key={examId} examId={examId} />;
}
function ExamDetail({ examId }: { examId: string }) {
  useTitle("Chi tiết đề");
  const { query, hidden, data: detail, refresh, waiting } = useExamDetail(examId);
  const start = useExamStart(examId, Boolean(detail) && !hidden);
  return (
    <div className={`${layout.wrap} ${styles.page}`}>
      <div className={styles.heading}>
        <Link className={styles.backLink} to="/exams">
          ← Danh sách đề
        </Link>
        <Button
          variant="secondary"
          disabled={hidden || waiting || query.isFetching || start.phase !== "idle"}
          onClick={() => void refresh()}
        >
          Tải lại
        </Button>
      </div>
      {query.isLoading ? <SkeletonLines /> : null}
      {hidden ? (
        <Alert title="Chưa thể đọc đề thi">
          Quyền truy cập hoặc phiên đăng nhập cần được kiểm tra lại.
        </Alert>
      ) : null}
      {query.error ? (
        <ErrorPanel
          error={query.error}
          onRetry={hidden || waiting ? undefined : () => void refresh()}
        />
      ) : null}
      {detail ? (
        <>
          {query.error ? (
            <p role="status">
              Đang hiển thị thông tin lần tải thành công trước. Hệ thống kiểm tra lại đề khi bắt
              đầu.
            </p>
          ) : null}
          <div className={styles.columns}>
            <div className={styles.stack}>
              <header className={styles.panel}>
                <div className={styles.cardTop}>
                  <span className={styles.badge}>{categoryLabel(detail.category)}</span>
                  <span className={styles.muted}>Phiên bản {detail.version}</span>
                </div>
                <h1>{detail.title}</h1>
                <p>Xem cấu trúc đề và dành một khoảng thời gian để tập trung.</p>
                <dl className={styles.facts}>
                  <div>
                    <dt>Thời lượng</dt>
                    <dd>{formatDuration(detail.durationSeconds)}</dd>
                  </div>
                  <div>
                    <dt>Cấu trúc</dt>
                    <dd>{detail.questionCount} câu</dd>
                  </div>
                  <div>
                    <dt>Giới hạn</dt>
                    <dd>{detail.attemptLimit} lượt</dd>
                  </div>
                </dl>
              </header>
              <section className={styles.panel}>
                <div className={styles.cardTop}>
                  <h2>Cấu trúc từng phần thi</h2>
                  <span className={styles.badge}>{detail.sections.length} phần</span>
                </div>
                <ol className={styles.sections}>
                  {detail.sections.map((section, index) => (
                    <li key={section.id}>
                      <span className={styles.number} aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3>{section.title}</h3>
                        <p>
                          {section.questionCount} câu · {section.possible} điểm
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              <section className={styles.panel}>
                <h2>Quy tắc làm bài và chấm điểm</h2>
                <div className={styles.rules}>
                  <div>
                    <h3>Chọn đúng toàn bộ</h3>
                    <p>
                      Câu nhiều lựa chọn chỉ có điểm khi chọn đúng toàn bộ đáp án, không tính điểm
                      từng phần.
                    </p>
                  </div>
                  <div>
                    <h3>Lời giải</h3>
                    <p>{policyLabel(detail.explanationPolicy)}</p>
                  </div>
                  <div>
                    <h3>Trạng thái lưu</h3>
                    <p>
                      Kiểm tra trạng thái “Đã lưu” khi làm bài. Đáp án chưa được xác nhận lưu có thể
                      chưa đến hệ thống.
                    </p>
                  </div>
                  <div>
                    <h3>Khi hết giờ</h3>
                    <p>
                      Hệ thống tự nộp các đáp án đã lưu đúng hạn. Thời gian còn lại sẽ hiện trong
                      phòng thi.
                    </p>
                  </div>
                </div>
                <p className={styles.notice}>
                  Vào gần giờ đóng có thể ít thời gian hơn thời lượng đầy đủ. Hệ thống kiểm tra lịch
                  và số lượt còn lại khi bắt đầu.
                </p>
              </section>
            </div>
            <aside className={`${styles.panel} ${styles.startPanel}`}>
              <h2>Thông tin lượt thi</h2>
              <dl className={styles.schedule}>
                <div>
                  <dt>Thời lượng</dt>
                  <dd>{formatDuration(detail.durationSeconds)}</dd>
                </div>
                <div>
                  <dt>Số câu</dt>
                  <dd>{detail.questionCount} câu</dd>
                </div>
                <div>
                  <dt>Giới hạn</dt>
                  <dd>{detail.attemptLimit} lượt</dd>
                </div>
                <div>
                  <dt>Mở cửa</dt>
                  <dd>{formatDateTime(detail.openAt, detail.displayTimezone)}</dd>
                </div>
                <div>
                  <dt>Đóng cửa</dt>
                  <dd>{formatDateTime(detail.closeAt, detail.displayTimezone)}</dd>
                </div>
              </dl>
              <p className={styles.muted}>Múi giờ {detail.displayTimezone}</p>
              <p>Bắt đầu sẽ mở lượt mới hoặc đưa bạn về lượt đang làm của đề này.</p>
              <Button
                disabled={!start.allowed || start.pending || start.phase === "accepted"}
                onClick={start.show}
              >
                Bắt đầu
              </Button>
              {!start.allowed ? (
                <Alert tone="warning" title="Chưa thể bắt đầu">
                  Phiên hoặc quyền làm bài cần được kiểm tra lại.
                </Alert>
              ) : null}
              {!start.open && start.error ? <ErrorPanel error={start.error} /> : null}
              <p className={styles.muted}>Số lượt còn lại được kiểm tra khi bắt đầu.</p>
              {detail.leaderboardEnabled ? (
                <Link
                  className={styles.backLink}
                  to={`/exams/${examId}/versions/${detail.publishedVersionId}/leaderboard`}
                >
                  Xem bảng xếp hạng →
                </Link>
              ) : (
                <p>Phiên bản này không bật bảng xếp hạng.</p>
              )}
            </aside>
          </div>
          {start.open ? <StartConfirmation exam={detail} start={start} /> : null}
        </>
      ) : null}
    </div>
  );
}

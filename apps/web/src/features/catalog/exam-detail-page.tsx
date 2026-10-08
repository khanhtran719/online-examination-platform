import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMemory } from "../../app/memory";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { isApiError } from "../../shared/api/errors";
import { uuidV7 } from "../../shared/api/uuid";
import { categoryLabel, formatDateTime, formatDuration, policyLabel } from "../../shared/format";
import { PaperArt } from "../../shared/ui/paper-art";
import { actionsClass, Button, Dialog, ErrorPanel, SkeletonLines } from "../../shared/ui/ui";
import layout from "../../shared/styles/layout.module.css";
import styles from "./catalog.module.css";

export function ExamDetailPage() {
  useTitle("Chi tiết đề");
  const { examId = "" } = useParams();
  const { api } = useRuntime();
  const memory = useMemory();
  const navigate = useNavigate();
  const exam = useQuery({
    queryKey: ["exam", examId],
    queryFn: async () => {
      const response = await api.getExam(examId);
      memory.remember(response.data);
      return response.data;
    },
  });
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const keyRef = useRef<string | null>(null);
  async function start() {
    const key = keyRef.current ?? uuidV7();
    keyRef.current = key;
    setPending(true);
    setError(null);
    try {
      const response = await api.startAttempt(examId, key);
      keyRef.current = null;
      navigate(`/attempts/${response.data.id}`);
    } catch (caught) {
      if (!(isApiError(caught) && caught.kind === "network")) keyRef.current = null;
      setError(caught);
    } finally {
      setPending(false);
    }
  }
  const detail = exam.data;
  return (
    <div className={layout.wrap}>
      <Link className={styles.backLink} to="/exams">
        ← Danh sách đề
      </Link>
      {exam.isLoading ? <SkeletonLines /> : null}
      {exam.error || (!detail && !exam.isLoading) ? (
        <ErrorPanel error={exam.error} onRetry={() => void exam.refetch()} />
      ) : null}
      {detail ? (
        <>
          <header className={styles.pageHeading}>
            <p className={styles.eyebrow}>
              {categoryLabel(detail.category)} · PHIÊN BẢN {detail.version}
            </p>
            <h1 className={layout.title}>{detail.title}</h1>
            <p className={layout.muted}>
              Xem cấu trúc đề và dành một khoảng thời gian để tập trung.
            </p>
          </header>
          <div className={styles.columns}>
            <div className={layout.stack}>
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
              <section className={styles.panel}>
                <div className={styles.sectionHeading}>
                  <h2>Các phần trong đề</h2>
                  <span className={styles.badge}>{detail.sections.length} phần</span>
                </div>
                <ol className={styles.sectionList}>
                  {detail.sections.map((section, index) => (
                    <li key={section.id}>
                      <span className={styles.sectionNumber} aria-hidden="true">
                        {index + 1}
                      </span>
                      <div>
                        <h3>{section.title}</h3>
                        <p className={styles.caption}>
                          {section.questionCount} câu · {section.possible} điểm
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              <section className={styles.panel}>
                <h2>Lịch mở đề</h2>
                <dl className={styles.schedule}>
                  <div>
                    <dt>Mở cửa</dt>
                    <dd>{formatDateTime(detail.openAt, detail.displayTimezone)}</dd>
                  </div>
                  <div>
                    <dt>Đóng cửa</dt>
                    <dd>{formatDateTime(detail.closeAt, detail.displayTimezone)}</dd>
                  </div>
                </dl>
                <p className={styles.caption}>
                  Múi giờ {detail.displayTimezone}. Nếu vào gần giờ đóng, thời gian làm bài có thể
                  ngắn hơn thời lượng đầy đủ.
                </p>
              </section>
            </div>
            <aside className={`${styles.panel} ${styles.startPanel}`}>
              <div className={styles.startArt}>
                <PaperArt compact />
              </div>
              <h2>Sẵn sàng vào nhịp?</h2>
              <p>Bắt đầu sẽ mở lượt mới hoặc đưa bạn về lượt đang làm của đề này.</p>
              <Button onClick={() => setOpen(true)}>Bắt đầu</Button>
              <p className={styles.caption}>
                Giới hạn {detail.attemptLimit} lượt; số lượt còn lại sẽ được kiểm tra khi bắt đầu.
              </p>
              <div className={styles.policies}>
                <p>{policyLabel(detail.explanationPolicy)}</p>
                <p>
                  {detail.leaderboardEnabled
                    ? "Có bảng xếp hạng theo phiên bản, dùng bí danh."
                    : "Phiên bản này không bật bảng xếp hạng."}
                </p>
                {detail.leaderboardEnabled ? (
                  <Link to={`/exams/${examId}/versions/${detail.publishedVersionId}/leaderboard`}>
                    Xem bảng xếp hạng →
                  </Link>
                ) : null}
                <p className={styles.caption}>
                  Thời gian còn lại theo máy chủ sẽ hiện trong phòng thi.
                </p>
              </div>
            </aside>
          </div>
          {open ? (
            <Dialog title="Xác nhận bắt đầu" onClose={() => (pending ? undefined : setOpen(false))}>
              <p>
                Một lượt mới, hoặc lượt đang làm của đúng đề này, sẽ được mở. Nếu chưa nhận được xác
                nhận, bạn có thể thử lại.
              </p>
              <p>
                Đề đóng lúc {formatDateTime(detail.closeAt, detail.displayTimezone)}. Nếu vào muộn,
                hạn nộp có thể sớm hơn thời lượng đầy đủ.
              </p>
              {error ? <ErrorPanel error={error} /> : null}
              <div className={actionsClass}>
                <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
                  Chưa bắt đầu
                </Button>
                <Button disabled={pending} onClick={() => void start()}>
                  {pending ? "Đang bắt đầu…" : "Bắt đầu"}
                </Button>
              </div>
            </Dialog>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { useMemory } from "../../app/memory";
import { useTitle } from "../../app/use-title";
import { formatClock, formatDateTime, shortId } from "../../shared/format";
import { validateLogin } from "../../shared/validation";
import {
  Alert,
  Button,
  Dialog,
  ErrorPanel,
  PasswordField,
  SkeletonLines,
  TextField,
  sheetClass,
} from "../../shared/ui/ui";
import styles from "../../shared/styles/layout.module.css";
import { dirtyCount, saveStatusLabel, viewAnswer } from "./autosave";
import { passesSheetFilter, sheetLabel } from "./sheet";
import { formatRemaining } from "./clock";
import { progressCopy } from "./progress";
import { QuestionView } from "./question-view";
import { useExamRoom } from "./use-exam-room";

function Navigator({
  questions,
  sections,
  currentId,
  save,
  markedOnly,
  onMarkedOnly,
  onPick,
}: {
  questions: { id: string; position: number; sectionId: string }[];
  sections: { id: string; title: string }[];
  currentId: string | null;
  save: ReturnType<typeof useExamRoom>["save"];
  markedOnly: boolean;
  onMarkedOnly: (value: boolean) => void;
  onPick: (id: string) => void;
}) {
  const titles = new Map(sections.map((section) => [section.id, section.title]));
  const grouped: { id: string; title: string; items: typeof questions }[] = [];
  for (const question of questions) {
    const current = grouped.find((group) => group.id === question.sectionId);
    if (current) current.items.push(question);
    else {
      grouped.push({
        id: question.sectionId,
        title: titles.get(question.sectionId) ?? `Phần ${shortId(question.sectionId)}`,
        items: [question],
      });
    }
  }
  const visible = grouped
    .map((group) => ({
      ...group,
      items: group.items.filter((question) =>
        passesSheetFilter(markedOnly, viewAnswer(save, question.id).marked),
      ),
    }))
    .filter((group) => group.items.length > 0);
  return (
    <div className={styles.stack}>
      <ul className={styles.legend} aria-label="Chú giải phiếu">
        <li>Chưa trả lời</li>
        <li>Đã trả lời</li>
        <li>Đánh dấu</li>
        <li>Chưa lưu</li>
        <li>Đang chọn</li>
      </ul>
      <label className={styles.row}>
        <input
          type="checkbox"
          checked={markedOnly}
          onChange={(event) => onMarkedOnly(event.target.checked)}
        />
        Chỉ xem câu đánh dấu
      </label>
      <div className={styles.row}>
        {grouped.map((group) => (
          <Button
            key={group.id}
            variant="secondary"
            onClick={() => onPick(group.items[0]?.id ?? "")}
          >
            {group.title}
          </Button>
        ))}
      </div>
      {visible.length === 0 ? <p>Không có câu đánh dấu trong phần đã tải.</p> : null}
      {visible.map((group) => (
        <section key={group.id} className={styles.stack}>
          <h3>{group.title}</h3>
          <div className={styles.sheetGrid}>
            {group.items.map((question) => {
              const view = viewAnswer(save, question.id);
              const current = question.id === currentId;
              const label = sheetLabel({
                known: view.known,
                selectedCount: view.selectedOptionIds.length,
                marked: view.marked,
                dirty: question.id in save.drafts,
                current,
              });
              const className = [
                styles.sheetCell,
                current ? styles.sheetCurrent : "",
                view.known && view.selectedOptionIds.length > 0 ? styles.sheetAnswered : "",
                view.marked ? styles.sheetMarked : "",
                question.id in save.drafts ? styles.sheetPending : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={question.id}
                  type="button"
                  className={className}
                  aria-current={current ? "true" : undefined}
                  aria-label={`Câu ${question.position}, ${label}`}
                  onClick={() => onPick(question.id)}
                >
                  {question.position}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ExamRoomPage() {
  const { attemptId = "" } = useParams();
  const room = useExamRoom(attemptId);
  const memory = useMemory();
  const navigate = useNavigate();
  const attempt = room.attemptQuery.data;
  useTitle(attempt ? "Phòng thi" : "Đang mở bài");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [markedOnly, setMarkedOnly] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [leave, setLeave] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reauthError, setReauthError] = useState<string | null>(null);
  const loaded = room.questions.data?.pages.flatMap((page) => page.items) ?? [];
  const activeId = currentId ?? loaded[0]?.id ?? null;
  const active = loaded.find((question) => question.id === activeId) ?? null;
  const frozen = attempt ? memory.lookup(attempt.publishedVersionId) : null;
  const title = frozen && attempt && frozen.examId === attempt.examId ? frozen.title : null;
  const answered = loaded.filter(
    (question) => viewAnswer(room.save, question.id).selectedOptionIds.length > 0,
  ).length;
  const activeKnown = active ? viewAnswer(room.save, active.id).known : false;
  useEffect(() => {
    if (!activeId || !room.save.authenticated || room.recovering || !activeKnown) return;
    document.getElementById(`prompt-${activeId}`)?.focus();
  }, [activeId, activeKnown, room.recovering, room.save.authenticated]);

  if (room.attemptQuery.isLoading) return <SkeletonLines />;
  if (room.attemptQuery.error || !attempt)
    return (
      <ErrorPanel
        error={room.attemptQuery.error}
        onRetry={() => void room.attemptQuery.refetch()}
      />
    );
  if (attempt.status !== "IN_PROGRESS" && attempt.status !== "CREATED") {
    return <Navigate to={`/attempts/${attempt.id}/status`} replace />;
  }

  const view = active ? viewAnswer(room.save, active.id) : null;
  const index = loaded.findIndex((question) => question.id === activeId);
  function pick(id: string) {
    setCurrentId(id);
    setSheet(false);
  }
  const navigator = (
    <Navigator
      questions={loaded}
      sections={frozen?.sections ?? []}
      currentId={activeId}
      save={room.save}
      markedOnly={markedOnly}
      onMarkedOnly={setMarkedOnly}
      onPick={pick}
    />
  );

  return (
    <>
      <header className={styles.examBar}>
        <div className={styles.row}>
          <Button
            variant="secondary"
            onClick={() => (dirtyCount(room.save) > 0 ? setLeave(true) : navigate("/dashboard"))}
          >
            Rời phòng thi
          </Button>
          <p className={styles.timer} aria-label="Thời gian còn lại">
            {room.remaining === null ? "—:—" : formatRemaining(room.remaining)}
          </p>
          <Button
            disabled={room.submit.phase !== "idle" || !room.save.canSave}
            onClick={() => setConfirmSubmit(true)}
          >
            Nộp bài
          </Button>
        </div>
        <p role="status">{saveStatusLabel(room.save, formatClock(room.save.lastAcceptedAt))}</p>
        <p>
          {progressCopy({
            loaded: loaded.length,
            answered,
            versionTotal: title ? (frozen?.questionCount ?? null) : null,
          })}
        </p>
        {room.milestone ? <p role="status">{room.milestone}</p> : null}
      </header>
      <div id="content" className={styles.examScroll}>
        <div className={styles.room}>
          <section className={styles.stack}>
            <h1 className={styles.title}>{title ?? `Đề ${shortId(attempt.publishedVersionId)}`}</h1>
            {!title ? (
              <p className={styles.muted}>
                Bài làm không kèm tiêu đề đã khóa. Không dùng tiêu đề đề hiện tại thay cho phiên bản{" "}
                {shortId(attempt.publishedVersionId)}.
              </p>
            ) : null}
            <p className={styles.muted}>
              Hạn nộp {formatDateTime(attempt.deadline)} · giờ máy chủ{" "}
              {formatDateTime(attempt.serverNow)}
            </p>
            {!room.save.canSave ? (
              <Alert tone="warning" title="Đã khóa lưu">
                Không còn lưu câu trả lời mới. Những câu chưa xác nhận được giữ riêng.
              </Alert>
            ) : null}
            {room.notice ? (
              <Alert tone="warning" title="Lưu ý">
                {room.notice}
              </Alert>
            ) : null}
            {room.save.phase === "offline" || room.save.inFlight?.exhausted ? (
              <Alert
                tone="warning"
                title={room.save.phase === "offline" ? "Chưa kết nối" : "Chưa xác nhận được đã lưu"}
              >
                <Button onClick={room.retrySave}>Thử lưu lại</Button>
              </Alert>
            ) : null}
            {!room.save.authenticated ? (
              <form
                className={styles.card}
                onSubmit={(event) => {
                  event.preventDefault();
                  const parsed = validateLogin({ email, password });
                  if (!parsed.body) {
                    setReauthError("Nhập email và mật khẩu.");
                    return;
                  }
                  void room
                    .reauthenticate(parsed.body.email, parsed.body.password)
                    .catch((caught: unknown) => {
                      setReauthError(
                        caught instanceof Error ? caught.message : "Không đăng nhập lại được.",
                      );
                    });
                }}
              >
                <h2>Đăng nhập lại</h2>
                {reauthError ? <p>{reauthError}</p> : null}
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <PasswordField
                  label="Mật khẩu"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Button type="submit">Đăng nhập lại</Button>
              </form>
            ) : null}
            {room.questions.isLoading || room.answers.isLoading ? <SkeletonLines /> : null}
            {room.questions.error ? (
              <ErrorPanel
                error={room.questions.error}
                onRetry={() => void room.questions.refetch()}
              />
            ) : null}
            {room.answers.error ? (
              <ErrorPanel error={room.answers.error} onRetry={() => void room.answers.refetch()} />
            ) : null}
            {room.save.authenticated && !room.recovering && active && view?.known ? (
              <QuestionView
                question={active}
                selected={view.selectedOptionIds}
                marked={view.marked}
                disabled={
                  !room.save.canSave ||
                  room.save.editingFrozen ||
                  room.save.conflictQuestionIds.includes(active.id)
                }
                onSelected={(selected) => room.change(active.id, selected, view.marked)}
                onMarked={(marked) => room.change(active.id, view.selectedOptionIds, marked)}
                onClear={() => room.change(active.id, [], view.marked)}
              />
            ) : active ? (
              <p>Đang tải đáp án đã lưu của câu này.</p>
            ) : (
              <p>Chưa có câu nào trong trang đã tải.</p>
            )}
            <div className={`${styles.row} ${styles.desktopControls}`}>
              <Button
                variant="secondary"
                disabled={index <= 0}
                onClick={() => {
                  const previous = loaded[index - 1];
                  if (previous) pick(previous.id);
                }}
              >
                Câu trước
              </Button>
              <Button
                variant="secondary"
                disabled={index < 0 || index >= loaded.length - 1}
                onClick={() => {
                  const next = loaded[index + 1];
                  if (next) pick(next.id);
                }}
              >
                Câu sau
              </Button>
              <Button
                className={styles.sheetButton}
                variant="secondary"
                onClick={() => setSheet(true)}
              >
                Danh sách câu hỏi
              </Button>
            </div>
            {room.questions.hasNextPage || room.answers.hasNextPage ? (
              <Button variant="secondary" onClick={room.loadMore}>
                Tải thêm câu
              </Button>
            ) : null}
            {room.submit.phase === "flushing" ||
            room.submit.phase === "posting" ||
            room.submit.phase === "deadline" ? (
              <p role="status">
                {room.submit.phase === "deadline"
                  ? "Hết giờ. Đang nộp các đáp án đã được xác nhận."
                  : "Đang lưu rồi nộp."}
              </p>
            ) : null}
            <p className={styles.muted}>
              <Link to={`/attempts/${attempt.id}/status`}>Xem trạng thái xử lý</Link>
            </p>
          </section>
          <aside className={styles.navigator} aria-label="Phiếu câu hỏi">
            <h2>Phiếu câu hỏi</h2>
            {navigator}
          </aside>
        </div>
      </div>
      <div className={styles.examDock}>
        <Button
          variant="secondary"
          disabled={index <= 0}
          onClick={() => {
            const previous = loaded[index - 1];
            if (previous) pick(previous.id);
          }}
        >
          Câu trước
        </Button>
        <p>{active ? `Câu ${active.position}` : "—"}</p>
        <Button
          variant="secondary"
          disabled={index < 0 || index >= loaded.length - 1}
          onClick={() => {
            const next = loaded[index + 1];
            if (next) pick(next.id);
          }}
        >
          Câu sau
        </Button>
        <Button
          variant="secondary"
          aria-label="Danh sách câu hỏi, phiếu câu hỏi"
          onClick={() => setSheet(true)}
        >
          Danh sách câu hỏi
        </Button>
      </div>
      {sheet ? (
        <Dialog title="Phiếu câu hỏi" className={sheetClass} onClose={() => setSheet(false)}>
          {navigator}
        </Dialog>
      ) : null}
      {confirmSubmit ? (
        <Dialog title="Nộp bài" onClose={() => setConfirmSubmit(false)}>
          <p>
            Các thay đổi chưa được xác nhận sẽ được lưu trước nếu còn giờ. Nộp bài không gửi lại nội
            dung đáp án.
          </p>
          <p>
            {progressCopy({
              loaded: loaded.length,
              answered,
              versionTotal: title ? (frozen?.questionCount ?? null) : null,
            })}
          </p>
          <div className={styles.row}>
            <Button variant="secondary" onClick={() => setConfirmSubmit(false)}>
              Chưa nộp
            </Button>
            <Button
              onClick={() => {
                setConfirmSubmit(false);
                room.requestSubmit();
              }}
            >
              Nộp các đáp án đã lưu
            </Button>
          </div>
        </Dialog>
      ) : null}
      {room.submit.phase === "save-blocked" ? (
        <Dialog title="Chưa lưu được trước khi nộp">
          <p>
            Còn giờ, nhưng một phần thay đổi chưa được máy chủ xác nhận. Có thể thử lại hoặc hủy
            nộp.
          </p>
          <div className={styles.row}>
            <Button variant="secondary" onClick={room.cancelSubmit}>
              Hủy nộp
            </Button>
            <Button onClick={room.retrySubmit}>Thử lưu lại</Button>
          </div>
        </Dialog>
      ) : null}
      {room.save.phase === "conflict" ? (
        <Dialog title="Đáp án đã thay đổi ở nơi khác">
          <p>
            Bản trên trình duyệt được giữ. Hãy chọn một cách xử lý. Ứng dụng không tự lấy bản ghi
            sau cùng.
          </p>
          {room.conflictError ? (
            <ErrorPanel error={room.conflictError} onRetry={room.reloadConflict} />
          ) : null}
          <ul>
            {room.save.conflictQuestionIds.map((questionId) => {
              const mine = viewAnswer(room.save, questionId);
              const server = room.conflictAnswers.find(
                (answer) => answer.questionId === questionId,
              );
              return (
                <li key={questionId}>
                  Câu {shortId(questionId)} · của bạn {mine.selectedOptionIds.length} lựa chọn · máy
                  chủ{" "}
                  {server
                    ? `${server.selectedOptionIds.length} lựa chọn, phiên bản ${server.version}`
                    : "chưa tải"}
                </li>
              );
            })}
          </ul>
          <div className={styles.row}>
            <Button
              variant="secondary"
              disabled={room.conflictAnswers.length === 0}
              onClick={room.resolveServer}
            >
              Dùng bản máy chủ
            </Button>
            <Button disabled={room.conflictAnswers.length === 0} onClick={room.resolveMine}>
              Giữ lựa chọn của tôi
            </Button>
          </div>
        </Dialog>
      ) : null}
      {leave ? (
        <Dialog title="Rời phòng khi còn thay đổi" onClose={() => setLeave(false)}>
          <p>Thay đổi chưa xác nhận sẽ mất khỏi trình duyệt.</p>
          <div className={styles.row}>
            <Button variant="secondary" onClick={() => setLeave(false)}>
              Ở lại
            </Button>
            <Button variant="danger" onClick={() => navigate("/dashboard")}>
              Vẫn rời
            </Button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

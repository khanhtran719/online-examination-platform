import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { useMemory } from "../../app/memory";
import { useTitle } from "../../app/use-title";
import { formatDateTime, shortId } from "../../shared/format";
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
import { dirtyCount, viewAnswer } from "./autosave";
import { progressCopy } from "./progress";
import { QuestionView } from "./question-view";
import { useExamRoom } from "./use-exam-room";
import { RoomNavigator } from "./room-navigator";
import { RoomToolbar } from "./room-toolbar";
import { RoomDialogs } from "./room-dialogs";
import roomStyles from "./room.module.css";

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
    <RoomNavigator
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
      <RoomToolbar
        save={room.save}
        remaining={room.remaining}
        answered={answered}
        loaded={loaded.length}
        progress={progressCopy({
          loaded: loaded.length,
          answered,
          versionTotal: title ? (frozen?.questionCount ?? null) : null,
        })}
        milestone={room.milestone}
        canSubmit={room.submit.phase === "idle" && room.save.canSave}
        onLeave={() => (dirtyCount(room.save) > 0 ? setLeave(true) : navigate("/dashboard"))}
        onSubmit={() => setConfirmSubmit(true)}
      />
      <div id="content" className={styles.examScroll}>
        <div className={styles.room}>
          <section className={`${styles.stack} ${roomStyles.mainColumn}`}>
            <h1 className={`${styles.title} ${roomStyles.title}`}>
              {title ?? `Đề ${shortId(attempt.publishedVersionId)}`}
            </h1>
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
          <aside
            className={`${styles.navigator} ${roomStyles.navigator}`}
            aria-label="Phiếu câu hỏi"
          >
            <h2>Phiếu câu hỏi</h2>
            {navigator}
          </aside>
        </div>
      </div>
      <div className={`${styles.examDock} ${roomStyles.dock}`}>
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
      <RoomDialogs
        room={room}
        progress={progressCopy({
          loaded: loaded.length,
          answered,
          versionTotal: title ? (frozen?.questionCount ?? null) : null,
        })}
        confirmSubmit={confirmSubmit}
        leave={leave}
        onCloseSubmit={() => setConfirmSubmit(false)}
        onCloseLeave={() => setLeave(false)}
        onLeave={() => navigate("/dashboard")}
      />
    </>
  );
}

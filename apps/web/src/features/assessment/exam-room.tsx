import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";

import { useTitle } from "@web/app/use-title";
import { formatDateTime, shortId } from "@web/shared/format";
import layout from "@web/shared/styles/layout.module.css";
import { Button, Dialog, ErrorPanel, sheetClass, SkeletonLines } from "@web/shared/ui/ui";

import { dirtyCount, viewAnswer } from "./autosave";
import { progressCopy } from "./progress";
import { QuestionView } from "./question-view";
import styles from "./room.module.css";
import { RoomDialogs } from "./room-dialogs";
import { RoomFeedback } from "./room-feedback";
import { RoomNavigator } from "./room-navigator";
import { RoomToolbar } from "./room-toolbar";
import { useExamRoom } from "./use-exam-room";

export function ExamRoomPage() {
  const { attemptId = "" } = useParams();
  const room = useExamRoom(attemptId);
  return <ExamRoomContent key={room.scope} room={room} />;
}

function ExamRoomContent({ room }: { room: ReturnType<typeof useExamRoom> }) {
  const navigate = useNavigate();
  const attempt = room.attemptQuery.data;
  useTitle(attempt ? "Phòng thi" : "Đang mở bài");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [markedOnly, setMarkedOnly] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [leave, setLeave] = useState(false);
  const loaded = room.questions.data?.pages.flatMap((page) => page.items) ?? [];
  const activeId = loaded.some((question) => question.id === currentId)
    ? currentId
    : (loaded[0]?.id ?? null);
  const active = loaded.find((question) => question.id === activeId) ?? null;
  const title = room.frozen?.title;
  const answered = loaded.filter(
    (question) => viewAnswer(room.save, question.id).selectedOptionIds.length > 0,
  ).length;
  const activeKnown = active ? viewAnswer(room.save, active.id).known : false;
  useEffect(() => {
    if (!activeId || !room.save.authenticated || room.recovering || !activeKnown) return;
    document.getElementById(`prompt-${activeId}`)?.focus();
  }, [activeId, activeKnown, room.recovering, room.save.authenticated]);

  if (room.accessError || room.attemptQuery.error)
    return (
      <div className={styles.readState}>
        <h1>Phòng thi</h1>
        <ErrorPanel
          error={room.accessError ?? room.attemptQuery.error}
          onRetry={room.accessError ? undefined : () => void room.attemptQuery.refetch()}
        />
        <Link to="/history">Về lịch sử thi</Link>
      </div>
    );
  if (!attempt)
    return (
      <div className={styles.readState}>
        <h1>Đang mở bài</h1>
        <SkeletonLines />
      </div>
    );
  if (attempt.status !== "IN_PROGRESS" && attempt.status !== "CREATED")
    return <Navigate to={`/attempts/${attempt.id}/status`} replace />;

  const view = active ? viewAnswer(room.save, active.id) : null;
  const index = loaded.findIndex((question) => question.id === activeId);
  const progress = progressCopy({
    loaded: loaded.length,
    answered,
    versionTotal: room.frozen?.questionCount ?? null,
  });
  function pick(id: string) {
    setCurrentId(id);
    setSheet(false);
  }
  function previous() {
    const question = loaded[index - 1];
    if (question) pick(question.id);
  }
  function next() {
    const question = loaded[index + 1];
    if (question) pick(question.id);
  }
  const navigator = (
    <RoomNavigator
      questions={loaded}
      sections={room.frozen?.sections ?? []}
      currentId={activeId}
      save={room.save}
      markedOnly={markedOnly}
      onMarkedOnly={setMarkedOnly}
      onPick={pick}
    />
  );
  const uncertain =
    dirtyCount(room.save) > 0 ||
    room.save.inFlight !== null ||
    (room.submit.phase !== "idle" && room.submit.phase !== "accepted");
  return (
    <>
      <RoomToolbar
        save={room.save}
        remaining={room.remaining}
        answered={answered}
        loaded={loaded.length}
        progress={progress}
        milestone={room.milestone}
        canSubmit={room.canSubmit}
        onLeave={() => (uncertain ? setLeave(true) : navigate("/dashboard"))}
        onSubmit={() => setConfirmSubmit(true)}
      />
      <main id="content" className={styles.workspace}>
        <div className={styles.room}>
          <section className={`${layout.stack} ${styles.mainColumn}`}>
            <div className={styles.heading}>
              <p className={styles.eyebrow}>LÀM BÀI · PHIÊN BẢN ĐÃ KHÓA</p>
              <h1>{title ?? `Đề ${shortId(attempt.publishedVersionId)}`}</h1>
              {!title ? (
                <p className={styles.helper}>
                  Chưa có tên của phiên bản này. Mã đề {shortId(attempt.publishedVersionId)}.
                </p>
              ) : null}
              <p className={styles.helper}>
                Hạn nộp {formatDateTime(attempt.deadline)} · Giờ Việt Nam UTC+7
              </p>
            </div>
            <RoomFeedback room={room} />
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
                ordinal={index + 1}
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
              <p>
                {room.save.authenticated
                  ? "Chưa có câu nào trong trang đã tải."
                  : "Đăng nhập lại để tiếp tục xem câu hỏi."}
              </p>
            )}
            <div className={styles.controls}>
              <Button variant="secondary" disabled={index <= 0} onClick={previous}>
                Câu trước
              </Button>
              <Button
                variant="secondary"
                disabled={index < 0 || index >= loaded.length - 1}
                onClick={next}
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
              <Button
                variant="secondary"
                disabled={room.questions.isFetching || room.answers.isFetching}
                onClick={room.loadMore}
              >
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
            <p className={styles.helper}>
              Chỉ đáp án được máy chủ xác nhận mới được ghi nhận.{" "}
              <Link to={`/attempts/${attempt.id}/status`}>Xem trạng thái xử lý</Link>
            </p>
          </section>
          <aside className={styles.navigator} aria-label="Phiếu câu hỏi">
            <div className={styles.navigatorHeading}>
              <h2>Phiếu câu hỏi</h2>
              <span>{loaded.length} đã tải</span>
            </div>
            {navigator}
            <p className={styles.navigatorNote}>
              Đánh dấu câu bạn muốn xem lại. Lựa chọn chưa được lưu sẽ có ký hiệu ⋯.
            </p>
          </aside>
        </div>
      </main>
      <div className={`${layout.examDock} ${styles.dock}`}>
        <Button variant="secondary" disabled={index <= 0} onClick={previous}>
          Câu trước
        </Button>
        <p>{active ? `Câu ${index + 1}` : "—"}</p>
        <Button
          variant="secondary"
          disabled={index < 0 || index >= loaded.length - 1}
          onClick={next}
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
        progress={progress}
        confirmSubmit={confirmSubmit}
        leave={leave}
        onCloseSubmit={() => setConfirmSubmit(false)}
        onCloseLeave={() => setLeave(false)}
        onLeave={() => navigate("/dashboard")}
      />
    </>
  );
}

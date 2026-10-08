import { formatClock } from "../../shared/format";
import { ExamGlyph } from "../../shared/ui/brand";
import { Button } from "../../shared/ui/ui";
import { saveStatusLabel, type AutosaveState } from "./autosave";
import { formatRemaining } from "./clock";
import styles from "./room.module.css";

const saveIcons = {
  clean: "○",
  pending: "⋯",
  saving: "⋯",
  saved: "✓",
  retrying: "↻",
  conflict: "!",
  offline: "!",
  unconfirmed: "!",
};
export function RoomToolbar({
  save,
  remaining,
  progress,
  answered,
  loaded,
  milestone,
  canSubmit,
  onLeave,
  onSubmit,
}: {
  save: AutosaveState;
  remaining: number | null;
  progress: string;
  answered: number;
  loaded: number;
  milestone: string | null;
  canSubmit: boolean;
  onLeave: () => void;
  onSubmit: () => void;
}) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.toolbarTop}>
        <div className={styles.roomIdentity}>
          <span aria-hidden="true">
            <ExamGlyph />
          </span>
          <strong>Phòng thi</strong>
          <Button variant="ghost" onClick={onLeave}>
            Rời phòng thi
          </Button>
        </div>
        <div className={styles.saveStatus} data-phase={save.phase} role="status">
          <span aria-hidden="true">{saveIcons[save.phase]}</span>
          {saveStatusLabel(save, formatClock(save.lastAcceptedAt))}
        </div>
        <div
          className={styles.timerGroup}
          data-urgent={remaining !== null && remaining <= 5 * 60 * 1000}
        >
          <span>Thời gian còn lại</span>
          <p className={styles.timer} aria-label="Thời gian còn lại">
            {remaining === null ? "—:—" : formatRemaining(remaining)}
          </p>
        </div>
        <Button disabled={!canSubmit} onClick={onSubmit}>
          Nộp bài
        </Button>
      </div>
      <div className={styles.progressRow}>
        <p>{progress}</p>
        {loaded > 0 ? (
          <progress value={answered} max={loaded} aria-label="Câu đã trả lời trong phần đã tải" />
        ) : null}
      </div>
      {milestone ? (
        <p className={styles.milestone} role="status">
          {milestone}
        </p>
      ) : null}
    </header>
  );
}

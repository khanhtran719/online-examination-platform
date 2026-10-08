import { shortId } from "../../shared/format";
import { Button } from "../../shared/ui/ui";
import styles from "../../shared/styles/layout.module.css";
import roomStyles from "./room.module.css";
import { viewAnswer } from "./autosave";
import { passesSheetFilter, sheetLabel } from "./sheet";
import type { useExamRoom } from "./use-exam-room";

export function RoomNavigator({
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
    <div className={`${styles.stack} ${roomStyles.navigatorBody}`}>
      <ul className={styles.legend} aria-label="Chú giải phiếu">
        <li>
          <span aria-hidden="true">○</span> Chưa trả lời
        </li>
        <li>
          <span aria-hidden="true">✓</span> Đã trả lời
        </li>
        <li>
          <span aria-hidden="true">⚑</span> Đánh dấu
        </li>
        <li>
          <span aria-hidden="true">⋯</span> Chưa lưu
        </li>
        <li>
          <span aria-hidden="true">▣</span> Đang chọn
        </li>
        <li>
          <span aria-hidden="true">?</span> Chưa tải đáp án
        </li>
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
          <div className={`${styles.sheetGrid} ${roomStyles.sheetGrid}`}>
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
                  <span className={roomStyles.cellMark} aria-hidden="true">
                    {!view.known
                      ? "?"
                      : question.id in save.drafts
                        ? "⋯"
                        : view.marked
                          ? "⚑"
                          : view.selectedOptionIds.length > 0
                            ? "✓"
                            : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

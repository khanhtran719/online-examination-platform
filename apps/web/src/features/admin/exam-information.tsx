import {
  CATEGORIES,
  EXPLANATION_POLICIES,
  type Category,
  type ExplanationPolicy,
} from "../../shared/api/dto";
import { categoryLabel, policyLabel } from "../../shared/format";
import { timezoneChoices, utcToZonedInput, zonedInputToUtc } from "../../shared/timezone";
import { SelectField, TextField } from "../../shared/ui/ui";
import type { ExamDraft } from "./use-exam-draft";
import styles from "./admin.module.css";

export function ExamInformation({ draft }: { draft: ExamDraft }) {
  return (
    <section className={styles.panel}>
      <h2>Thông tin đề</h2>
      <div className={styles.formGrid}>
        <div className={styles.fullWidth}>
          <TextField
            label="Tiêu đề"
            value={draft.title}
            onChange={(event) => draft.setTitle(event.target.value)}
          />
        </div>
        <SelectField
          label="Danh mục"
          value={draft.category}
          onChange={(event) => draft.setCategory(event.target.value as Category)}
        >
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {categoryLabel(item)}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Thời lượng (giây)"
          type="number"
          min={60}
          max={14400}
          step={60}
          value={draft.duration}
          onChange={(event) => draft.setDuration(event.target.value)}
        />
        <SelectField
          label="Múi giờ hiển thị"
          value={draft.zone}
          onChange={(event) => {
            const next = event.target.value;
            try {
              draft.setOpenAt(utcToZonedInput(zonedInputToUtc(draft.openAt, draft.zone), next));
              draft.setCloseAt(utcToZonedInput(zonedInputToUtc(draft.closeAt, draft.zone), next));
            } catch {
              draft.setError(new Error("Chưa đổi được múi giờ vì giờ đang nhập chưa hợp lệ."));
            }
            draft.setZone(next);
          }}
        >
          {timezoneChoices(draft.zone).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Giới hạn lượt"
          type="number"
          min={1}
          max={10}
          value={draft.limit}
          onChange={(event) => draft.setLimit(event.target.value)}
        />
        <TextField
          label="Mở"
          type="datetime-local"
          value={draft.openAt}
          onChange={(event) => draft.setOpenAt(event.target.value)}
        />
        <TextField
          label="Đóng"
          type="datetime-local"
          value={draft.closeAt}
          onChange={(event) => draft.setCloseAt(event.target.value)}
        />
        <div className={styles.fullWidth}>
          <h3>Kết quả và quyền xem</h3>
        </div>
        <div className={styles.fullWidth}>
          <SelectField
            label="Khi mở giải thích"
            value={draft.policy}
            onChange={(event) => draft.setPolicy(event.target.value as ExplanationPolicy)}
          >
            {EXPLANATION_POLICIES.map((item) => (
              <option key={item} value={item}>
                {policyLabel(item)}
              </option>
            ))}
          </SelectField>
        </div>
        <label className={`${styles.toggle} ${styles.fullWidth}`}>
          <input
            type="checkbox"
            checked={draft.board}
            onChange={(event) => draft.setBoard(event.target.checked)}
          />
          Bật bảng xếp hạng bí danh
        </label>
      </div>
    </section>
  );
}

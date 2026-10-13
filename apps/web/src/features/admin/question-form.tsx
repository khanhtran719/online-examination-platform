import { useState } from "react";
import { Link } from "react-router";

import { QUESTION_TYPES, type QuestionType } from "@web/shared/api/dto";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  ErrorPanel,
  SelectField,
  TextArea,
  TextField,
} from "@web/shared/ui/ui";

import { questionTypeLabel } from "./admin-ui";
import styles from "./authoring.module.css";
import { QuestionDialogs } from "./question-dialogs";
import { QuestionOptions } from "./question-options";
import { QuestionPreview } from "./question-preview";
import { useAuthoringNavigation } from "./use-authoring-navigation";
import { type QuestionFormProps, useQuestionDraft } from "./use-question-draft";

export function QuestionForm(props: QuestionFormProps) {
  const draft = useQuestionDraft(props);
  const [archiveConfirm, setArchiveConfirm] = useState(false),
    [preview, setPreview] = useState(false);
  const blocker = useAuthoringNavigation(draft);
  return (
    <form className={styles.page} onSubmit={draft.submit} noValidate>
      <p className={styles.breadcrumb}>
        Quản trị / Ngân hàng câu hỏi / {props.initial ? "Sửa câu" : "Tạo câu"}
      </p>
      <header className={styles.heading}>
        <div>
          <div className={styles.title}>
            <h1>{props.initial ? "Sửa câu" : "Tạo câu"}</h1>
            <Badge tone={draft.archived ? "neutral" : "warning"}>
              {draft.archived
                ? "Đã lưu trữ"
                : draft.revision
                  ? `Bản sửa ${draft.revision}`
                  : "Chưa lưu"}
            </Badge>
          </div>
          <p>Thay đổi câu trong ngân hàng không sửa các đề đã phát hành.</p>
        </div>
        <Link to="/admin/questions">← Ngân hàng câu</Link>
      </header>
      {draft.archived ? <Alert tone="warning" title="Câu đã lưu trữ, chỉ để xem" /> : null}
      {draft.issues.length ? (
        <Alert title="Kiểm tra lại câu hỏi">
          <ul>
            {draft.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {draft.error && !draft.unknown && !draft.conflict ? <ErrorPanel error={draft.error} /> : null}
      {draft.notice ? <Alert tone="success" title={draft.notice} /> : null}
      {draft.unknown ? (
        <Alert tone="warning" title="Chưa xác nhận được kết quả">
          <p>Giữ nguyên yêu cầu để thử lại. Các thao tác khác đang được khóa.</p>
          <Button disabled={draft.pending} onClick={() => void draft.retry()}>
            Thử lại yêu cầu
          </Button>
        </Alert>
      ) : null}
      <div className={styles.grid}>
        <fieldset className={`${styles.fields} ${styles.stack}`} disabled={draft.locked}>
          <section className={styles.panel}>
            <h2>Nội dung câu hỏi</h2>
            <div className={styles.formGrid}>
              <SelectField
                label="Loại"
                value={draft.type}
                onChange={(event) => draft.changeType(event.target.value as QuestionType)}
              >
                {QUESTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {questionTypeLabel[type]}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Điểm"
                type="number"
                min={1}
                max={1000}
                step={1}
                value={draft.points}
                onChange={(event) => draft.setPoints(event.target.value)}
              />
            </div>
            <TextArea
              label="Đề bài"
              value={draft.prompt}
              onChange={(event) => draft.setPrompt(event.target.value)}
            />
            <p className={styles.counter}>{[...draft.prompt].length}/8000 ký tự</p>
          </section>
          <QuestionOptions draft={draft} />
        </fieldset>
        <aside className={styles.panel}>
          <h2>Xem trước nội dung</h2>
          <p className={styles.scope}>
            Chỉ nội dung thí sinh được thấy; không kèm đáp án đúng hoặc giải thích.
          </p>
          <QuestionPreview prompt={draft.prompt} options={draft.options} type={draft.type} />
          <Button variant="secondary" onClick={() => setPreview(true)}>
            Xem như thí sinh
          </Button>
        </aside>
      </div>
      <div className={styles.actionBar}>
        <p className={styles.scope}>
          {draft.pending
            ? "Đang chờ máy chủ xác nhận…"
            : draft.unknown
              ? "Có yêu cầu chưa được xác nhận"
              : draft.dirty
                ? "Có thay đổi chưa lưu"
                : "Lưu câu vào ngân hàng"}
        </p>
        <div className={styles.actions}>
          <Button type="submit" disabled={draft.locked}>
            {draft.pending ? "Đang lưu…" : "Lưu câu"}
          </Button>
          {props.onArchive ? (
            <Button
              variant="danger"
              disabled={draft.locked}
              onClick={() => setArchiveConfirm(true)}
            >
              Lưu trữ
            </Button>
          ) : null}
        </div>
      </div>
      <QuestionDialogs
        draft={draft}
        initial={props.initial}
        fetching={props.fetching}
        readError={props.readError}
        onReload={props.onConflict}
        archiveConfirm={archiveConfirm}
        cancelArchive={() => setArchiveConfirm(false)}
      />
      {preview ? (
        <Dialog title="Xem câu hỏi như thí sinh" onClose={() => setPreview(false)}>
          <QuestionPreview prompt={draft.prompt} options={draft.options} type={draft.type} />
        </Dialog>
      ) : null}
      {blocker.state === "blocked" ? (
        <Dialog title="Rời câu hỏi chưa lưu?" onClose={() => blocker.reset()}>
          <p>
            {draft.unknown || draft.pending
              ? "Yêu cầu có thể đã được máy chủ ghi nhận. Rời trang sẽ mất thông tin thử lại."
              : "Các thay đổi chưa lưu sẽ bị bỏ."}
          </p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => blocker.reset()}>
              Ở lại chỉnh sửa
            </Button>
            <Button variant="danger" disabled={draft.pending} onClick={() => blocker.proceed()}>
              Rời trang
            </Button>
          </div>
        </Dialog>
      ) : null}
    </form>
  );
}

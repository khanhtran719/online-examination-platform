import { categoryLabel, formatDuration, policyLabel } from "@web/shared/format";
import { Badge, Button } from "@web/shared/ui/ui";

import { type DraftIssue, draftTotals } from "./exam-draft-model";
import styles from "./exam-editor.module.css";
import type { ExamDraft } from "./use-exam-draft";

export function ExamPreflight({
  draft,
  onStep,
}: {
  draft: ExamDraft;
  onStep: (step: number) => void;
}) {
  return (
    <section className={styles.panel}>
      <h2>Rà soát trước khi phát hành</h2>
      <div className={styles.sectionHeader}>
        <h3>Thông tin cơ bản</h3>
        <Button variant="ghost" onClick={() => onStep(0)}>
          Sửa thông tin
        </Button>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>Tiêu đề</dt>
          <dd>{draft.title || "Chưa nhập"}</dd>
        </div>
        <div>
          <dt>Danh mục</dt>
          <dd>{categoryLabel(draft.category)}</dd>
        </div>
        <div>
          <dt>Thời lượng</dt>
          <dd>{draft.duration || "Chưa nhập"} phút</dd>
        </div>
      </dl>
      <h3 className={styles.divider}>Lịch và chính sách</h3>
      <dl className={styles.facts}>
        <div>
          <dt>Giờ mở</dt>
          <dd>{draft.openAt.replace("T", " · ") || "Chưa nhập"}</dd>
        </div>
        <div>
          <dt>Giờ đóng</dt>
          <dd>{draft.closeAt.replace("T", " · ") || "Chưa nhập"}</dd>
        </div>
        <div>
          <dt>Múi giờ</dt>
          <dd>{draft.zone === "Asia/Ho_Chi_Minh" ? "Giờ Việt Nam · UTC+7" : draft.zone}</dd>
        </div>
        <div>
          <dt>Số lượt tối đa</dt>
          <dd>{draft.limit} lượt</dd>
        </div>
        <div>
          <dt>Lời giải</dt>
          <dd>{policyLabel(draft.policy)}</dd>
        </div>
        <div>
          <dt>Bảng xếp hạng</dt>
          <dd>{draft.board ? "Dùng bí danh" : "Tắt"}</dd>
        </div>
      </dl>
      <div className={`${styles.sectionHeader} ${styles.divider}`}>
        <h3>Cấu trúc đề</h3>
        <Button variant="ghost" onClick={() => onStep(1)}>
          Sửa cấu trúc
        </Button>
      </div>
      <SectionSummary draft={draft} />
    </section>
  );
}
function SectionSummary({ draft }: { draft: ExamDraft }) {
  return (
    <ul className={styles.sectionList}>
      {draft.sections.map((section, index) => (
        <li key={index}>
          <span>
            {String(index + 1).padStart(2, "0")} · {section.title || "Chưa có tên"}
          </span>
          <small>
            {section.questions.length} câu · {displayPoints(draftTotals([section]).points)} điểm
          </small>
        </li>
      ))}
    </ul>
  );
}
function displayPoints(value: number) {
  return Number.isFinite(value) ? value : "Chưa hợp lệ";
}
export function ExamSummary({
  draft,
  preflight,
  onIssue,
}: {
  draft: ExamDraft;
  preflight: boolean;
  onIssue: (issue: DraftIssue) => void;
}) {
  const totals = draftTotals(draft.sections);
  const issues = draft.validation.issues;
  const checks = [
    {
      label: "Thông tin bắt buộc đầy đủ",
      valid: !issues.some((issue) => ["title", "duration", "limit"].includes(issue.field)),
    },
    {
      label: "Lịch đóng sau lịch mở",
      valid: !issues.some((issue) => ["openAt", "closeAt"].includes(issue.field)),
    },
    {
      label: "Mỗi phần có tên và câu hỏi",
      valid: !issues.some((issue) => issue.field.startsWith("section")),
    },
    {
      label: `${totals.questions} câu không trùng, tối đa 500`,
      valid: !issues.some((issue) => issue.field === "questions"),
    },
    {
      label: "Điểm từng câu hợp lệ",
      valid: !issues.some((issue) => issue.field.startsWith("points")),
    },
  ];
  return (
    <aside className={styles.summary} aria-label="Tóm tắt bản nháp">
      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <h2>
            {preflight
              ? "Kiểm tra bản nháp"
              : draft.revision
                ? "Bản đang chỉnh sửa"
                : "Bản nháp mới"}
          </h2>
          {preflight ? (
            <Badge tone={issues.length ? "warning" : "success"}>
              {checks.filter((check) => check.valid).length}/5 mục đạt
            </Badge>
          ) : null}
        </div>
        <div className={styles.totals}>
          <div>
            <strong>{totals.sections}</strong>
            <span>phần</span>
          </div>
          <div>
            <strong>{totals.questions}</strong>
            <span>câu</span>
          </div>
          <div>
            <strong>{displayPoints(totals.points)}</strong>
            <span>điểm</span>
          </div>
        </div>
        {preflight ? (
          <ul className={styles.checklist}>
            {checks.map((check) => (
              <li key={check.label} data-valid={check.valid}>
                <span aria-hidden="true">{check.valid ? "✓" : "!"}</span>
                <span>
                  {check.label}
                  {!check.valid ? " · Cần sửa" : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <SectionSummary draft={draft} />
        )}
        {preflight && issues.length ? (
          <ul className={styles.issueLinks} aria-label="Các mục cần sửa">
            {issues.map((issue) => (
              <li key={issue.field}>
                <Button variant="ghost" onClick={() => onIssue(issue)}>
                  {issue.message} →
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className={styles.caption}>
          {draft.revision
            ? `Bản sửa đã xác nhận: ${draft.revision}.`
            : "Chưa có bản nháp đã lưu trên máy chủ."}{" "}
          Số liệu thuộc nội dung đang sửa.
        </p>
        <p className={styles.notice}>
          Kiểm tra trên màn hình không thay thế kiểm tra của máy chủ khi lưu và phát hành.
        </p>
      </section>
      <section className={`${styles.panel} ${styles.frozen}`}>
        <h3>Nội dung được giữ cố định</h3>
        <p className={styles.caption}>
          Phiên bản phát hành giữ nội dung cho các lượt thi bắt đầu với phiên bản đó. Sửa bản nháp
          hoặc ngân hàng không thay đổi những lượt này.
        </p>
      </section>
    </aside>
  );
}
export function ConflictDraftSummary({
  title,
  fields,
  revision,
}: {
  title: string;
  fields: ExamDraft["fields"];
  revision: number;
}) {
  const totals = draftTotals(fields.sections);
  return (
    <section>
      <h3>
        {title} · Bản sửa {revision}
      </h3>
      <dl className={styles.facts}>
        <div>
          <dt>Tiêu đề</dt>
          <dd>{fields.title}</dd>
        </div>
        <div>
          <dt>Danh mục</dt>
          <dd>{categoryLabel(fields.category)}</dd>
        </div>
        <div>
          <dt>Thời lượng</dt>
          <dd>{formatDuration(Math.round(Number(fields.duration) * 60))}</dd>
        </div>
        <div>
          <dt>Lịch / múi giờ</dt>
          <dd>
            {fields.openAt.replace("T", " ")} – {fields.closeAt.replace("T", " ")} · {fields.zone}
          </dd>
        </div>
        <div>
          <dt>Lượt / lời giải / xếp hạng</dt>
          <dd>
            {fields.limit} lượt · {policyLabel(fields.policy)} ·{" "}
            {fields.board ? "Dùng bí danh" : "Tắt"}
          </dd>
        </div>
        <div>
          <dt>Cấu trúc</dt>
          <dd>
            {totals.sections} phần · {totals.questions} câu · {displayPoints(totals.points)} điểm
          </dd>
        </div>
      </dl>
      <ul className={styles.sectionList}>
        {fields.sections.map((section, index) => (
          <li key={index}>
            <span>
              {index + 1}. {section.title}
              <br />
              <small>
                {section.questions
                  .map((slot) => `…${slot.bankQuestionId.slice(-6)}: ${slot.points}đ`)
                  .join(" · ")}
              </small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { useState } from "react";
import { Link, useMatch, useParams } from "react-router";

import { isApiError } from "@web/shared/api/errors";
import { categoryLabel } from "@web/shared/format";
import { Alert, Badge, Button, Dialog, ErrorPanel, SkeletonLines } from "@web/shared/ui/ui";

import type { DraftIssue } from "./exam-draft-model";
import styles from "./exam-editor.module.css";
import { ExamEditorActions } from "./exam-editor-actions";
import {
  type ExamConfirmation,
  ExamConfirmDialog,
  ExamConflictDialog,
} from "./exam-editor-dialogs";
import { ExamInformation } from "./exam-information";
import { ExamPreflight, ExamSummary } from "./exam-preflight";
import { ExamStructure } from "./exam-structure";
import { CapabilityGate, useCapability } from "./gate";
import { useExamDraft } from "./use-exam-draft";
import { useExamNavigation } from "./use-exam-navigation";

export function AdminExamEditorPage() {
  const isNew = Boolean(useMatch("/admin/exams/new"));
  const { examId = "" } = useParams();
  return <ExamEditor key={isNew ? "new" : examId} isNew={isNew} examId={examId} />;
}
function ExamEditor({ isNew, examId }: { isNew: boolean; examId: string }) {
  const draft = useExamDraft(isNew, examId);
  const [step, setStep] = useState(0);
  const [confirm, setConfirm] = useState<ExamConfirmation | null>(null);
  const blocker = useExamNavigation(draft);
  const canMonitor = useCapability("reporting.read") === "allowed";
  const canStatistics = useCapability("reporting.read") === "allowed";
  const { seed } = draft;
  const ready = !draft.unavailable && (isNew || Boolean(seed));
  function correct(issue: DraftIssue) {
    setStep(issue.step);
    requestAnimationFrame(() => document.getElementById(`exam-${issue.field}`)?.focus());
  }
  return (
    <CapabilityGate permission="catalog.manage">
      <div className={styles.page}>
        <p className={styles.breadcrumb}>
          Quản trị / <Link to="/admin/exams">Đề thi</Link> / {isNew ? "Tạo đề" : "Sửa bản nháp"}
        </p>
        <header className={styles.heading}>
          <div>
            <div className={styles.title}>
              <h1>{isNew ? "Tạo bản nháp" : (seed?.title ?? "Sửa đề")}</h1>
              <Badge tone={seed?.archived ? "neutral" : seed?.published ? "success" : "warning"}>
                {seed?.archived ? "Đã lưu trữ" : seed?.published ? "✓ Đang phát hành" : "Bản nháp"}
              </Badge>
            </div>
            <p className={styles.caption}>
              {categoryLabel(draft.category)} ·{" "}
              {draft.revision ? `Bản sửa ${draft.revision}` : "Chưa lưu trên máy chủ"}
              {draft.dirty ? " · Có thay đổi chưa lưu" : ""}
            </p>
          </div>
          <Link to="/admin/exams">← Danh sách đề</Link>
        </header>
        {!isNew && draft.existing.isLoading ? <SkeletonLines /> : null}
        {draft.existing.error && !draft.conflict ? (
          <ErrorPanel
            error={draft.existing.error}
            onRetry={draft.hidden ? undefined : () => void draft.existing.refetch()}
          />
        ) : null}
        {draft.hideBank ? <ErrorPanel error={draft.bank.error} /> : null}
        {draft.error && !draft.unknown && !draft.conflict && !confirm ? (
          isApiError(draft.error) ? (
            <ErrorPanel error={draft.error} />
          ) : (
            <Alert
              title={draft.error instanceof Error ? draft.error.message : "Không thực hiện được"}
            />
          )
        ) : null}
        {ready ? (
          <>
            {seed?.archived ? (
              <Alert tone="warning" title="Đề đã được lưu trữ">
                Nội dung chỉ để xem. Các lượt đã bắt đầu và kết quả được giữ nguyên.
              </Alert>
            ) : null}
            {draft.notice && !confirm ? (
              <Alert
                tone={draft.error || draft.unknown ? "warning" : "success"}
                title={draft.notice}
              />
            ) : null}
            {draft.unknown && !confirm ? (
              <Alert tone="warning" title="Chưa xác nhận được kết quả">
                <p>Giữ nguyên yêu cầu để thử lại. Các thao tác khác đang được khóa.</p>
                <Button disabled={draft.pending} onClick={() => void draft.retry()}>
                  Thử lại yêu cầu
                </Button>
              </Alert>
            ) : null}
            <nav className={styles.steps} aria-label="Các bước soạn đề">
              {["Thông tin", "Các phần & câu hỏi", "Kiểm tra & phát hành"].map((label, index) => (
                <Button
                  key={label}
                  variant="ghost"
                  aria-label={label}
                  aria-current={step === index ? "step" : undefined}
                  onClick={() => setStep(index)}
                >
                  <span className={styles.stepNumber} aria-hidden="true">
                    {index + 1}
                  </span>
                  {label}
                </Button>
              ))}
            </nav>
            <div className={styles.grid}>
              <div>
                <fieldset className={styles.fields} disabled={draft.locked} hidden={step !== 0}>
                  <ExamInformation draft={draft} />
                </fieldset>
                <div hidden={step !== 1}>
                  <ExamStructure draft={draft} />
                </div>
                <div hidden={step !== 2}>
                  <ExamPreflight draft={draft} onStep={setStep} />
                </div>
              </div>
              <ExamSummary draft={draft} preflight={step === 2} onIssue={correct} />
            </div>
            <ExamEditorActions
              draft={draft}
              step={step}
              onStep={setStep}
              onConfirm={setConfirm}
              canMonitor={canMonitor}
              canStatistics={canStatistics}
            />
            {confirm && !draft.conflict ? (
              <ExamConfirmDialog kind={confirm} draft={draft} onClose={() => setConfirm(null)} />
            ) : null}
            <ExamConflictDialog draft={draft} />
          </>
        ) : null}
        {blocker.state === "blocked" && ready ? (
          <Dialog title="Rời bản nháp chưa lưu?" onClose={() => blocker.reset()}>
            <p>
              {draft.pending || draft.unknown
                ? "Một yêu cầu còn chờ xác nhận. Rời trang có thể mất thông tin để thử lại; máy chủ vẫn có thể đã ghi nhận yêu cầu."
                : "Các thay đổi trên màn hình chưa được lưu. Rời trang sẽ bỏ những thay đổi này; bản nháp đã lưu được giữ nguyên."}
            </p>
            <div className={styles.actions}>
              <Button
                variant="secondary"
                disabled={draft.pending}
                onClick={() => blocker.proceed()}
              >
                Rời và bỏ thay đổi
              </Button>
              <Button onClick={() => blocker.reset()}>Ở lại chỉnh sửa</Button>
            </div>
          </Dialog>
        ) : null}
      </div>
    </CapabilityGate>
  );
}

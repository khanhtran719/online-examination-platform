import { useMatch, useParams } from "react-router";

import { useTitle } from "@web/app/use-title";
import { ErrorPanel, SkeletonLines } from "@web/shared/ui/ui";

import { CapabilityGate } from "./gate";
import { QuestionForm } from "./question-form";
import { useQuestionEditor } from "./use-question-editor";

export function QuestionEditorPage() {
  const isNew = Boolean(useMatch("/admin/questions/new"));
  const { questionId = "" } = useParams();
  return <Editor key={isNew ? "new" : questionId} isNew={isNew} questionId={questionId} />;
}
function Editor({ isNew, questionId }: { isNew: boolean; questionId: string }) {
  useTitle(isNew ? "Tạo câu" : "Sửa câu");
  const editor = useQuestionEditor(isNew, questionId);
  return (
    <CapabilityGate permission="catalog.keys.read">
      <CapabilityGate permission="catalog.manage">
        {editor.existing.isLoading ? <SkeletonLines /> : null}
        {editor.existing.error && !editor.hidden ? (
          <ErrorPanel
            error={editor.existing.error}
            onRetry={() => void editor.existing.refetch()}
          />
        ) : null}
        {editor.hidden ? <ErrorPanel error={editor.writeError ?? editor.existing.error} /> : null}
        {!editor.unavailable && (isNew || editor.existing.data) ? (
          <QuestionForm
            initial={editor.existing.data ?? null}
            onSave={editor.save}
            onArchive={isNew ? null : editor.archive}
            onConflict={editor.onConflict}
            onCreated={editor.created}
            fetching={editor.existing.isFetching}
            readError={editor.existing.error}
          />
        ) : null}
      </CapabilityGate>
    </CapabilityGate>
  );
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { useProtectedAccess } from "../../shared/protected-access";
import { ErrorPanel, SkeletonLines } from "../../shared/ui/ui";
import { CapabilityGate, useCapability } from "./gate";
import { QuestionForm } from "./question-form";
export function QuestionEditorPage() {
  const isNew = Boolean(useMatch("/admin/questions/new"));
  const { questionId = "" } = useParams();
  useTitle(isNew ? "Tạo câu" : "Sửa câu");
  const keys = useCapability("catalog.keys.read");
  const manage = useCapability("catalog.manage");
  const { api } = useRuntime();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState(false);
  const existing = useQuery({
    queryKey: ["bank-question", questionId],
    enabled: !isNew && keys === "allowed" && manage === "allowed" && !blocked,
    queryFn: () => api.getBankQuestion(questionId).then((response) => response.data),
  });
  const hidden = useProtectedAccess(existing.error, [["bank-question", questionId]], blocked, () =>
    setBlocked(true),
  );
  if (keys !== "allowed") {
    return (
      <CapabilityGate permission="catalog.keys.read">
        <p>Soạn đáp án cần catalog.keys.read. catalog.manage không suy ra quyền này.</p>
      </CapabilityGate>
    );
  }
  return (
    <CapabilityGate permission="catalog.manage">
      {existing.isLoading ? <SkeletonLines /> : null}
      {existing.error ? (
        <ErrorPanel
          error={existing.error}
          onRetry={hidden ? undefined : () => void existing.refetch()}
        />
      ) : null}
      {!hidden && (isNew || existing.data) ? (
        <QuestionForm
          key={existing.data?.id ?? "new"}
          initial={existing.data ?? null}
          onSave={async (key, body) => {
            const saved =
              isNew || !existing.data
                ? await api.createBankQuestion(key, body)
                : await api.replaceBankQuestion(existing.data.id, key, body);
            await client.invalidateQueries({ queryKey: ["bank"] });
            await client.invalidateQueries({ queryKey: ["bank-question", saved.data.resourceId] });
            if (isNew)
              navigate(`/admin/questions/${saved.data.resourceId}/edit`, { replace: true });
            return saved.data;
          }}
          onArchive={
            existing.data
              ? async (key, expectedRevision) => {
                  const saved = await api.archiveBankQuestion(existing.data.id, key, {
                    expectedRevision,
                  });
                  await existing.refetch();
                  return saved.data.revision;
                }
              : null
          }
        />
      ) : null}
    </CapabilityGate>
  );
}

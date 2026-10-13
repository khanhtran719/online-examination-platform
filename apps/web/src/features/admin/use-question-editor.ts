import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { useRuntime } from "@web/app/runtime";
import type { QuestionWriteRequest } from "@web/shared/api/dto";
import { isForbidden, useProtectedAccess } from "@web/shared/protected-access";

import { useCapability } from "./gate";

export function useQuestionEditor(isNew: boolean, questionId: string) {
  const keys = useCapability("catalog.keys.read"),
    manage = useCapability("catalog.manage");
  const { api } = useRuntime();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState(false);
  const [writeError, setWriteError] = useState<unknown>(null);
  const existing = useQuery({
    queryKey: ["bank-question", questionId],
    enabled: !isNew && keys === "allowed" && manage === "allowed" && !blocked,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () => api.getBankQuestion(questionId).then((r) => r.data),
  });
  const hidden = useProtectedAccess(
    isForbidden(writeError) ? writeError : existing.error,
    [["bank-question", questionId], ["bank"]],
    blocked,
    () => setBlocked(true),
  );
  const unavailable = hidden || keys !== "allowed" || manage !== "allowed";
  useEffect(() => {
    if (!unavailable) return;
    void client.cancelQueries({ queryKey: ["bank-question", questionId] });
    client.removeQueries({ queryKey: ["bank-question", questionId] });
    client.removeQueries({ queryKey: ["bank"] });
  }, [unavailable, client, questionId]);
  async function save(key: string, body: QuestionWriteRequest) {
    try {
      const response = isNew
        ? await api.createBankQuestion(key, body)
        : await api.replaceBankQuestion(questionId, key, body);
      void client.invalidateQueries({ queryKey: ["bank"] });
      void client.invalidateQueries({ queryKey: ["bank-question", response.data.resourceId] });
      return response.data;
    } catch (error) {
      if (isForbidden(error)) setWriteError(error);
      throw error;
    }
  }
  async function archive(key: string, expectedRevision: number) {
    try {
      const response = await api.archiveBankQuestion(questionId, key, { expectedRevision });
      void client.invalidateQueries({ queryKey: ["bank"] });
      void existing.refetch();
      return response.data.revision;
    } catch (error) {
      if (isForbidden(error)) setWriteError(error);
      throw error;
    }
  }
  return {
    keys,
    existing,
    hidden,
    unavailable,
    writeError,
    save,
    archive,
    onConflict: () => {
      void existing.refetch();
    },
    created: (id: string) => navigate(`/admin/questions/${id}/edit`, { replace: true }),
  };
}

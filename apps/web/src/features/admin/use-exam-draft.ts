import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import type { Category, ExamWriteRequest, ExplanationPolicy } from "../../shared/api/dto";
import { isApiError } from "../../shared/api/errors";
import { useProtectedAccess } from "../../shared/protected-access";
import { uuidV7 } from "../../shared/api/uuid";
import { utcToZonedInput, zonedInputToUtc } from "../../shared/timezone";
import { useCapability } from "./gate";
import { idleIntent, settleIntent, startIntent, type IntentMachine } from "./mutation-intent";
interface Membership {
  bankQuestionId: string;
  points: number;
}

function membershipsOf(seed: {
  sections: { title: string; questions: { bankQuestionId: string; points: number }[] }[];
}): {
  title: string;
  questions: Membership[];
}[] {
  return seed.sections.map((section) => ({
    title: section.title,
    questions: section.questions.map((question) => ({
      bankQuestionId: question.bankQuestionId,
      points: question.points,
    })),
  }));
}

export function useExamDraft(isNew: boolean, examId: string) {
  useTitle(isNew ? "Tạo đề" : "Sửa đề");
  const gate = useCapability("catalog.manage");
  const { api } = useRuntime();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState(false);
  const [bankBlocked, setBankBlocked] = useState(false);
  const existing = useQuery({
    queryKey: ["admin-exam", examId],
    enabled: gate === "allowed" && !isNew && !blocked,
    queryFn: () => api.getAdminExam(examId).then((response) => response.data),
  });
  const bank = useInfiniteQuery({
    queryKey: ["bank", "picker"],
    enabled: gate === "allowed" && !bankBlocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.listBankQuestions({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(existing.error, [["admin-exam", examId]], blocked, () =>
    setBlocked(true),
  );
  const hideBank = useProtectedAccess(bank.error, [["bank", "picker"]], bankBlocked, () =>
    setBankBlocked(true),
  );
  const seed = hidden ? undefined : existing.data;
  const [title, setTitle] = useState(seed?.title ?? "");
  const [category, setCategory] = useState<Category>(seed?.category ?? "IT_CERTIFICATION");
  const [duration, setDuration] = useState(String(seed?.durationSeconds ?? 2700));
  const [zone, setZone] = useState(seed?.displayTimezone ?? "Asia/Ho_Chi_Minh");
  const [openAt, setOpenAt] = useState(
    seed
      ? utcToZonedInput(seed.openAt, seed.displayTimezone)
      : utcToZonedInput(new Date().toISOString(), "Asia/Ho_Chi_Minh"),
  );
  const [closeAt, setCloseAt] = useState(
    seed
      ? utcToZonedInput(seed.closeAt, seed.displayTimezone)
      : utcToZonedInput(new Date(Date.now() + 7 * 86400000).toISOString(), "Asia/Ho_Chi_Minh"),
  );
  const [limit, setLimit] = useState(String(seed?.attemptLimit ?? 1));
  const [policy, setPolicy] = useState<ExplanationPolicy>(seed?.explanationPolicy ?? "NEVER");
  const [board, setBoard] = useState(seed?.leaderboardEnabled ?? false);
  const [sections, setSections] = useState<{ title: string; questions: Membership[] }[]>(
    seed ? membershipsOf(seed) : [{ title: "Phần 1", questions: [] }],
  );
  const [revision, setRevision] = useState(seed?.revision ?? 0);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const seeded = useRef(false);
  const createdId = useRef<string | null>(null);
  const draftIntent = useRef<IntentMachine<ExamWriteRequest>>(idleIntent());
  const actionIntent = useRef<IntentMachine<{ expectedRevision: number }>>(idleIntent());
  if (seed && !seeded.current) {
    seeded.current = true;
    setTitle(seed.title);
    setCategory(seed.category);
    setDuration(String(seed.durationSeconds));
    setZone(seed.displayTimezone);
    setOpenAt(utcToZonedInput(seed.openAt, seed.displayTimezone));
    setCloseAt(utcToZonedInput(seed.closeAt, seed.displayTimezone));
    setLimit(String(seed.attemptLimit));
    setPolicy(seed.explanationPolicy);
    setBoard(seed.leaderboardEnabled);
    setSections(membershipsOf(seed));
    setRevision(seed.revision);
  }
  const questions = hideBank ? [] : (bank.data?.pages.flatMap((page) => page.items) ?? []);
  function unknownOutcome(caught: unknown): boolean {
    return isApiError(caught) && (caught.kind === "network" || caught.kind === "timeout");
  }
  function buildBody(): ExamWriteRequest | null {
    let openUtc = "";
    let closeUtc = "";
    try {
      openUtc = zonedInputToUtc(openAt, zone);
      closeUtc = zonedInputToUtc(closeAt, zone);
    } catch {
      setError(new Error("Giờ mở và giờ đóng cần đúng định dạng."));
      return null;
    }
    const body: ExamWriteRequest = {
      title: title.trim(),
      category,
      durationSeconds: Number(duration),
      openAt: openUtc,
      closeAt: closeUtc,
      displayTimezone: zone,
      attemptLimit: Number(limit),
      explanationPolicy: policy,
      leaderboardEnabled: board,
      sections: sections.map((section, index) => ({
        title: section.title.trim(),
        position: index + 1,
        questions: section.questions.map((question, questionIndex) => ({
          bankQuestionId: question.bankQuestionId,
          position: questionIndex + 1,
          points: question.points,
        })),
      })),
      expectedRevision: revision,
    };
    const ids = body.sections.flatMap((section) =>
      section.questions.map((question) => question.bankQuestionId),
    );
    const minutes = body.durationSeconds / 60;
    if (!body.title || body.sections.length < 1 || body.sections.length > 20) {
      setError(new Error("Cần tiêu đề và từ 1 đến 20 phần."));
      return null;
    }
    if (body.sections.some((section) => section.questions.length === 0)) {
      setError(new Error("Mỗi phần cần ít nhất một câu."));
      return null;
    }
    if (ids.length > 500 || new Set(ids).size !== ids.length) {
      setError(new Error("Mỗi đề có tối đa 500 câu và không được chọn trùng."));
      return null;
    }
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
      setError(new Error("Thời lượng từ 1 đến 240 phút."));
      return null;
    }
    if (!Number.isInteger(body.attemptLimit) || body.attemptLimit < 1 || body.attemptLimit > 10) {
      setError(new Error("Giới hạn lượt từ 1 đến 10."));
      return null;
    }
    if (!(Date.parse(openUtc) < Date.parse(closeUtc))) {
      setError(new Error("Giờ mở phải sớm hơn giờ đóng."));
      return null;
    }
    if (
      body.sections.some((section) =>
        section.questions.some((question) => question.points < 1 || question.points > 1000),
      )
    ) {
      setError(
        new Error("Điểm mỗi câu trong đề từ 1 đến 1000. Không lấy điểm mặc định của ngân hàng."),
      );
      return null;
    }
    return body;
  }
  async function saveDraft(): Promise<{ id: string; revision: number } | null> {
    const body = buildBody();
    if (!body) return null;
    const started = startIntent(draftIntent.current, {
      action: createdId.current || !isNew ? "replace-exam" : "create-exam",
      body,
      expectedRevision: revision,
      keyFactory: uuidV7,
    });
    if (!started.send) {
      setError(
        new Error(
          started.blocked === "changed"
            ? "Nội dung đã đổi so với lần lưu chưa xác nhận."
            : "Đang lưu lần này.",
        ),
      );
      return null;
    }
    draftIntent.current = started.machine;
    setPending(true);
    setError(null);
    try {
      const target = createdId.current ?? (isNew ? null : examId);
      const saved = target
        ? await api.replaceExamDraft(target, started.send.key, started.send.body)
        : await api.createExam(started.send.key, started.send.body);
      draftIntent.current = settleIntent(draftIntent.current, "acked");
      createdId.current = saved.data.resourceId;
      setRevision(saved.data.revision);
      await client.invalidateQueries({ queryKey: ["admin-exams"] });
      await client.invalidateQueries({ queryKey: ["admin-exam", saved.data.resourceId] });
      return { id: saved.data.resourceId, revision: saved.data.revision };
    } catch (caught) {
      draftIntent.current = settleIntent(
        draftIntent.current,
        unknownOutcome(caught) ? "unknown" : "rejected",
      );
      if (isApiError(caught) && caught.status === 409) await existing.refetch();
      setError(caught);
      return null;
    } finally {
      setPending(false);
    }
  }
  async function runAction(
    kind: "publish" | "unpublish" | "archive",
    resourceId: string,
    expectedRevision: number,
  ) {
    const started = startIntent(actionIntent.current, {
      action: kind,
      body: { expectedRevision },
      expectedRevision,
      keyFactory: uuidV7,
    });
    if (!started.send) {
      setError(
        new Error(
          started.blocked === "changed"
            ? "Revision đã đổi so với lần gửi chưa xác nhận."
            : "Đang gửi lần này.",
        ),
      );
      return;
    }
    actionIntent.current = started.machine;
    setPending(true);
    setError(null);
    try {
      const body = started.send.body;
      const saved =
        kind === "publish"
          ? await api.publishExam(resourceId, started.send.key, body)
          : kind === "unpublish"
            ? await api.unpublishExam(resourceId, started.send.key, body)
            : await api.archiveExam(resourceId, started.send.key, body);
      actionIntent.current = settleIntent(actionIntent.current, "acked");
      setRevision(saved.data.revision);
      await client.invalidateQueries({ queryKey: ["admin-exam", resourceId] });
      if (isNew) navigate(`/admin/exams/${resourceId}/edit`, { replace: true });
    } catch (caught) {
      actionIntent.current = settleIntent(
        actionIntent.current,
        unknownOutcome(caught) ? "unknown" : "rejected",
      );
      if (isApiError(caught) && caught.status === 409) await existing.refetch();
      setError(caught);
    } finally {
      setPending(false);
    }
  }
  async function save(publishAfter: boolean) {
    const saved = await saveDraft();
    if (!saved) return;
    if (publishAfter) {
      await runAction("publish", saved.id, saved.revision);
      return;
    }
    if (isNew) navigate(`/admin/exams/${saved.id}/edit`, { replace: true });
  }
  async function mutate(kind: "publish" | "unpublish" | "archive") {
    const resourceId = createdId.current ?? (isNew ? null : examId);
    if (!resourceId) return;
    await runAction(kind, resourceId, revision);
  }
  return {
    existing,
    bank,
    seed,
    hidden,
    hideBank,
    questions,
    title,
    setTitle,
    category,
    setCategory,
    duration,
    setDuration,
    zone,
    setZone,
    openAt,
    setOpenAt,
    closeAt,
    setCloseAt,
    limit,
    setLimit,
    policy,
    setPolicy,
    board,
    setBoard,
    sections,
    setSections,
    revision,
    error,
    setError,
    pending,
    save,
    mutate,
  };
}
export type ExamDraft = ReturnType<typeof useExamDraft>;

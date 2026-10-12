import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { type SetStateAction, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useRuntime } from "@web/app/runtime";
import { useTitle } from "@web/app/use-title";
import type { ExamWriteRequest } from "@web/shared/api/dto";
import { isApiError } from "@web/shared/api/errors";
import { uuidV7 } from "@web/shared/api/uuid";
import { useProtectedAccess } from "@web/shared/protected-access";

import {
  buildExamDraft,
  type ExamFields,
  examFieldsOf,
  newExamFields,
  rezoneExamFields,
} from "./exam-draft-model";
import { useCapability } from "./gate";

type Action = "publish" | "unpublish" | "archive";
interface Operation {
  kind: "save" | "save-publish" | Action;
  stage: "save" | "action";
  id: string | null;
  key: string;
  body: ExamWriteRequest | { expectedRevision: number };
  fields: ExamFields;
  saved: boolean;
}
function unconfirmed(error: unknown) {
  return (
    isApiError(error) &&
    (error.kind === "network" ||
      error.kind === "timeout" ||
      error.kind === "malformed" ||
      error.status >= 500)
  );
}

export function useExamDraft(isNew: boolean, examId: string) {
  useTitle(isNew ? "Tạo đề" : "Sửa đề");
  const gate = useCapability("catalog.manage");
  const { api } = useRuntime();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState(false),
    [bankBlocked, setBankBlocked] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const readId = savedId ?? examId;
  const [error, setError] = useState<unknown>(null);
  const existing = useQuery({
    queryKey: ["admin-exam", readId],
    enabled: gate === "allowed" && (!isNew || Boolean(savedId)) && !blocked && !bankBlocked,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () => api.getAdminExam(readId).then((response) => response.data),
  });
  const bank = useInfiniteQuery({
    queryKey: ["bank", "picker"],
    enabled: gate === "allowed" && !blocked && !bankBlocked,
    retry: false,
    refetchOnWindowFocus: false,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.listBankQuestions({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(
    isApiError(existing.error) && existing.error.status === 403
      ? existing.error
      : (error ?? existing.error),
    [
      ["admin-exam", readId],
      ["bank", "picker"],
    ],
    blocked,
    () => setBlocked(true),
  );
  const hideBank = useProtectedAccess(bank.error, [["bank", "picker"]], bankBlocked, () =>
    setBankBlocked(true),
  );
  const unavailable = hidden || hideBank || gate !== "allowed";
  const authorityBlocked = useRef(unavailable);
  authorityBlocked.current = unavailable;
  const seed = unavailable ? undefined : existing.data;
  const [fields, setFields] = useState<ExamFields>(() =>
    seed ? examFieldsOf(seed) : newExamFields(),
  );
  const [revision, setRevision] = useState(seed?.revision ?? 0);
  const seeded = useRef(Boolean(seed));
  const baseline = useRef(fields);
  const createdId = useRef<string | null>(null);
  const operation = useRef<Operation | null>(null);
  const busy = useRef(false);
  const allowNavigation = useRef(false);
  const [pending, setPending] = useState(false),
    [unknown, setUnknown] = useState(false),
    [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState("");
  if (seed && !seeded.current) {
    seeded.current = true;
    const loaded = examFieldsOf(seed);
    baseline.current = loaded;
    setFields(loaded);
    setRevision(seed.revision);
  }
  useEffect(() => {
    if (!unavailable) return;
    seeded.current = false;
    createdId.current = null;
    setSavedId(null);
    for (const queryKey of [
      ["admin-exam", readId],
      ["bank", "picker"],
    ]) {
      void client.cancelQueries({ queryKey });
      client.removeQueries({ queryKey });
    }
    const cleared = newExamFields();
    baseline.current = cleared;
    operation.current = null;
    setFields(cleared);
    setRevision(0);
    setUnknown(false);
    setConflict(false);
    setNotice("");
  }, [unavailable, client, readId]);
  const locked =
    pending ||
    unknown ||
    conflict ||
    Boolean(seed?.archived) ||
    hidden ||
    hideBank ||
    gate !== "allowed";
  const validation = buildExamDraft(fields, revision);
  const dirty = JSON.stringify(fields) !== JSON.stringify(baseline.current);
  function update<K extends keyof ExamFields>(key: K, value: SetStateAction<ExamFields[K]>) {
    if (locked || busy.current) return;
    setFields((current) => ({
      ...current,
      [key]:
        typeof value === "function"
          ? (value as (previous: ExamFields[K]) => ExamFields[K])(current[key])
          : value,
    }));
    setNotice("");
  }
  function useLatest() {
    if (!conflict || !seed || existing.isFetching || existing.isError || hidden || busy.current)
      return;
    const fresh = examFieldsOf(seed);
    baseline.current = fresh;
    setFields(fresh);
    setRevision(seed.revision);
    setConflict(false);
    setError(null);
    setNotice("Đã dùng bản nháp mới nhất. Các thay đổi cũ trên màn hình đã được bỏ.");
  }
  async function execute(op: Operation) {
    if (busy.current || authorityBlocked.current || seed?.archived) return;
    busy.current = true;
    setPending(true);
    setUnknown(false);
    setError(null);
    setNotice(op.saved ? "Đã lưu bản nháp." : "");
    try {
      if (op.stage === "save") {
        const body = op.body as ExamWriteRequest;
        const response = op.id
          ? await api.replaceExamDraft(op.id, op.key, body)
          : await api.createExam(op.key, body);
        if (authorityBlocked.current) return;
        op.id = response.data.resourceId;
        createdId.current = op.id;
        seeded.current = true;
        setSavedId(op.id);
        baseline.current = op.fields;
        setRevision(response.data.revision);
        setNotice("Đã lưu bản nháp.");
        op.saved = true;
        if (op.kind === "save-publish") {
          op.stage = "action";
          op.key = uuidV7();
          op.body = { expectedRevision: response.data.revision };
        }
      }
      if (op.stage === "action" && op.id) {
        const body = op.body as { expectedRevision: number };
        const response =
          op.kind === "unpublish"
            ? await api.unpublishExam(op.id, op.key, body)
            : op.kind === "archive"
              ? await api.archiveExam(op.id, op.key, body)
              : await api.publishExam(op.id, op.key, body);
        if (authorityBlocked.current) return;
        setRevision(response.data.revision);
        setNotice(
          op.kind === "unpublish"
            ? "Đã gỡ phát hành. Các lượt đã bắt đầu được giữ nguyên."
            : op.kind === "archive"
              ? "Đã lưu trữ đề. Các lượt đã làm được giữ nguyên."
              : "Đã phát hành phiên bản.",
        );
      }
      operation.current = null;
      if (op.id) {
        await Promise.all([
          client.invalidateQueries({ queryKey: ["admin-exams"] }),
          client.invalidateQueries({ queryKey: ["admin-exam", op.id] }),
        ]);
        if (isNew) {
          allowNavigation.current = true;
          navigate(`/admin/exams/${op.id}/edit`, { replace: true });
        }
      }
    } catch (caught) {
      if (authorityBlocked.current) return;
      const ambiguous = unconfirmed(caught);
      setUnknown(ambiguous);
      setError(caught);
      if (!ambiguous) operation.current = null;
      if (op.saved) setNotice("Đã lưu bản nháp. Phát hành chưa được xác nhận.");
      if (isApiError(caught) && caught.status === 409 && caught.errorCode === "Version conflict") {
        setConflict(true);
        if (op.id) {
          try {
            await client.fetchQuery({
              queryKey: ["admin-exam", op.id],
              queryFn: () => api.getAdminExam(op.id!).then((response) => response.data),
              staleTime: 0,
            });
          } catch {
            /* The protected read observer renders its error; local edits stay intact. */
          }
        }
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function save(publishAfter: boolean) {
    if (locked || busy.current || operation.current) return;
    const body = buildExamDraft(fields, revision).body;
    if (!body) return;
    const op: Operation = {
      kind: publishAfter ? "save-publish" : "save",
      stage: "save",
      id: createdId.current ?? (isNew ? null : examId),
      key: uuidV7(),
      body,
      fields,
      saved: false,
    };
    operation.current = op;
    await execute(op);
  }
  async function mutate(kind: Action) {
    if (locked || busy.current || operation.current) return;
    const id = createdId.current ?? (isNew ? null : examId);
    if (!id) return;
    const op: Operation = {
      kind,
      stage: "action",
      id,
      key: uuidV7(),
      body: { expectedRevision: revision },
      fields,
      saved: false,
    };
    operation.current = op;
    await execute(op);
  }
  async function retry() {
    if (operation.current && unknown) await execute(operation.current);
  }
  return {
    existing,
    bank,
    seed,
    hidden,
    hideBank,
    unavailable,
    questions: hidden || hideBank ? [] : (bank.data?.pages.flatMap((page) => page.items) ?? []),
    ...fields,
    fields,
    setTitle: (value: string) => update("title", value),
    setCategory: (value: ExamFields["category"]) => update("category", value),
    setDuration: (value: string) => update("duration", value),
    setZone: (value: string) => {
      if (locked || busy.current) return;
      try {
        setFields(rezoneExamFields(fields, value));
        setError(null);
        setNotice("");
      } catch {
        setError(new Error("Chưa đổi được múi giờ vì ngày giờ đang nhập chưa hợp lệ."));
      }
    },
    setOpenAt: (value: string) => update("openAt", value),
    setCloseAt: (value: string) => update("closeAt", value),
    setLimit: (value: string) => update("limit", value),
    setPolicy: (value: ExamFields["policy"]) => update("policy", value),
    setBoard: (value: boolean) => update("board", value),
    setSections: (value: SetStateAction<ExamFields["sections"]>) => update("sections", value),
    revision,
    error,
    setError,
    pending,
    locked,
    unknown,
    conflict,
    dirty,
    notice,
    validation,
    allowNavigation,
    save,
    mutate,
    retry,
    useLatest,
  };
}
export type ExamDraft = ReturnType<typeof useExamDraft>;

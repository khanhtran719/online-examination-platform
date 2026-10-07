import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useMatch, useNavigate, useParams } from "react-router";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { QUESTION_TYPES, type QuestionType, type QuestionWriteRequest } from "../../shared/api/dto";
import { isApiError } from "../../shared/api/errors";
import { uuidV7 } from "../../shared/api/uuid";
import { useProtectedAccess } from "../../shared/protected-access";
import { questionIssues } from "../../shared/validation";
import {
  Button,
  EmptyState,
  ErrorPanel,
  SelectField,
  SkeletonLines,
  TextArea,
  TextField,
} from "../../shared/ui/ui";
import styles from "../../shared/styles/layout.module.css";
import { CapabilityGate, useCapability } from "./gate";
import { idleIntent, settleIntent, startIntent, type IntentMachine } from "./mutation-intent";

export function QuestionListPage() {
  useTitle("Ngân hàng câu");
  const gate = useCapability("catalog.manage");
  const { api, demo } = useRuntime();
  const canKeys = demo?.permissions.includes("catalog.keys.read") ?? false;
  const [blocked, setBlocked] = useState(false);
  const questions = useInfiniteQuery({
    queryKey: ["bank"],
    enabled: gate === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.listBankQuestions({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(questions.error, [["bank"]], blocked, () => setBlocked(true));
  const rows = hidden ? [] : (questions.data?.pages.flatMap((page) => page.items) ?? []);
  return (
    <CapabilityGate permission="catalog.manage">
      <h1 className={styles.title}>Ngân hàng câu</h1>
      {!canKeys ? <p>Không có catalog.keys.read nên đáp án không được hiển thị.</p> : null}
      <Link className={styles.chip} to="/admin/questions/new">
        Tạo câu
      </Link>
      {questions.isLoading ? <SkeletonLines /> : null}
      {questions.error ? (
        <ErrorPanel
          error={questions.error}
          onRetry={hidden ? undefined : () => void questions.refetch()}
        />
      ) : null}
      {questions.isSuccess && !hidden && rows.length === 0 ? (
        <EmptyState title="Ngân hàng trống">Tạo câu hoặc nhập JSON.</EmptyState>
      ) : null}
      <div className={styles.stack}>
        {rows.map((question) => (
          <Link
            key={question.id}
            className={`${styles.card} ${styles.cardLink}`}
            to={`/admin/questions/${question.id}/edit`}
          >
            <h2>{question.prompt.slice(0, 180)}</h2>
            <p>
              {question.type} · {question.points} điểm · revision {question.revision}
              {question.archived ? " · đã lưu trữ" : ""}
            </p>
            {canKeys ? (
              <p className={styles.muted}>
                Đáp án ở vị trí {question.correctOptionPositions.join(", ")}
              </p>
            ) : (
              <p className={styles.muted}>Đáp án đã ẩn</p>
            )}
          </Link>
        ))}
      </div>
      {questions.hasNextPage ? (
        <Button onClick={() => void questions.fetchNextPage()}>Tải thêm</Button>
      ) : (
        <p className={styles.muted}>Không có tổng số câu.</p>
      )}
    </CapabilityGate>
  );
}

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

function QuestionForm({
  initial,
  onSave,
  onArchive,
}: {
  initial: {
    prompt: string;
    type: QuestionType;
    options: { text: string }[];
    correctOptionPositions: number[];
    points: number;
    explanation: string | null;
    revision: number;
    archived: boolean;
  } | null;
  onSave: (
    key: string,
    body: QuestionWriteRequest,
  ) => Promise<{ resourceId: string; revision: number }>;
  onArchive: ((key: string, expectedRevision: number) => Promise<number>) | null;
}) {
  const [type, setType] = useState<QuestionType>(initial?.type ?? "SINGLE_CHOICE");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [options, setOptions] = useState(initial?.options.map((option) => option.text) ?? ["", ""]);
  const [correct, setCorrect] = useState<number[]>(initial?.correctOptionPositions ?? [1]);
  const [points, setPoints] = useState(String(initial?.points ?? 1));
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(initial?.revision ?? 0);
  const saveIntent = useRef<IntentMachine<QuestionWriteRequest>>(idleIntent());
  const archiveIntent = useRef<IntentMachine<{ expectedRevision: number }>>(idleIntent());
  useEffect(() => {
    if (saveIntent.current.phase === "idle" && initial) setRevision(initial.revision);
  }, [initial]);
  const body: QuestionWriteRequest = {
    type,
    prompt,
    options: options.map((text, index) => ({ position: index + 1, text })),
    correctOptionPositions: correct,
    points: Number(points),
    explanation: explanation.trim() ? explanation : null,
    expectedRevision: revision,
  };
  function unknownOutcome(caught: unknown): boolean {
    return isApiError(caught) && (caught.kind === "network" || caught.kind === "timeout");
  }
  return (
    <form
      className={styles.stack}
      onSubmit={(event) => {
        event.preventDefault();
        const issues = questionIssues(body);
        if (issues.length > 0) {
          setError(issues.join(" "));
          return;
        }
        const started = startIntent(saveIntent.current, {
          action: initial ? "replace-question" : "create-question",
          body,
          expectedRevision: revision,
          keyFactory: uuidV7,
        });
        if (!started.send) {
          setError(
            started.blocked === "changed"
              ? "Nội dung đã đổi so với lần lưu chưa xác nhận. Hãy thử lại đúng nội dung đã gửi."
              : "Đang lưu lần này.",
          );
          return;
        }
        saveIntent.current = started.machine;
        setPending(true);
        setError(null);
        void onSave(started.send.key, started.send.body)
          .then((receipt) => {
            saveIntent.current = settleIntent(saveIntent.current, "acked");
            setRevision(receipt.revision);
          })
          .catch((caught: unknown) => {
            saveIntent.current = settleIntent(
              saveIntent.current,
              unknownOutcome(caught) ? "unknown" : "rejected",
            );
            setError(isApiError(caught) ? caught.message : "Không lưu được.");
          })
          .finally(() => setPending(false));
      }}
    >
      <h1 className={styles.title}>
        {initial ? `Sửa câu · revision ${initial.revision}` : "Tạo câu"}
      </h1>
      {initial?.archived ? <p>Câu này đã lưu trữ.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <SelectField
        label="Loại"
        value={type}
        onChange={(event) => setType(event.target.value as QuestionType)}
      >
        {QUESTION_TYPES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </SelectField>
      <TextArea label="Đề bài" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
      {options.map((option, index) => (
        <TextField
          key={index}
          label={`Lựa chọn ${index + 1}`}
          value={option}
          onChange={(event) =>
            setOptions((current) =>
              current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
            )
          }
        />
      ))}
      <div className={styles.row}>
        <Button
          type="button"
          variant="secondary"
          disabled={options.length >= 10}
          onClick={() => setOptions((current) => [...current, ""])}
        >
          Thêm lựa chọn
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={options.length <= 2}
          onClick={() => setOptions((current) => current.slice(0, -1))}
        >
          Bớt lựa chọn
        </Button>
      </div>
      <TextField
        label="Vị trí đáp án đúng, cách nhau bởi dấu phẩy"
        value={correct.join(", ")}
        onChange={(event) =>
          setCorrect(
            event.target.value
              .split(",")
              .map((item) => Number(item.trim()))
              .filter((item) => Number.isInteger(item) && item > 0),
          )
        }
      />
      <TextField label="Điểm" value={points} onChange={(event) => setPoints(event.target.value)} />
      <TextArea
        label="Giải thích"
        value={explanation}
        onChange={(event) => setExplanation(event.target.value)}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Đang lưu…" : "Lưu câu"}
      </Button>
      {onArchive ? (
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            const started = startIntent(archiveIntent.current, {
              action: "archive-question",
              body: { expectedRevision: revision },
              expectedRevision: revision,
              keyFactory: uuidV7,
            });
            if (!started.send) return;
            archiveIntent.current = started.machine;
            void onArchive(started.send.key, started.send.expectedRevision)
              .then((nextRevision) => {
                archiveIntent.current = settleIntent(archiveIntent.current, "acked");
                setRevision(nextRevision);
              })
              .catch((caught: unknown) => {
                archiveIntent.current = settleIntent(
                  archiveIntent.current,
                  unknownOutcome(caught) ? "unknown" : "rejected",
                );
                setError(isApiError(caught) ? caught.message : "Không lưu trữ được.");
              });
          }}
        >
          Lưu trữ
        </Button>
      ) : null}
    </form>
  );
}

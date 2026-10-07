import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link, useMatch, useNavigate, useParams } from "react-router";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import {
  CATEGORIES,
  EXPLANATION_POLICIES,
  type Category,
  type ExamWriteRequest,
  type ExplanationPolicy,
} from "../../shared/api/dto";
import { isApiError } from "../../shared/api/errors";
import { useProtectedAccess } from "../../shared/protected-access";
import { uuidV7 } from "../../shared/api/uuid";
import { categoryLabel, policyLabel, shortId } from "../../shared/format";
import { timezoneChoices, utcToZonedInput, zonedInputToUtc } from "../../shared/timezone";
import {
  Button,
  EmptyState,
  ErrorPanel,
  SelectField,
  SkeletonLines,
  TextField,
} from "../../shared/ui/ui";
import { tableClass, tableWrapClass } from "../../shared/ui/ui";
import styles from "../../shared/styles/layout.module.css";
import { CapabilityGate, useCapability } from "./gate";
import { idleIntent, settleIntent, startIntent, type IntentMachine } from "./mutation-intent";

export function AdminExamListPage() {
  useTitle("Đề thi quản trị");
  const gate = useCapability("catalog.manage");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const exams = useInfiniteQuery({
    queryKey: ["admin-exams"],
    enabled: gate === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.listAdminExams({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(exams.error, [["admin-exams"]], blocked, () =>
    setBlocked(true),
  );
  const items = hidden ? [] : (exams.data?.pages.flatMap((page) => page.items) ?? []);
  return (
    <CapabilityGate permission="catalog.manage">
      <h1 className={styles.title}>Đề thi</h1>
      <Link className={styles.chip} to="/admin/exams/new">
        Tạo bản nháp
      </Link>
      {exams.isLoading ? <SkeletonLines /> : null}
      {exams.error ? (
        <ErrorPanel error={exams.error} onRetry={hidden ? undefined : () => void exams.refetch()} />
      ) : null}
      {exams.isSuccess && !hidden && items.length === 0 ? (
        <EmptyState title="Chưa có đề">Tạo bản nháp từ ngân hàng câu.</EmptyState>
      ) : null}
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Trạng thái</th>
              <th>Revision</th>
            </tr>
          </thead>
          <tbody>
            {items.map((exam) => (
              <tr key={exam.id}>
                <td>
                  <Link to={`/admin/exams/${exam.id}/edit`}>{exam.title}</Link>
                  <div className={styles.muted}>{shortId(exam.id)}</div>
                </td>
                <td>
                  {exam.archived ? "Đã lưu trữ" : exam.published ? "Đang phát hành" : "Bản nháp"}
                </td>
                <td>{exam.revision}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {exams.hasNextPage ? (
        <Button onClick={() => void exams.fetchNextPage()}>Tải thêm</Button>
      ) : (
        <p className={styles.muted}>Không có tổng số đề.</p>
      )}
    </CapabilityGate>
  );
}

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

export function AdminExamEditorPage() {
  const isNew = Boolean(useMatch("/admin/exams/new"));
  const { examId = "" } = useParams();
  useTitle(isNew ? "Tạo đề" : "Sửa đề");
  const gate = useCapability("catalog.manage");
  const { api } = useRuntime();
  const client = useQueryClient();
  const navigate = useNavigate();
  const existing = useQuery({
    queryKey: ["admin-exam", examId],
    enabled: gate === "allowed" && !isNew,
    queryFn: () => api.getAdminExam(examId).then((response) => response.data),
  });
  const bank = useInfiniteQuery({
    queryKey: ["bank", "picker"],
    enabled: gate === "allowed",
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.listBankQuestions({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const seed = existing.data;
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
  const [confirm, setConfirm] = useState<"publish" | "archive" | null>(null);
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
  const questions = bank.data?.pages.flatMap((page) => page.items) ?? [];
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
  return (
    <CapabilityGate permission="catalog.manage">
      <h1 className={styles.title}>{isNew ? "Tạo bản nháp" : (seed?.title ?? "Sửa đề")}</h1>
      <p className={styles.muted}>
        Giờ mở và giờ đóng được nhập theo múi giờ của đề, rồi lưu thành giờ UTC. Danh sách phiên bản
        cũ không có trên trang này.
      </p>
      {!isNew && existing.isLoading ? <SkeletonLines /> : null}
      {existing.error ? (
        <ErrorPanel error={existing.error} onRetry={() => void existing.refetch()} />
      ) : null}
      {error ? <ErrorPanel error={error} /> : null}
      {seed ? (
        <p>
          Revision {seed.revision}. {seed.published ? "Đang phát hành" : "Chưa phát hành"}
          {seed.archived ? " · đã lưu trữ" : ""}.
        </p>
      ) : null}
      <TextField label="Tiêu đề" value={title} onChange={(event) => setTitle(event.target.value)} />
      <SelectField
        label="Danh mục"
        value={category}
        onChange={(event) => setCategory(event.target.value as Category)}
      >
        {CATEGORIES.map((item) => (
          <option key={item} value={item}>
            {categoryLabel(item)}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Thời lượng (giây)"
        value={duration}
        onChange={(event) => setDuration(event.target.value)}
      />
      <SelectField
        label="Múi giờ hiển thị"
        value={zone}
        onChange={(event) => {
          const next = event.target.value;
          try {
            setOpenAt(utcToZonedInput(zonedInputToUtc(openAt, zone), next));
            setCloseAt(utcToZonedInput(zonedInputToUtc(closeAt, zone), next));
          } catch {
            setError(new Error("Chưa đổi được múi giờ vì giờ đang nhập chưa hợp lệ."));
          }
          setZone(next);
        }}
      >
        {timezoneChoices(zone).map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Mở"
        type="datetime-local"
        value={openAt}
        onChange={(event) => setOpenAt(event.target.value)}
      />
      <TextField
        label="Đóng"
        type="datetime-local"
        value={closeAt}
        onChange={(event) => setCloseAt(event.target.value)}
      />
      <TextField
        label="Giới hạn lượt"
        value={limit}
        onChange={(event) => setLimit(event.target.value)}
      />
      <SelectField
        label="Khi mở giải thích"
        value={policy}
        onChange={(event) => setPolicy(event.target.value as ExplanationPolicy)}
      >
        {EXPLANATION_POLICIES.map((item) => (
          <option key={item} value={item}>
            {policyLabel(item)}
          </option>
        ))}
      </SelectField>
      <label className={styles.row}>
        <input
          type="checkbox"
          checked={board}
          onChange={(event) => setBoard(event.target.checked)}
        />
        Bật bảng xếp hạng bí danh
      </label>
      {sections.map((section, index) => (
        <fieldset key={index} className={styles.card}>
          <legend>Phần {index + 1}</legend>
          <TextField
            label="Tên phần"
            value={section.title}
            onChange={(event) =>
              setSections((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, title: event.target.value } : item,
                ),
              )
            }
          />
          <div className={styles.stack}>
            {section.questions.map((slot, slotIndex) => {
              const bankQuestion = questions.find(
                (question) => question.id === slot.bankQuestionId,
              );
              return (
                <div key={slot.bankQuestionId} className={styles.row}>
                  <span>
                    {bankQuestion?.prompt.slice(0, 80) ?? `Câu ${slot.bankQuestionId.slice(0, 8)}`}
                  </span>
                  <TextField
                    label={`Điểm câu ${slotIndex + 1}`}
                    value={String(slot.points)}
                    onChange={(event) => {
                      const points = Number(event.target.value);
                      setSections((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                questions: item.questions.map((question, questionIndex) =>
                                  questionIndex === slotIndex ? { ...question, points } : question,
                                ),
                              }
                            : item,
                        ),
                      );
                    }}
                  />
                  <Button
                    variant="secondary"
                    disabled={slotIndex === 0}
                    onClick={() =>
                      setSections((current) =>
                        current.map((item, itemIndex) => {
                          if (itemIndex !== index) return item;
                          const next = [...item.questions];
                          const previous = next[slotIndex - 1];
                          const currentSlot = next[slotIndex];
                          if (!previous || !currentSlot) return item;
                          next[slotIndex - 1] = currentSlot;
                          next[slotIndex] = previous;
                          return { ...item, questions: next };
                        }),
                      )
                    }
                  >
                    Lên
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={slotIndex === section.questions.length - 1}
                    onClick={() =>
                      setSections((current) =>
                        current.map((item, itemIndex) => {
                          if (itemIndex !== index) return item;
                          const next = [...item.questions];
                          const following = next[slotIndex + 1];
                          const currentSlot = next[slotIndex];
                          if (!following || !currentSlot) return item;
                          next[slotIndex + 1] = currentSlot;
                          next[slotIndex] = following;
                          return { ...item, questions: next };
                        }),
                      )
                    }
                  >
                    Xuống
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setSections((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                questions: item.questions.filter(
                                  (question) => question.bankQuestionId !== slot.bankQuestionId,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    Bỏ khỏi phần
                  </Button>
                </div>
              );
            })}
            {questions
              .filter(
                (question) =>
                  !question.archived &&
                  !section.questions.some((slot) => slot.bankQuestionId === question.id),
              )
              .map((question) => (
                <Button
                  key={question.id}
                  variant="secondary"
                  onClick={() =>
                    setSections((current) =>
                      current.map((item, itemIndex) => {
                        if (itemIndex !== index) return item;
                        if (item.questions.some((slot) => slot.bankQuestionId === question.id))
                          return item;
                        return {
                          ...item,
                          questions: [
                            ...item.questions,
                            { bankQuestionId: question.id, points: question.points },
                          ],
                        };
                      }),
                    )
                  }
                >
                  Thêm: {question.prompt.slice(0, 80)} · {question.points} điểm ngân hàng
                </Button>
              ))}
          </div>
          {bank.hasNextPage ? (
            <Button variant="secondary" onClick={() => void bank.fetchNextPage()}>
              Tải thêm câu trong ngân hàng
            </Button>
          ) : (
            <p className={styles.muted}>Ngân hàng không có tổng số câu.</p>
          )}
        </fieldset>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          setSections((current) => [
            ...current,
            { title: `Phần ${current.length + 1}`, questions: [] },
          ])
        }
      >
        Thêm phần
      </Button>
      <div className={styles.row}>
        <Button disabled={pending} onClick={() => void save(false)}>
          {pending ? "Đang lưu…" : "Lưu nháp"}
        </Button>
        <Button disabled={pending} onClick={() => setConfirm("publish")}>
          Lưu và phát hành
        </Button>
        {!isNew && seed && !seed.archived ? (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => void mutate(seed.published ? "unpublish" : "publish")}
          >
            {seed.published ? "Gỡ phát hành" : "Phát hành"}
          </Button>
        ) : null}
        {!isNew && seed && !seed.archived ? (
          <Button variant="danger" disabled={pending} onClick={() => setConfirm("archive")}>
            Lưu trữ
          </Button>
        ) : null}
        {seed ? (
          <Link className={styles.chip} to={`/exams/${seed.id}`}>
            Xem như thí sinh
          </Link>
        ) : null}
      </div>
      {seed?.publishedVersionId ? (
        <Link
          className={styles.chip}
          to={`/admin/exams/${seed.id}/versions/${seed.publishedVersionId}/statistics`}
        >
          Thống kê phiên bản đang phát hành
        </Link>
      ) : null}
      {seed ? (
        <Link className={styles.chip} to={`/admin/exams/${seed.id}/monitor`}>
          Giám sát đề này
        </Link>
      ) : null}
      {confirm ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exam-confirm-title"
          className={styles.card}
        >
          <h2 id="exam-confirm-title">
            {confirm === "archive" ? "Lưu trữ đề" : "Phát hành phiên bản"}
          </h2>
          <p>
            {confirm === "archive"
              ? "Lưu trữ chỉ ngăn mở lượt mới. Các lượt đã làm không bị xóa."
              : "Phát hành tạo một phiên bản không sửa được. Thí sinh mới sẽ nhận phiên bản này. Lưu nháp và phát hành là hai bước riêng."}
          </p>
          <div className={styles.row}>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                const kind = confirm;
                setConfirm(null);
                if (kind === "archive") void mutate("archive");
                else void save(true);
              }}
            >
              Xác nhận
            </Button>
          </div>
        </div>
      ) : null}
    </CapabilityGate>
  );
}

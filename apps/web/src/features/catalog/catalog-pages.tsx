import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useMemory } from "../../app/memory";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { CATEGORIES, type Category } from "../../shared/api/dto";
import { isApiError } from "../../shared/api/errors";
import {
  categoryLabel,
  formatDateTime,
  formatDuration,
  policyLabel,
  shortId,
  statusLabel,
} from "../../shared/format";
import { uuidV7 } from "../../shared/api/uuid";
import { Alert, Button, Dialog, EmptyState, ErrorPanel, SkeletonLines } from "../../shared/ui/ui";
import styles from "../../shared/styles/layout.module.css";
import { actionsClass } from "../../shared/ui/ui";

function isCategory(value: string | null): value is Category {
  return CATEGORIES.includes(value as Category);
}

export function DashboardPage() {
  useTitle("Bảng làm việc");
  const { api, mode } = useRuntime();
  const history = useInfiniteQuery({
    queryKey: ["history", "dashboard"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.getHistory({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const items = history.data?.pages.flatMap((page) => page.items) ?? [];
  const current = items.find((item) => item.status === "IN_PROGRESS" || item.status === "CREATED");
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Bảng làm việc</h1>
      {mode === "live" ? (
        <Alert tone="warning" title="Catalog chưa thuộc API Identity đã bàn giao">
          Danh mục đề chưa có trên API đã bàn giao. Trang vẫn hỏi máy chủ và không thay lỗi bằng dữ
          liệu mẫu.
        </Alert>
      ) : null}
      {history.isLoading ? <SkeletonLines /> : null}
      {history.error ? (
        <ErrorPanel error={history.error} onRetry={() => void history.refetch()} />
      ) : null}
      {history.isSuccess && !current ? (
        <EmptyState
          title="Chưa có bài đang làm"
          action={
            <Link className={styles.chip} to="/exams">
              Xem đề thi
            </Link>
          }
        >
          Khi bạn bắt đầu một lượt, lối tiếp tục sẽ hiện ở đây.
        </EmptyState>
      ) : null}
      {current ? (
        <section className={styles.card}>
          <h2>Tiếp tục</h2>
          <p>
            {statusLabel(current.status)} · phiên bản {shortId(current.publishedVersionId)}
          </p>
          <p className={styles.muted}>
            Tiêu đề chỉ hiện khi đã mở đúng phiên bản đề. Attempt không trả tiêu đề.
          </p>
          <Link className={styles.chip} to={`/attempts/${current.attemptId}`}>
            Vào phòng thi
          </Link>
        </section>
      ) : null}
      <Link className={styles.chip} to="/history">
        Xem lịch sử
      </Link>
    </div>
  );
}

export function BrowsePage() {
  useTitle("Đề thi");
  const { api, mode } = useRuntime();
  const [params, setParams] = useSearchParams();
  const requested = params.get("category");
  const category = isCategory(requested) ? requested : undefined;
  const invalid = requested !== null && !category;
  const [pageSize, setPageSize] = useState(20);
  const queryClient = useQueryClient();
  const exams = useInfiniteQuery({
    queryKey: ["exams", category ?? "*", pageSize],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.browseExams({ pageSize, cursor: pageParam, category }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const items = exams.data?.pages.flatMap((page) => page.items) ?? [];
  const expired = isApiError(exams.error) && exams.error.status === 400;
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Đề thi</h1>
      {mode === "live" ? (
        <Alert tone="warning" title="Capability catalog">
          Danh sách gọi GET /v1/exams. Backend local hiện chưa triển khai capability này.
        </Alert>
      ) : null}
      {invalid ? (
        <Alert tone="warning" title="Bộ lọc không hợp lệ">
          Đang xem mọi danh mục. Bộ lọc lạ không được gửi lên API.
        </Alert>
      ) : null}
      <div className={styles.chips}>
        <button
          type="button"
          className={category ? styles.chip : `${styles.chip} ${styles.chipCurrent}`}
          onClick={() => setParams({})}
        >
          Tất cả
        </button>
        {CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={item === category ? `${styles.chip} ${styles.chipCurrent}` : styles.chip}
            onClick={() => setParams({ category: item })}
          >
            {categoryLabel(item)}
          </button>
        ))}
      </div>
      <label>
        Số dòng mỗi trang{" "}
        <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
          <option value={20}>20</option>
          <option value={100}>100</option>
        </select>
      </label>
      {exams.isLoading ? <SkeletonLines /> : null}
      {expired ? (
        <Alert title="Con trỏ không còn dùng được">
          <Button
            onClick={() =>
              void queryClient.resetQueries({ queryKey: ["exams", category ?? "*", pageSize] })
            }
          >
            Tải lại từ đầu
          </Button>
        </Alert>
      ) : null}
      {exams.error && !expired ? (
        <ErrorPanel error={exams.error} onRetry={() => void exams.refetch()} />
      ) : null}
      {exams.isSuccess && items.length === 0 ? (
        <EmptyState title="Không có đề trong bộ lọc này">
          Hãy chọn danh mục khác hoặc bỏ lọc.
        </EmptyState>
      ) : null}
      <div className={styles.stack}>
        {items.map((exam) => (
          <Link
            key={exam.id}
            className={`${styles.card} ${styles.cardLink}`}
            to={`/exams/${exam.id}`}
          >
            <h2>{exam.title}</h2>
            <p>
              {categoryLabel(exam.category)} · {formatDuration(exam.durationSeconds)} ·{" "}
              {exam.questionCount} câu · phiên bản {exam.version}
            </p>
            <p className={styles.muted}>
              Mở {formatDateTime(exam.openAt, exam.displayTimezone)} · đóng{" "}
              {formatDateTime(exam.closeAt, exam.displayTimezone)}
            </p>
          </Link>
        ))}
      </div>
      {exams.hasNextPage ? (
        <Button disabled={exams.isFetchingNextPage} onClick={() => void exams.fetchNextPage()}>
          {exams.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
        </Button>
      ) : exams.isSuccess ? (
        <p className={styles.muted}>Đã hết danh sách. Không có tổng số trang.</p>
      ) : null}
    </div>
  );
}

export function ExamDetailPage() {
  useTitle("Chi tiết đề");
  const { examId = "" } = useParams();
  const { api } = useRuntime();
  const memory = useMemory();
  const navigate = useNavigate();
  const exam = useQuery({
    queryKey: ["exam", examId],
    queryFn: async () => {
      const response = await api.getExam(examId);
      memory.remember(response.data);
      return response.data;
    },
  });
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const keyRef = useRef<string | null>(null);
  async function start() {
    const key = keyRef.current ?? uuidV7();
    keyRef.current = key;
    setPending(true);
    setError(null);
    try {
      const response = await api.startAttempt(examId, key);
      keyRef.current = null;
      navigate(`/attempts/${response.data.id}`);
    } catch (caught) {
      if (!(isApiError(caught) && caught.kind === "network")) keyRef.current = null;
      setError(caught);
    } finally {
      setPending(false);
    }
  }
  if (exam.isLoading) return <SkeletonLines />;
  if (exam.error || !exam.data)
    return <ErrorPanel error={exam.error} onRetry={() => void exam.refetch()} />;
  const detail = exam.data;
  return (
    <div className={styles.wrap}>
      <article className={`${styles.card} ${styles.reading}`}>
        <p className={styles.muted}>{categoryLabel(detail.category)}</p>
        <h1 className={styles.title}>{detail.title}</h1>
        <p>
          {formatDuration(detail.durationSeconds)} · {detail.questionCount} câu · phiên bản{" "}
          {detail.version}
        </p>
        <p>
          Mở cửa {formatDateTime(detail.openAt, detail.displayTimezone)} · đóng{" "}
          {formatDateTime(detail.closeAt, detail.displayTimezone)} ({detail.displayTimezone})
        </p>
        <p>Giới hạn {detail.attemptLimit} lượt. Số lượt đã dùng không nằm trong chi tiết đề.</p>
        <p>{policyLabel(detail.explanationPolicy)}</p>
        <p>
          {detail.leaderboardEnabled
            ? "Có bảng xếp hạng theo phiên bản, chỉ bí danh."
            : "Phiên bản này không bật bảng xếp hạng."}
        </p>
        <p className={styles.muted}>
          Giờ trên máy này không được dùng để nới thời gian. Máy chủ quyết định hạn nộp khi bắt đầu.
        </p>
        <h2>Các phần</h2>
        <ul className={styles.stack}>
          {detail.sections.map((section) => (
            <li key={section.id}>
              {section.title} · {section.questionCount} câu · {section.possible} điểm
            </li>
          ))}
        </ul>
        <div className={actionsClass}>
          <Button onClick={() => setOpen(true)}>Bắt đầu</Button>
        </div>
      </article>
      {open ? (
        <Dialog title="Xác nhận bắt đầu" onClose={() => (pending ? undefined : setOpen(false))}>
          <p>
            Một lượt mới, hoặc lượt đang làm của đúng đề này, sẽ được mở. Bấm lại vẫn dùng cùng khóa
            cho đến khi có kết quả.
          </p>
          <p>
            Đề đóng lúc {formatDateTime(detail.closeAt, detail.displayTimezone)}. Nếu vào muộn, hạn
            nộp có thể sớm hơn thời lượng đầy đủ.
          </p>
          {error ? <ErrorPanel error={error} /> : null}
          <div className={actionsClass}>
            <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              Chưa bắt đầu
            </Button>
            <Button disabled={pending} onClick={() => void start()}>
              {pending ? "Đang bắt đầu…" : "Bắt đầu"}
            </Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

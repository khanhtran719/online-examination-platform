import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import type { ImportReport, ImportRequest } from "../../shared/api/dto";
import { isApiError } from "../../shared/api/errors";
import { uuidV7 } from "../../shared/api/uuid";
import { useProtectedAccess } from "../../shared/protected-access";
import { IMPORT_TEMPLATE, inspectImportText } from "../../shared/validation";
import { Alert, Button, ErrorPanel, SkeletonLines, TextArea } from "../../shared/ui/ui";
import styles from "../../shared/styles/layout.module.css";
import { CapabilityGate, useCapability } from "./gate";
import { idleIntent, settleIntent, startIntent, type IntentMachine } from "./mutation-intent";

function unknownTransport(error: unknown): boolean {
  return isApiError(error) && (error.kind === "network" || error.kind === "timeout");
}

function blockCopy(blocked: "duplicate" | "changed"): string {
  if (blocked === "duplicate") return "Đang gửi lần này.";
  return "Nội dung đã đổi so với lần gửi chưa xác nhận. Khôi phục đúng nội dung đó rồi thử lại. Không tạo khóa mới.";
}

export function ImportPage() {
  useTitle("Nhập câu hỏi");
  const { api } = useRuntime();
  const navigate = useNavigate();
  const [text, setText] = useState(IMPORT_TEMPLATE);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dry, setDry] = useState<IntentMachine<ImportRequest>>(idleIntent);
  const [commitMachine, setCommitMachine] = useState<IntentMachine<ImportRequest>>(idleIntent);
  const inspected = inspectImportText(text);
  const busy = dry.phase === "inflight" || commitMachine.phase === "inflight";
  function edit(next: string) {
    setText(next);
    if (dry.phase === "idle" && commitMachine.phase === "idle") {
      setReport(null);
      setSnapshot(null);
    }
  }
  async function dryRun(retryFrozen: boolean) {
    const body =
      retryFrozen && dry.frozen
        ? dry.frozen.body
        : inspected.request
          ? { ...inspected.request, dryRun: true }
          : null;
    if (!body || (!retryFrozen && inspected.structural)) {
      setError(inspected.structural ?? "JSON chưa hợp lệ.");
      return;
    }
    const started = startIntent(dry, {
      action: "import-dry",
      body,
      expectedRevision: 0,
      keyFactory: uuidV7,
    });
    if (started.blocked || !started.send) {
      setError(started.blocked ? blockCopy(started.blocked) : "Chưa chạy thử được.");
      return;
    }
    setDry(started.machine);
    setError(null);
    try {
      const response = await api.importQuestions(started.send.key, started.send.body);
      setReport(response.data);
      if (!retryFrozen) setSnapshot(text);
      setDry(settleIntent(started.machine, "acked"));
    } catch (caught) {
      setDry(settleIntent(started.machine, unknownTransport(caught) ? "unknown" : "rejected"));
      setError(isApiError(caught) ? caught.message : "Chưa chạy thử được.");
    }
  }
  async function commit(retryFrozen: boolean) {
    const body =
      retryFrozen && commitMachine.frozen
        ? commitMachine.frozen.body
        : inspected.request && text === snapshot && report?.valid
          ? { ...inspected.request, dryRun: false }
          : null;
    if (!body) return;
    const started = startIntent(commitMachine, {
      action: "import-commit",
      body,
      expectedRevision: 0,
      keyFactory: uuidV7,
    });
    if (started.blocked || !started.send) {
      setError(started.blocked ? blockCopy(started.blocked) : "Chưa ghi được.");
      return;
    }
    setCommitMachine(started.machine);
    setError(null);
    try {
      const response = await api.importQuestions(started.send.key, started.send.body);
      setReport(response.data);
      setCommitMachine(settleIntent(started.machine, "acked"));
      navigate(`/admin/imports/${response.data.id}`, { replace: true });
    } catch (caught) {
      setCommitMachine(
        settleIntent(started.machine, unknownTransport(caught) ? "unknown" : "rejected"),
      );
      setError(isApiError(caught) ? caught.message : "Chưa ghi được.");
    }
  }
  return (
    <CapabilityGate permission="catalog.import">
      <h1 className={styles.title}>Nhập JSON</h1>
      <p>
        Tệp tối đa 1 MiB, đúng mẫu JSON phiên bản 1, từ 1 đến 100 câu. Kiểm tra dữ liệu không ghi
        ngân hàng. Nếu chưa rõ máy chủ đã ghi chưa, thử lại gửi đúng nội dung cũ.
      </p>
      <p className={styles.muted}>{inspected.bytes} byte UTF-8.</p>
      {inspected.structural ? <Alert title="JSON chưa hợp lệ">{inspected.structural}</Alert> : null}
      {inspected.issues.length > 0 ? (
        <ul>
          {inspected.issues.map((issue, index) => (
            <li key={`${issue.clientRef}-${index}`}>
              {issue.clientRef} · {issue.field}: {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <Alert title="Chưa xong">{error}</Alert> : null}
      {report ? (
        <Alert
          tone={report.committed ? "success" : "warning"}
          title={report.committed ? "Đã ghi ngân hàng" : "Chưa ghi ngân hàng"}
        >
          Hợp lệ: {report.valid ? "có" : "không"}. Mã báo cáo {report.id}.
          {report.issues.map((issue) => (
            <p key={`${issue.clientRef}-${issue.field}`}>
              {issue.clientRef}: {issue.message}
            </p>
          ))}
        </Alert>
      ) : null}
      <TextArea label="Nội dung JSON" value={text} onChange={(event) => edit(event.target.value)} />
      <input
        aria-label="Chọn tệp JSON"
        type="file"
        accept="application/json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void file.text().then(edit);
        }}
      />
      <div className={styles.row}>
        <Button disabled={busy} onClick={() => void dryRun(false)}>
          Kiểm tra dữ liệu
        </Button>
        {dry.phase === "unknown" ? (
          <Button disabled={busy} variant="secondary" onClick={() => void dryRun(true)}>
            Thử kiểm tra lại cùng nội dung
          </Button>
        ) : null}
        <Button
          disabled={busy || text !== snapshot || !report?.valid || report.committed}
          onClick={() => void commit(false)}
        >
          Nhập câu hỏi
        </Button>
        {commitMachine.phase === "unknown" ? (
          <Button disabled={busy} variant="secondary" onClick={() => void commit(true)}>
            Thử ghi lại cùng nội dung
          </Button>
        ) : null}
      </div>
    </CapabilityGate>
  );
}

export function ImportReportPage() {
  const { importId = "" } = useParams();
  useTitle("Báo cáo nhập");
  const gate = useCapability("catalog.import");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const report = useQuery({
    queryKey: ["import-report", importId],
    enabled: gate === "allowed" && !blocked,
    queryFn: () => api.getImportReport(importId).then((response) => response.data),
  });
  const hidden = useProtectedAccess(report.error, [["import-report", importId]], blocked, () =>
    setBlocked(true),
  );
  const data = hidden ? null : report.data;
  return (
    <CapabilityGate permission="catalog.import">
      <h1 className={styles.title}>Báo cáo nhập</h1>
      <Link className={styles.chip} to="/admin/imports/new">
        Nhập tệp khác
      </Link>
      {report.isLoading ? <SkeletonLines /> : null}
      {report.error ? (
        <ErrorPanel
          error={report.error}
          onRetry={hidden ? undefined : () => void report.refetch()}
        />
      ) : null}
      {data ? (
        <section className={styles.card}>
          <p>{data.committed ? "Đã ghi vào ngân hàng." : "Chưa ghi vào ngân hàng."}</p>
          <p>Hợp lệ: {data.valid ? "có" : "không"}.</p>
          <p>Tạo lúc {data.createdAt}.</p>
          {data.issues.length === 0 ? <p>Không có lỗi dòng.</p> : null}
          <ul>
            {data.issues.map((issue) => (
              <li key={`${issue.clientRef}-${issue.field}`}>
                {issue.clientRef} · {issue.field}: {issue.message}
              </li>
            ))}
          </ul>
          <ul>
            {data.questions.map((question) => (
              <li key={question.questionId}>
                {question.clientRef} ·{" "}
                <Link to={`/admin/questions/${question.questionId}/edit`}>
                  {question.questionId}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </CapabilityGate>
  );
}

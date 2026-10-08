import { useState } from "react";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { CapabilityGate } from "./gate";
import styles from "./admin.module.css";
import { useNavigate } from "react-router";
import { isApiError } from "../../shared/api/errors";
import { uuidV7 } from "../../shared/api/uuid";
import { IMPORT_TEMPLATE, inspectImportText } from "../../shared/validation";
import { Alert, Button, TextArea, Dialog } from "../../shared/ui/ui";
import { AdminHeading } from "./admin-ui";
import { idleIntent, settleIntent, startIntent, type IntentMachine } from "./mutation-intent";
import type { ImportReport, ImportRequest } from "../../shared/api/dto";

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
  const [confirmImport, setConfirmImport] = useState(false);
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
      <AdminHeading
        title="Nhập JSON"
        eyebrow="NGÂN HÀNG CÂU"
        description="Kiểm tra dữ liệu trước, xác nhận ghi vào ngân hàng sau."
      />
      <div className={styles.notice}>
        <span aria-hidden="true">↥</span>
        <p>
          Tệp tối đa 1 MiB · phiên bản JSON 1 · từ 1 đến 100 câu. Kiểm tra dữ liệu chưa ghi ngân
          hàng.
        </p>
      </div>
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
      <div className={styles.jsonPanel}>
        <TextArea
          label="Nội dung JSON"
          value={text}
          onChange={(event) => edit(event.target.value)}
        />
      </div>
      <label className={styles.fileField}>
        Chọn tệp JSON
        <input
          aria-label="Chọn tệp JSON"
          type="file"
          accept="application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 1_048_576) {
              setError("Tệp vượt quá 1 MiB.");
              return;
            }
            void file
              .text()
              .then((value) => {
                setError(null);
                edit(value);
              })
              .catch(() => setError("Không đọc được tệp JSON."));
          }}
        />
      </label>
      <div className={styles.actionBar}>
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
          onClick={() => setConfirmImport(true)}
        >
          Nhập câu hỏi
        </Button>
        {commitMachine.phase === "unknown" ? (
          <Button disabled={busy} variant="secondary" onClick={() => void commit(true)}>
            Thử ghi lại cùng nội dung
          </Button>
        ) : null}
      </div>
      {confirmImport ? (
        <Dialog title="Xác nhận nhập câu hỏi" onClose={() => setConfirmImport(false)}>
          <p>
            Ghi {inspected.request?.questions.length ?? 0} câu đã kiểm tra vào ngân hàng. Nội dung
            phải khớp với lần kiểm tra thành công.
          </p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setConfirmImport(false)}>
              Hủy
            </Button>
            <Button
              disabled={busy || text !== snapshot || !report?.valid || report.committed}
              onClick={() => {
                setConfirmImport(false);
                void commit(false);
              }}
            >
              Nhập vào ngân hàng
            </Button>
          </div>
        </Dialog>
      ) : null}
    </CapabilityGate>
  );
}

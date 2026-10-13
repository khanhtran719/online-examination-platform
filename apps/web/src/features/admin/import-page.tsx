import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { useTitle } from "@web/app/use-title";
import { Alert, Button, Dialog, ErrorPanel, TextArea } from "@web/shared/ui/ui";
import { IMPORT_TEMPLATE } from "@web/shared/validation";

import styles from "./authoring.module.css";
import { CapabilityGate } from "./gate";
import { ImportValidation } from "./import-validation";
import { useAuthoringNavigation } from "./use-authoring-navigation";
import { useQuestionImport } from "./use-question-import";

export function ImportPage() {
  useTitle("Nhập câu hỏi");
  const navigate = useNavigate();
  const draft = useQuestionImport((id) => navigate(`/admin/imports/${id}`, { replace: true }));
  const [confirm, setConfirm] = useState(false);
  const validated = draft.report && draft.text === draft.snapshot;
  const blocker = useAuthoringNavigation({
    dirty: !draft.unavailable && (draft.text !== IMPORT_TEMPLATE || Boolean(draft.report)),
    pending: !draft.unavailable && draft.pending,
    unknown: draft.unknown,
    allowNavigation: draft.allowNavigation,
  });
  const entries = draft.inspected.request?.questions ?? [];
  return (
    <CapabilityGate permission="catalog.import">
      <div className={styles.page}>
        <p className={styles.breadcrumb}>
          <Link to="/admin/questions">Ngân hàng câu hỏi</Link> / Nhập JSON
        </p>
        <header className={styles.heading}>
          <div>
            <h1>Nhập JSON</h1>
            <p>Kiểm tra dữ liệu trước, xác nhận ghi vào ngân hàng sau.</p>
          </div>
        </header>
        {!draft.unavailable ? (
          <>
            <ol className={styles.steps} aria-label="Các bước nhập">
              <li aria-current={!validated ? "step" : undefined}>Chọn dữ liệu</li>
              <li aria-current={validated ? "step" : undefined}>Kiểm tra</li>
              <li>Xác nhận nhập</li>
            </ol>
            {draft.error && !draft.unknown ? <ErrorPanel error={draft.error} /> : null}
            {draft.fileError ? <Alert title="Chưa đọc được tệp">{draft.fileError}</Alert> : null}
            {draft.unknown ? (
              <Alert tone="warning" title="Chưa xác nhận được kết quả">
                <p>
                  Yêu cầu có thể đã được ghi nhận. Thử lại giữ nguyên nội dung và lần gửi; các thao
                  tác khác đang khóa.
                </p>
                <Button disabled={draft.pending} onClick={() => void draft.retry()}>
                  Thử lại yêu cầu
                </Button>
              </Alert>
            ) : null}
            <div className={styles.grid}>
              <div className={styles.stack}>
                {validated && draft.report ? (
                  <ImportValidation report={draft.report} entries={entries} />
                ) : null}
                <section className={`${styles.panel} ${styles.json}`}>
                  <h2>Dữ liệu câu hỏi</h2>
                  <p className={styles.scope}>
                    Tối đa 1 MiB UTF-8 · phiên bản JSON 1 · từ 1 đến 100 câu. Kiểm tra chưa ghi ngân
                    hàng.
                  </p>
                  <label className={styles.file}>
                    Chọn tệp JSON
                    <input
                      aria-label="Chọn tệp JSON"
                      type="file"
                      accept=".json,application/json"
                      disabled={draft.locked}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void draft.readFile(file);
                        event.target.value = "";
                      }}
                    />
                    {draft.reading ? <span role="status">Đang đọc tệp…</span> : null}
                  </label>
                  <a
                    href={`data:application/json;charset=utf-8,${encodeURIComponent(IMPORT_TEMPLATE)}`}
                    download="questions-template.json"
                  >
                    Tải mẫu JSON
                  </a>
                  <TextArea
                    label="Nội dung JSON"
                    value={draft.text}
                    disabled={draft.locked}
                    onChange={(event) => draft.edit(event.target.value)}
                  />
                  <p className={styles.counter}>{draft.inspected.bytes} byte UTF-8</p>
                  {draft.inspected.structural ? (
                    <Alert title="JSON chưa hợp lệ">{draft.inspected.structural}</Alert>
                  ) : null}
                  {draft.inspected.issues.length ? (
                    <Alert title="Dữ liệu cần sửa">
                      <ul>
                        {draft.inspected.issues.map((issue, index) => (
                          <li key={index}>
                            {issue.clientRef} · {issue.field}: {issue.message}
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  ) : null}
                </section>
              </div>
              <aside className={styles.panel}>
                <h2>Trước khi nhập</h2>
                <p>
                  Chỉ nhập nội dung đã kiểm tra thành công. Sửa nội dung hoặc chọn tệp khác sẽ yêu
                  cầu kiểm tra lại.
                </p>
                <p>Toàn bộ câu được ghi cùng một lần; không báo thành công từng phần.</p>
                <p className={styles.scope}>
                  Báo cáo sau khi nhập cung cấp mã đối chiếu cho từng câu. Đáp án và giải thích
                  không xuất hiện trong bảng xem trước.
                </p>
              </aside>
            </div>
            <div className={styles.actionBar}>
              <p className={styles.scope}>
                {draft.pending
                  ? "Đang chờ máy chủ xác nhận…"
                  : validated
                    ? "Đã có báo cáo kiểm tra cho nội dung hiện tại"
                    : "Chưa kiểm tra nội dung hiện tại"}
              </p>
              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  disabled={
                    draft.locked ||
                    draft.reading ||
                    Boolean(draft.inspected.structural) ||
                    draft.inspected.issues.length > 0
                  }
                  onClick={() => void draft.dryRun()}
                >
                  Kiểm tra dữ liệu
                </Button>
                <Button disabled={!draft.canCommit} onClick={() => setConfirm(true)}>
                  Nhập câu hỏi
                </Button>
              </div>
            </div>
            {confirm ? (
              <Dialog
                title="Xác nhận nhập câu hỏi"
                onClose={draft.pending ? undefined : () => setConfirm(false)}
              >
                <p>
                  Ghi {entries.length} câu đã kiểm tra vào ngân hàng. Nội dung phải khớp với lần
                  kiểm tra thành công.
                </p>
                {draft.pending ? <p role="status">Đang chờ máy chủ xác nhận…</p> : null}
                {draft.error && !draft.unknown ? <ErrorPanel error={draft.error} /> : null}
                {draft.unknown ? (
                  <p>Chưa biết kết quả lần gửi. Thử lại giữ nguyên yêu cầu.</p>
                ) : null}
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    disabled={draft.pending}
                    onClick={() => setConfirm(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    disabled={draft.pending || (!draft.canCommit && !draft.unknown)}
                    onClick={() => {
                      if (draft.unknown) void draft.retry();
                      else void draft.commit();
                    }}
                  >
                    {draft.unknown ? "Thử lại yêu cầu" : "Nhập vào ngân hàng"}
                  </Button>
                </div>
              </Dialog>
            ) : null}
            {blocker.state === "blocked" ? (
              <Dialog title="Rời dữ liệu đang nhập?" onClose={() => blocker.reset()}>
                <p>
                  Nội dung và thông tin thử lại chỉ nằm trong phiên làm việc này. Yêu cầu chưa xác
                  nhận vẫn có thể đã được máy chủ ghi nhận.
                </p>
                <div className={styles.actions}>
                  <Button variant="secondary" onClick={() => blocker.reset()}>
                    Ở lại
                  </Button>
                  <Button
                    variant="danger"
                    disabled={draft.pending}
                    onClick={() => blocker.proceed()}
                  >
                    Rời trang
                  </Button>
                </div>
              </Dialog>
            ) : null}
          </>
        ) : (
          <ErrorPanel error={draft.error} />
        )}
      </div>
    </CapabilityGate>
  );
}

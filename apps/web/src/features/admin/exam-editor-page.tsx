import { useState } from "react";
import { Link, useMatch, useParams } from "react-router";
import { categoryLabel, policyLabel } from "../../shared/format";
import { Button, Dialog, ErrorPanel, SkeletonLines } from "../../shared/ui/ui";
import { CapabilityGate } from "./gate";
import { AdminBadge, AdminHeading } from "./admin-ui";
import { ExamInformation } from "./exam-information";
import { ExamStructure } from "./exam-structure";
import { useExamDraft } from "./use-exam-draft";
import styles from "./admin.module.css";

export function AdminExamEditorPage() {
  const isNew = Boolean(useMatch("/admin/exams/new"));
  const { examId = "" } = useParams();
  return <ExamEditor key={isNew ? "new" : examId} isNew={isNew} examId={examId} />;
}
function ExamEditor({ isNew, examId }: { isNew: boolean; examId: string }) {
  const draft = useExamDraft(isNew, examId);
  const [step, setStep] = useState(0);
  const [confirm, setConfirm] = useState<"publish" | "publish-saved" | "archive" | null>(null);
  const { seed } = draft;
  const slots = draft.sections.flatMap((section) => section.questions);
  const points = slots.reduce((sum, slot) => sum + slot.points, 0);
  const ready = !draft.hidden && !draft.hideBank && (isNew || Boolean(seed));
  return (
    <CapabilityGate permission="catalog.manage">
      <AdminHeading
        title={isNew ? "Tạo bản nháp" : (seed?.title ?? "Sửa đề")}
        eyebrow="SOẠN ĐỀ THI"
        description="Lưu bản nháp trước. Phát hành tạo một phiên bản cố định cho lượt thi mới."
      >
        {seed ? (
          <AdminBadge tone={seed.archived ? "neutral" : seed.published ? "success" : "warning"}>
            {seed.archived ? "Đã lưu trữ" : seed.published ? "✓ Đang phát hành" : "Bản nháp"}
          </AdminBadge>
        ) : null}
        <Link to="/admin/exams">← Danh sách đề</Link>
      </AdminHeading>
      {!isNew && draft.existing.isLoading ? <SkeletonLines /> : null}
      {draft.existing.error ? (
        <ErrorPanel
          error={draft.existing.error}
          onRetry={draft.hidden ? undefined : () => void draft.existing.refetch()}
        />
      ) : null}
      {draft.hideBank ? <ErrorPanel error={draft.bank.error} /> : null}
      {draft.error ? <ErrorPanel error={draft.error} /> : null}
      {ready ? (
        <>
          <nav className={styles.steps} aria-label="Các bước soạn đề">
            {["Thông tin", "Các phần & câu hỏi", "Kiểm tra & phát hành"].map((label, index) => (
              <Button
                key={label}
                variant="ghost"
                aria-current={step === index ? "step" : undefined}
                onClick={() => setStep(index)}
              >
                {label}
              </Button>
            ))}
          </nav>
          <div className={styles.editorGrid}>
            <div>
              <div hidden={step !== 0}>
                <ExamInformation draft={draft} />
              </div>
              <div hidden={step !== 1}>
                <ExamStructure draft={draft} />
              </div>
              <section hidden={step !== 2} className={styles.panel}>
                <h2>Kiểm tra bản nháp</h2>
                <dl className={styles.facts}>
                  <div>
                    <dt>Tiêu đề</dt>
                    <dd>{draft.title || "Chưa nhập"}</dd>
                  </div>
                  <div>
                    <dt>Danh mục</dt>
                    <dd>{categoryLabel(draft.category)}</dd>
                  </div>
                  <div>
                    <dt>Thời lượng</dt>
                    <dd>{draft.duration} giây</dd>
                  </div>
                  <div>
                    <dt>Giải thích</dt>
                    <dd>{policyLabel(draft.policy)}</dd>
                  </div>
                  <div>
                    <dt>Bảng xếp hạng bí danh</dt>
                    <dd>{draft.board ? "Bật" : "Tắt"}</dd>
                  </div>
                </dl>
                <ul className={styles.checklist}>
                  <li>Mỗi phần có ít nhất một câu, tối đa 500 câu không trùng trong đề.</li>
                  <li>Kiểm tra giờ mở/đóng theo múi giờ {draft.zone}.</li>
                  <li>Phát hành chỉ hoàn tất sau xác nhận của máy chủ.</li>
                </ul>
                <p className={styles.caption}>
                  Sửa ngân hàng hoặc bản nháp không sửa nội dung các lượt thi đã bắt đầu.
                </p>
              </section>
            </div>
            <aside className={`${styles.panel} ${styles.summary}`} aria-label="Tóm tắt bản nháp">
              <p className={styles.eyebrow}>TÓM TẮT BẢN NHÁP</p>
              <h2>Kiểm tra trước khi phát hành.</h2>
              <dl className={styles.facts}>
                <div>
                  <dt>Các phần</dt>
                  <dd>{draft.sections.length}</dd>
                </div>
                <div>
                  <dt>Câu hỏi</dt>
                  <dd>{slots.length}</dd>
                </div>
                <div>
                  <dt>Điểm tối đa</dt>
                  <dd>{Number.isFinite(points) ? points : "Chưa hợp lệ"}</dd>
                </div>
                <div>
                  <dt>Revision hiện tại</dt>
                  <dd>{draft.revision}</dd>
                </div>
              </dl>
              <p className={styles.caption}>
                Số liệu của bản nháp đang sửa, không phải số bài hoặc kết quả thi.
              </p>
              <div className={styles.notice}>
                <span aria-hidden="true">✓</span>
                <p>
                  <strong>Lưu và phát hành tách biệt.</strong>
                  <br />
                  Máy chủ kiểm tra nội dung khi phát hành.
                </p>
              </div>
            </aside>
          </div>
          <div className={styles.actionBar}>
            <p className={styles.caption}>
              Bản nháp đang sửa được giữ khi chuyển bước hoặc cần đối chiếu.
            </p>
            <div className={styles.actions}>
              <Button disabled={draft.pending} onClick={() => void draft.save(false)}>
                {draft.pending ? "Đang lưu…" : "Lưu nháp"}
              </Button>
              <Button
                variant="secondary"
                disabled={draft.pending}
                onClick={() => setConfirm("publish")}
              >
                Lưu và phát hành
              </Button>
              {!isNew && seed && !seed.archived ? (
                <>
                  <Button
                    variant="secondary"
                    disabled={draft.pending}
                    onClick={() =>
                      seed.published ? void draft.mutate("unpublish") : setConfirm("publish-saved")
                    }
                  >
                    {seed.published ? "Gỡ phát hành" : "Phát hành"}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={draft.pending}
                    onClick={() => setConfirm("archive")}
                  >
                    Lưu trữ
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          {seed ? (
            <div className={styles.actions}>
              <Link to={`/exams/${seed.id}`}>Xem như thí sinh</Link>
              <Link to={`/admin/exams/${seed.id}/monitor`}>Giám sát đề này</Link>
              {seed.publishedVersionId ? (
                <Link to={`/admin/exams/${seed.id}/versions/${seed.publishedVersionId}/statistics`}>
                  Thống kê phiên bản đang phát hành
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
      {confirm && ready ? (
        <Dialog
          title={confirm === "archive" ? "Lưu trữ đề" : "Phát hành phiên bản"}
          onClose={() => setConfirm(null)}
        >
          <p>
            {confirm === "archive"
              ? "Lưu trữ chỉ ngăn mở lượt mới. Các lượt đã làm không bị xóa."
              : confirm === "publish-saved"
                ? "Phát hành bản nháp đã lưu trên máy chủ. Các chỉnh sửa chưa lưu trong màn hình này sẽ không được phát hành."
                : "Bản nháp được lưu trước khi phát hành thành phiên bản cố định. Thí sinh mới sẽ nhận phiên bản này."}
          </p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Hủy
            </Button>
            <Button
              disabled={draft.pending}
              onClick={() => {
                const kind = confirm;
                setConfirm(null);
                if (kind === "archive") void draft.mutate("archive");
                else if (kind === "publish-saved") void draft.mutate("publish");
                else void draft.save(true);
              }}
            >
              Xác nhận
            </Button>
          </div>
        </Dialog>
      ) : null}
    </CapabilityGate>
  );
}

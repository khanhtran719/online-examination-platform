import { Link, useParams } from "react-router";

import { useTitle } from "@web/app/use-title";
import { formatBasisPoints, formatDateTime, statusLabel } from "@web/shared/format";
import { Alert, Button, Dialog, ErrorPanel, SkeletonLines, TextArea } from "@web/shared/ui/ui";

import admin from "./admin.module.css";
import { AdminReviewCard } from "./admin-review-card";
import { AdminBadge, AdminHeading, adminId, PageEnd } from "./admin-ui";
import { CapabilityGate } from "./gate";
import styles from "./operations.module.css";
import { useAdminAttempt } from "./use-admin-attempt";

export function AdminAttemptPage() {
  const { attemptId = "" } = useParams();
  return <AdminAttempt key={attemptId} attemptId={attemptId} />;
}
function AdminAttempt({ attemptId }: { attemptId: string }) {
  useTitle("Chi tiết lượt thi");
  const c = useAdminAttempt(attemptId),
    { result, data, hidden, review, replay } = c;
  const attempt = data?.attempt,
    score = data?.result;
  return (
    <CapabilityGate permission="reporting.read">
      <div className={styles.page}>
        <AdminHeading
          title="Chi tiết lượt thi"
          eyebrow="QUẢN TRỊ / LƯỢT THI"
          description={`Lượt ${adminId(attemptId)} · Theo phiên bản đã khóa`}
        >
          {attempt ? (
            <Link to={`/admin/exams/${attempt.examId}/submissions`}>← Về bài nộp</Link>
          ) : null}
          <Button
            variant="secondary"
            disabled={hidden || result.isFetching}
            onClick={() => void result.refetch()}
          >
            Tải lại
          </Button>
        </AdminHeading>
        {result.isLoading ? <SkeletonLines /> : null}
        {result.error ? (
          <ErrorPanel
            error={result.error}
            onRetry={hidden ? undefined : () => void result.refetch()}
          />
        ) : null}
        {data ? (
          <div className={styles.asymmetric}>
            <div className={styles.stack}>
              <section className={admin.panel}>
                <h2>Thông tin lượt thi</h2>
                <p>
                  Phiên bản đã khóa ·{" "}
                  <span className={styles.code}>
                    {adminId((attempt?.publishedVersionId ?? score?.publishedVersionId) || "")}
                  </span>
                </p>
                {attempt ? (
                  <>
                    <AdminBadge tone={attempt.status === "FAILED" ? "warning" : "neutral"}>
                      {statusLabel(attempt.status)}
                      {attempt.replayPending ? " · Đã yêu cầu xử lý lại" : ""}
                    </AdminBadge>
                    <dl className={styles.facts}>
                      {[
                        ["Mã lượt thi", adminId(attemptId)],
                        ["Mã đề", adminId(attempt.examId)],
                        [
                          "Bắt đầu",
                          attempt.startedAt
                            ? formatDateTime(attempt.startedAt)
                            : "Chưa được cung cấp",
                        ],
                        [
                          "Hạn nộp",
                          attempt.deadline
                            ? formatDateTime(attempt.deadline)
                            : "Chưa được cung cấp",
                        ],
                        [
                          "Đã nộp",
                          attempt.submittedAt
                            ? formatDateTime(attempt.submittedAt)
                            : "Chưa có giờ nộp",
                        ],
                        ["Hết hạn", attempt.expired ? "Có" : "Không"],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p>Giờ Việt Nam · UTC+7</p>
                  </>
                ) : null}
              </section>
              <section className={admin.panel}>
                <h2>Kết quả</h2>
                {score ? (
                  <>
                    <h3>
                      {score.earned}/{score.possible} điểm
                    </h3>
                    <p>{formatBasisPoints(score.percentageBasisPoints)}</p>
                  </>
                ) : (
                  <Alert tone="warning" title="Chưa có điểm">
                    Lượt thi chưa có kết quả chấm hoàn tất. Tải lại để đọc trạng thái mới.
                  </Alert>
                )}
                {data.pending ? (
                  <p>Bài làm và đáp án chưa khả dụng khi chưa có kết quả.</p>
                ) : c.reviewGate !== "allowed" ? (
                  <p>Thiếu quyền xem bài làm nên không tải chi tiết đáp án.</p>
                ) : null}
              </section>
            </div>
            {replay.allowed && (attempt?.status === "FAILED" || replay.phase !== "idle") ? (
              <section className={admin.panel}>
                <h2>Xử lý lại lượt thất bại</h2>
                <p>Gửi lại bài nộp gốc để hệ thống xử lý.</p>
                <p>Giữ nguyên câu trả lời và mã lượt thi.</p>
                {replay.message ? (
                  <Alert tone="success" title="Đã gửi">
                    {replay.message}
                  </Alert>
                ) : null}
                {replay.error ? <ErrorPanel error={replay.error} /> : null}
                {replay.phase === "unknown" ? (
                  <Alert tone="warning" title="Chưa nhận được xác nhận">
                    Giữ nguyên nội dung đã gửi. Thử lại cùng yêu cầu để đối chiếu kết quả.
                  </Alert>
                ) : null}
                <TextArea
                  label="Lý do"
                  value={replay.reason}
                  disabled={!replay.editable || !replay.eligible}
                  onChange={(e) => replay.setReason(e.target.value)}
                />
                <p>Từ 8 đến 500 ký tự sau khi bỏ khoảng trắng ở hai đầu.</p>
                <Button disabled={!replay.canOpen} onClick={replay.open}>
                  Yêu cầu xử lý lại
                </Button>
                {replay.phase === "unknown" ? (
                  <Button variant="secondary" onClick={() => void replay.send(true)}>
                    Thử gửi lại cùng nội dung
                  </Button>
                ) : null}
                {!replay.eligible && replay.phase === "idle" ? (
                  <p>Chưa thể yêu cầu xử lý lại ở trạng thái hoặc phiên bản này.</p>
                ) : null}
                <p>Yêu cầu được nhận không có nghĩa là đã chấm xong; không tạo lượt thi mới.</p>
              </section>
            ) : null}
          </div>
        ) : null}
        {review.query.error && !hidden ? (
          <ErrorPanel
            error={review.query.error}
            onRetry={review.hidden ? undefined : () => void review.refresh()}
          />
        ) : null}
        {review.items.map((row) => (
          <AdminReviewCard key={row.question.id} row={row} />
        ))}
        {!review.hidden && review.query.data ? (
          <PageEnd
            next={Boolean(review.query.hasNextPage)}
            loading={review.query.isFetching}
            onMore={() => void review.more()}
          />
        ) : null}
        {replay.confirm ? (
          <Dialog title="Yêu cầu xử lý lại" onClose={replay.close}>
            <p>Gửi lại bài nộp gốc để hệ thống xử lý.</p>
            <p>
              Lượt {adminId(attemptId)} · Phiên bản {adminId(attempt?.publishedVersionId ?? "")}
            </p>
            <TextArea
              label="Lý do xác nhận"
              value={replay.reason}
              onChange={(e) => replay.setReason(e.target.value)}
            />
            <p>Từ 8 đến 500 ký tự.</p>
            <div className={styles.scopeBox}>
              <strong>Giữ nguyên bài nộp gốc</strong>
              <p>
                Giữ nguyên câu trả lời và mã lượt thi. Yêu cầu được nhận không có nghĩa là đã chấm
                xong.
              </p>
            </div>
            <div className={admin.actions}>
              <Button variant="secondary" onClick={replay.close}>
                Hủy
              </Button>
              <Button disabled={!replay.canOpen} onClick={() => void replay.send()}>
                Gửi yêu cầu
              </Button>
            </div>
          </Dialog>
        ) : null}
      </div>
    </CapabilityGate>
  );
}

import { adminId as shortId } from "./admin-ui";
import { useState } from "react";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { useProtectedAccess } from "../../shared/protected-access";
import { CapabilityGate, useCapability } from "./gate";
import styles from "./admin.module.css";
import { Link, useParams } from "react-router";
import { formatDateTime, statusLabel } from "../../shared/format";
import {
  Button,
  EmptyState,
  ErrorPanel,
  SkeletonLines,
  TextField,
  TableScroll,
  tableClass,
} from "../../shared/ui/ui";
import { AdminBadge, AdminHeading, PageEnd } from "./admin-ui";
import { useInfiniteQuery } from "@tanstack/react-query";
import { isUuidV7 } from "../../shared/api/uuid";

export function SubmissionsPage() {
  const { examId = "" } = useParams();
  useTitle("Bài đã nộp");
  const gate = useCapability("reporting.read");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const [versionDraft, setVersionDraft] = useState("");
  const [version, setVersion] = useState<string | undefined>();
  const [versionError, setVersionError] = useState<string | null>(null);
  const rows = useInfiniteQuery({
    queryKey: ["submissions", examId, version ?? "*"],
    enabled: gate === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api
        .listSubmissions(examId, {
          pageSize: 20,
          cursor: pageParam,
          ...(version ? { publishedVersionId: version } : {}),
        })
        .then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(
    rows.error,
    [["submissions", examId, version ?? "*"]],
    blocked,
    () => setBlocked(true),
  );
  const items = hidden ? [] : (rows.data?.pages.flatMap((page) => page.items) ?? []);
  return (
    <CapabilityGate permission="reporting.read">
      <AdminHeading title="Bài đã nộp" eyebrow="BÁO CÁO THEO ĐỀ">
        <Link to={`/admin/exams/${examId}/monitor`}>← Giám sát</Link>
      </AdminHeading>
      <form
        className={styles.panel}
        onSubmit={(event) => {
          event.preventDefault();
          const value = versionDraft.trim();
          if (!value) {
            setVersion(undefined);
            setVersionError(null);
            setBlocked(false);
            return;
          }
          if (!isUuidV7(value)) {
            setVersionError("Mã phiên bản không đúng định dạng.");
            return;
          }
          setVersion(value);
          setVersionError(null);
          setBlocked(false);
        }}
      >
        <TextField
          label="Lọc theo phiên bản đã phát hành"
          value={versionDraft}
          onChange={(event) => setVersionDraft(event.target.value)}
        />
        <Button type="submit" variant="secondary">
          Áp dụng bộ lọc
        </Button>
        {versionError ? <p role="alert">{versionError}</p> : null}
        <p className={styles.muted}>
          {version ? `Đang lọc phiên bản ${shortId(version)}.` : "Đang hiện mọi phiên bản đã tải."}
        </p>
      </form>
      {rows.isLoading ? <SkeletonLines /> : null}
      {rows.error ? (
        <ErrorPanel error={rows.error} onRetry={hidden ? undefined : () => void rows.refetch()} />
      ) : null}
      {rows.isSuccess && !hidden && items.length === 0 ? (
        <EmptyState title="Chưa có bài nộp">Danh sách chỉ có các lượt của đề này.</EmptyState>
      ) : null}
      {!hidden && rows.isSuccess && items.length > 0 ? (
        <section className={styles.panel}>
          <TableScroll label="Bài đã nộp theo phiên bản">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th scope="col">Mã thí sinh</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Phiên bản</th>
                  <th scope="col">Nộp lúc</th>
                  <th scope="col">Điểm</th>
                  <th scope="col">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.attemptId}>
                    <td className={styles.code}>{shortId(item.candidateId)}</td>
                    <td>
                      <AdminBadge>{statusLabel(item.status)}</AdminBadge>
                      {item.expired ? <span className={styles.rowSub}>Nộp khi hết giờ</span> : null}
                    </td>
                    <td className={styles.code}>{shortId(item.publishedVersionId)}</td>
                    <td>
                      {item.submittedAt ? formatDateTime(item.submittedAt) : "Chưa có giờ nộp"}
                    </td>
                    <td>
                      {item.earned === null || item.possible === null
                        ? "Chưa có điểm"
                        : `${item.earned}/${item.possible}`}
                    </td>
                    <td>
                      <Link to={`/admin/attempts/${item.attemptId}`}>Xem lượt →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <PageEnd
            next={Boolean(rows.hasNextPage)}
            loading={rows.isFetchingNextPage}
            onMore={() => void rows.fetchNextPage()}
          />
        </section>
      ) : null}
    </CapabilityGate>
  );
}

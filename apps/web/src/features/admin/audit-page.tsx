import { adminId as shortId } from "./admin-ui";
import { useState } from "react";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { useProtectedAccess } from "../../shared/protected-access";
import { CapabilityGate, useCapability } from "./gate";
import styles from "./admin.module.css";
import { formatDateTime } from "../../shared/format";
import {
  Button,
  Dialog,
  EmptyState,
  ErrorPanel,
  SkeletonLines,
  tableClass,
  TableScroll,
} from "../../shared/ui/ui";
import { AdminBadge, AdminHeading, PageEnd } from "./admin-ui";
import { useInfiniteQuery } from "@tanstack/react-query";

export function AuditPage() {
  useTitle("Nhật ký");
  const gate = useCapability("audit.read");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const audit = useInfiniteQuery({
    queryKey: ["audit"],
    enabled: gate === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.getAudit({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(audit.error, [["audit"]], blocked, () => setBlocked(true));
  const rows = hidden ? [] : (audit.data?.pages.flatMap((page) => page.items) ?? []);
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  async function copyCorrelation(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyNote("Đã chép mã đối chiếu.");
    } catch {
      setCopyNote("Không chép tự động được. Hãy chọn mã và chép thủ công.");
    }
  }
  return (
    <CapabilityGate permission="audit.read">
      <AdminHeading
        title="Nhật ký"
        eyebrow="ĐỐI CHIẾU THAO TÁC"
        description="Tra cứu hành động, người thực hiện và mã đối chiếu."
      />
      {audit.isLoading ? <SkeletonLines /> : null}
      {audit.error ? (
        <ErrorPanel error={audit.error} onRetry={hidden ? undefined : () => void audit.refetch()} />
      ) : null}
      {audit.isSuccess && !hidden && rows.length === 0 ? (
        <EmptyState title="Chưa có dòng nhật ký">
          Các thao tác quản trị sẽ thêm dòng mới.
        </EmptyState>
      ) : null}
      {!hidden && audit.data ? (
        <section className={styles.panel}>
          <TableScroll label="Nhật ký quản trị">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th scope="col">Thời điểm</th>
                  <th scope="col">Việc</th>
                  <th scope="col">Kết quả</th>
                  <th scope="col">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.occurredAt)}</td>
                    <td>
                      <span className={styles.rowTitle}>{row.action}</span>
                      <span className={styles.rowSub}>
                        {row.resourceType} · {shortId(row.resourceId)}
                      </span>
                    </td>
                    <td>
                      <AdminBadge tone={row.outcome === "SUCCESS" ? "success" : "warning"}>
                        {row.outcome}
                      </AdminBadge>
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setCopyNote(null);
                          setSelectedId(row.id);
                        }}
                      >
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <PageEnd
            next={Boolean(audit.hasNextPage)}
            loading={audit.isFetchingNextPage}
            onMore={() => void audit.fetchNextPage()}
          />
        </section>
      ) : null}
      {selected ? (
        <Dialog title="Chi tiết nhật ký" onClose={() => setSelectedId(null)}>
          <dl className={styles.facts}>
            <div>
              <dt>Người thực hiện</dt>
              <dd>{selected.actorId ? shortId(selected.actorId) : "Không có mã"}</dd>
            </div>
            <div>
              <dt>Lý do</dt>
              <dd className={styles.plain}>{selected.reason ?? "Không có"}</dd>
            </div>
            <div>
              <dt>Trường đổi</dt>
              <dd>{selected.changedFields.join(", ") || "Không có"}</dd>
            </div>
            <div>
              <dt>Mã đối chiếu</dt>
              <dd className={styles.code}>{selected.correlationId}</dd>
            </div>
          </dl>
          <Button variant="secondary" onClick={() => void copyCorrelation(selected.correlationId)}>
            Chép mã đối chiếu
          </Button>
          {copyNote ? <p role="status">{copyNote}</p> : null}
          <Button variant="secondary" onClick={() => setSelectedId(null)}>
            Đóng
          </Button>
        </Dialog>
      ) : null}
    </CapabilityGate>
  );
}

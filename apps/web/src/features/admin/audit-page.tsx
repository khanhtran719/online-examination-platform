import { useTitle } from "@web/app/use-title";
import {
  Button,
  Dialog,
  EmptyState,
  ErrorPanel,
  SkeletonLines,
  tableClass,
  TableScroll,
} from "@web/shared/ui/ui";

import admin from "./admin.module.css";
import { AdminBadge, AdminHeading, adminId, PageEnd } from "./admin-ui";
import { CapabilityGate } from "./gate";
import styles from "./operations.module.css";
import { useAudit } from "./use-report-insights";

function auditTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
    hourCycle: "h23",
  }).format(new Date(value));
}
const outcomes = { SUCCESS: "Thành công", DENIED: "Bị từ chối", FAILED: "Thất bại" };
export function AuditPage() {
  useTitle("Nhật ký");
  const c = useAudit(),
    { query, items, hidden, refresh, more, selected } = c;
  return (
    <CapabilityGate permission="audit.read">
      <div className={styles.page}>
        <AdminHeading
          title="Nhật ký"
          eyebrow="QUẢN TRỊ / NHẬT KÝ"
          description="Đối chiếu các thao tác đã ghi nhận."
        >
          <Button
            variant="secondary"
            disabled={hidden || query.isFetching}
            onClick={() => void refresh()}
          >
            Tải lại
          </Button>
        </AdminHeading>
        {query.isLoading ? <SkeletonLines /> : null}
        {query.error ? (
          <ErrorPanel error={query.error} onRetry={hidden ? undefined : () => void refresh()} />
        ) : null}
        {!hidden && query.data ? (
          <section className={admin.panel}>
            <div className={styles.scope}>
              <p>{items.length} bản ghi đã tải</p>
              <p>Giờ Việt Nam · UTC+7</p>
            </div>
            {items.length === 0 ? (
              <EmptyState title="Chưa có dòng nhật ký">
                Không có bản ghi trong phần đã tải.
              </EmptyState>
            ) : (
              <TableScroll label="Nhật ký quản trị">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      {[
                        "Thời điểm",
                        "Người thực hiện",
                        "Hành động",
                        "Tài nguyên",
                        "Kết quả",
                        "Chi tiết",
                      ].map((t) => (
                        <th key={t} scope="col">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr
                        key={r.id}
                        className={selected?.id === r.id ? styles.selected : undefined}
                      >
                        <td>{auditTime(r.occurredAt)}</td>
                        <td className={styles.code}>
                          {r.actorType} · {r.actorId ? adminId(r.actorId) : "Không có mã"}
                        </td>
                        <td className={styles.code}>{r.action}</td>
                        <td className={styles.code}>
                          {r.resourceType} · {r.resourceId ? adminId(r.resourceId) : "Không có mã"}
                        </td>
                        <td>
                          <AdminBadge tone={r.outcome === "SUCCESS" ? "success" : "warning"}>
                            {outcomes[r.outcome]}
                          </AdminBadge>
                        </td>
                        <td>
                          <Button variant="secondary" onClick={() => c.select(r.id)}>
                            Chi tiết
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
            <PageEnd
              next={Boolean(query.hasNextPage)}
              loading={query.isFetching}
              onMore={() => void more()}
            />
          </section>
        ) : null}
        {selected ? (
          <Dialog title="Chi tiết nhật ký" className={styles.drawer} onClose={() => c.select(null)}>
            <p>Bản ghi {adminId(selected.id)}</p>
            <AdminBadge tone={selected.outcome === "SUCCESS" ? "success" : "warning"}>
              {outcomes[selected.outcome]}
            </AdminBadge>
            <dl className={styles.facts}>
              {[
                ["Thời điểm", auditTime(selected.occurredAt)],
                [
                  "Người thực hiện",
                  `${selected.actorType} · ${selected.actorId ? adminId(selected.actorId) : "Không có mã"}`,
                ],
                ["Hành động", selected.action],
                [
                  "Tài nguyên",
                  `${selected.resourceType} · ${selected.resourceId ? adminId(selected.resourceId) : "Không có mã"}`,
                ],
                ["Lý do", selected.reason ?? "Không được cung cấp"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              <div>
                <dt>Trường đổi</dt>
                <dd className={styles.chips}>
                  {selected.changedFields.length
                    ? selected.changedFields.map((f) => <span key={f}>{f}</span>)
                    : "Không được cung cấp"}
                </dd>
              </div>
              <div>
                <dt>Mã đối chiếu</dt>
                <dd className={styles.code}>{selected.correlationId}</dd>
              </div>
            </dl>
            <Button variant="secondary" onClick={() => void c.copy()}>
              Chép mã đối chiếu
            </Button>
            {c.copyNote ? <p role="status">{c.copyNote}</p> : null}
            <Button variant="secondary" onClick={() => c.select(null)}>
              Đóng
            </Button>
          </Dialog>
        ) : null}
      </div>
    </CapabilityGate>
  );
}

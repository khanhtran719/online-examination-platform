import type { ReactNode } from "react";
import { Link } from "react-router";
import { useRuntime } from "../../app/runtime";
import type { Permission } from "../../shared/api/dto";
import { Alert } from "../../shared/ui/ui";

export function useCapability(permission: Permission): "live-blocked" | "denied" | "allowed" {
  const { mode, demo } = useRuntime();
  if (mode === "live" || !demo) return "live-blocked";
  return demo.permissions.includes(permission) ? "allowed" : "denied";
}

export function CapabilityGate({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const state = useCapability(permission);
  if (state === "live-blocked") {
    return (
      <div>
        <Alert tone="warning" title="Chưa mở được trang này">
          Hồ sơ chưa cho biết quyền, nên trang quản trị không mở và không gọi API quản trị. Ứng dụng
          không đoán quyền từ phiên đăng nhập.
        </Alert>
        <Link to="/dashboard">Về bảng làm việc</Link>
      </div>
    );
  }
  if (state === "denied") {
    return (
      <Alert title="Bạn không có quyền này">
        Thiếu {permission}. Đổi preset chỉ có trong dữ liệu mẫu và không áp dụng cho bản live.
      </Alert>
    );
  }
  return children;
}

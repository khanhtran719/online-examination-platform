import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useRuntime } from "@web/app/runtime";
import { isApiError } from "@web/shared/api/errors";

import { useAuthScope } from "./use-auth-scope";
import { useAuthWait } from "./use-auth-wait";

export function useVerification() {
  const { api, verifyToken } = useRuntime();
  const scope = useAuthScope();
  const navigate = useNavigate();
  const wait = useAuthWait();
  const busy = useRef(false);
  const intent = useRef<{ token: string; password: string; ticket: number } | null>(null);
  const [state, setState] = useState<{
    key: string;
    phase: "ready" | "pending" | "unknown" | "invalid" | "context";
    error: string;
  }>({ key: scope.key, phase: "ready", error: "" });
  const phase = state.key === scope.key ? state.phase : "ready";
  const allowed =
    scope.session.status === "anonymous" &&
    !scope.session.needsReauth &&
    /^[A-Za-z0-9_-]{43}$/.test(verifyToken);
  useEffect(() => {
    intent.current = null;
    return () => {
      intent.current = null;
    };
  }, [scope.key]);
  async function send(captured: NonNullable<typeof intent.current>) {
    if (!allowed || busy.current || wait.blocked() || !scope.current(captured.ticket)) return;
    busy.current = true;
    setState({ key: scope.key, phase: "pending", error: "" });
    try {
      const result = await api.confirmEmailVerification({
        token: captured.token,
        password: captured.password,
      });
      if (!scope.current(captured.ticket)) return;
      if (!result.data.verified) throw new Error("Verification acknowledgement missing");
      intent.current = null;
      navigate("/login", { replace: true, state: { verified: true } });
    } catch (caught) {
      if (!scope.current(captured.ticket)) return;
      if (isApiError(caught) && caught.status === 400) {
        intent.current = null;
        setState({
          key: scope.key,
          phase: "invalid",
          error: "Liên kết không hợp lệ hoặc đã hết hạn. Hãy yêu cầu hướng dẫn mới.",
        });
      } else if (isApiError(caught) && (caught.status === 401 || caught.status === 403)) {
        intent.current = null;
        setState({
          key: scope.key,
          phase: "context",
          error:
            "Phiên trình duyệt đã thay đổi hoặc yêu cầu không được chấp nhận. Kiểm tra lại phiên trước khi xác nhận.",
        });
      } else {
        if (isApiError(caught) && caught.status === 429)
          wait.start(Math.max(60, caught.retryAfterSeconds ?? 60));
        setState({
          key: scope.key,
          phase: "unknown",
          error:
            isApiError(caught) && caught.status === 429
              ? "Hãy chờ trước khi xác nhận lại. Lần thử lại giữ mật khẩu đã gửi."
              : "Chưa nhận được xác nhận. Không đổi mật khẩu lúc này; thử xác nhận lại với đúng yêu cầu vừa gửi. Liên kết đã dùng không thay đổi mật khẩu lần đầu.",
        });
      }
    } finally {
      busy.current = false;
    }
  }
  async function submit(body: { password: string }) {
    if (!allowed || phase !== "ready" || busy.current || wait.blocked()) return;
    const captured = { token: verifyToken, password: body.password, ticket: scope.capture() };
    intent.current = captured;
    await send(captured);
  }
  async function retry() {
    const captured = intent.current;
    if (captured) await send(captured);
  }
  return {
    session: scope.session,
    scopeKey: scope.key,
    tokenState:
      verifyToken === ""
        ? "missing"
        : /^[A-Za-z0-9_-]{43}$/.test(verifyToken)
          ? "valid"
          : "invalid",
    allowed,
    phase,
    error: state.key === scope.key ? state.error : "",
    submit,
    retry,
    remaining: wait.remaining,
  };
}

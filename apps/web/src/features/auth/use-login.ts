import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { useRuntime } from "@web/app/runtime";
import { isApiError } from "@web/shared/api/errors";
import { safeReturnPath } from "@web/shared/format";

import { useAuthScope } from "./use-auth-scope";
import { useAuthWait } from "./use-auth-wait";

export function useLogin() {
  const { api } = useRuntime();
  const scope = useAuthScope();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const wait = useAuthWait();
  const busy = useRef(false);
  const acknowledged = useRef<{ userId: string; ticket: number; destination: string } | null>(null);
  const [state, setState] = useState({
    key: scope.key,
    error: "",
    reading: false,
    readFailed: false,
  });
  const currentState =
    state.key === scope.key ? state : { error: "", reading: false, readFailed: false };
  const allowed =
    scope.session.status !== "loading" &&
    scope.session.status !== "unavailable" &&
    (scope.session.status === "anonymous" || scope.session.needsReauth);
  async function readProfile(ack: NonNullable<typeof acknowledged.current>) {
    setState({ key: scope.key, error: "", reading: true, readFailed: false });
    try {
      const result = await api.getProfile();
      if (!scope.current(ack.ticket)) return;
      if (result.data.id !== ack.userId) throw new Error("Profile principal mismatch");
      acknowledged.current = null;
      scope.session.replaceActor(result.data);
      navigate(ack.destination, { replace: true });
    } catch (caught) {
      if (!scope.current(ack.ticket)) return;
      if (isApiError(caught) && caught.status === 429) wait.start(caught.retryAfterSeconds ?? 60);
      setState({
        key: scope.key,
        reading: false,
        readFailed: true,
        error:
          "Máy chủ đã nhận đăng nhập nhưng chưa tải được hồ sơ. Thử tải lại hồ sơ; chưa cần gửi đăng nhập lần nữa.",
      });
    }
  }
  async function submit(body: { email: string; password: string }) {
    if (busy.current || !allowed || wait.blocked()) return;
    const ack = acknowledged.current;
    if (ack && scope.current(ack.ticket)) return;
    busy.current = true;
    const ticket = scope.capture();
    setState({ key: scope.key, error: "", reading: false, readFailed: false });
    try {
      const result = await api.login(body);
      if (!scope.current(ticket)) return;
      const next = {
        userId: result.data.userId,
        ticket,
        destination: safeReturnPath(params.get("return")),
      };
      acknowledged.current = next;
      await readProfile(next);
    } catch (caught) {
      if (!scope.current(ticket)) return;
      if (isApiError(caught) && caught.status === 429) wait.start(caught.retryAfterSeconds ?? 60);
      const message =
        isApiError(caught) && caught.status === 401
          ? "Không thể đăng nhập. Kiểm tra email, mật khẩu hoặc xác thực email rồi thử lại."
          : isApiError(caught) && caught.status === 429
            ? "Hãy chờ trước khi đăng nhập lại."
            : "Chưa nhận được xác nhận đăng nhập. Không tự gửi lại; kiểm tra kết nối trước khi thử lại.";
      setState({ key: scope.key, error: message, reading: false, readFailed: false });
    } finally {
      busy.current = false;
    }
  }
  async function retryRead() {
    const ack = acknowledged.current;
    if (!ack || !scope.current(ack.ticket) || busy.current || wait.blocked()) return;
    busy.current = true;
    try {
      await readProfile(ack);
    } finally {
      busy.current = false;
    }
  }
  return {
    ...currentState,
    submit,
    retryRead,
    allowed,
    remaining: wait.remaining,
    scopeKey: scope.key,
    session: scope.session,
  };
}

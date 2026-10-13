import { useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useRuntime } from "@web/app/runtime";
import { isApiError } from "@web/shared/api/errors";

import { useAuthScope } from "./use-auth-scope";
import { useAuthWait } from "./use-auth-wait";

export function useRegister() {
  const { api, demo } = useRuntime();
  const scope = useAuthScope();
  const navigate = useNavigate();
  const wait = useAuthWait();
  const busy = useRef(false);
  const [feedback, setFeedback] = useState({ key: scope.key, message: "" });
  async function submit(body: { email: string; displayName: string; password: string }) {
    if (
      busy.current ||
      wait.blocked() ||
      scope.session.status !== "anonymous" ||
      scope.session.needsReauth
    )
      return;
    busy.current = true;
    const ticket = scope.capture();
    setFeedback({ key: scope.key, message: "" });
    try {
      await api.register(body);
      if (!scope.current(ticket)) return;
      demo?.notify();
      // Only non-sensitive acceptance metadata enters router history.
      navigate("/check-email", { state: { accepted: true } });
    } catch (caught) {
      if (!scope.current(ticket)) return;
      if (isApiError(caught) && caught.status === 429) wait.start(caught.retryAfterSeconds ?? 60);
      setFeedback({
        key: scope.key,
        message:
          isApiError(caught) && caught.status === 429
            ? "Hãy chờ trước khi tạo tài khoản lại."
            : "Chưa nhận được xác nhận yêu cầu. Kiểm tra kết nối; yêu cầu có thể đã được nhận. Bạn có thể kiểm tra hộp thư hoặc gửi lại hướng dẫn.",
      });
    } finally {
      busy.current = false;
    }
  }
  return {
    submit,
    scopeKey: scope.key,
    session: scope.session,
    remaining: wait.remaining,
    error: feedback.key === scope.key ? feedback.message : "",
  };
}

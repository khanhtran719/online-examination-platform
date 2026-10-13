import { useEffect, useRef, useState } from "react";

import { useRuntime } from "@web/app/runtime";
import { isApiError } from "@web/shared/api/errors";
import { normalizeEmail } from "@web/shared/format";
import { emailIssue } from "@web/shared/validation";

import { useAuthScope } from "./use-auth-scope";
import { useAuthWait } from "./use-auth-wait";

export function useCheckEmail() {
  const { api, demo } = useRuntime();
  const scope = useAuthScope();
  const wait = useAuthWait();
  const busy = useRef<number | null>(null);
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    key: string;
    type: "accepted" | "limited" | "error";
    message: string;
  } | null>(null);
  useEffect(() => {
    setEmail("");
    setPending(false);
    setFieldError(undefined);
    setFeedback(null);
  }, [scope.key]);
  async function resend() {
    if (
      (busy.current !== null && scope.current(busy.current)) ||
      wait.blocked() ||
      scope.session.status !== "anonymous" ||
      scope.session.needsReauth
    )
      return;
    const invalid = emailIssue(email);
    setFieldError(invalid);
    if (invalid) return;
    const ticket = scope.capture();
    busy.current = ticket;
    setPending(true);
    setFeedback(null);
    try {
      await api.requestEmailVerification({ email: normalizeEmail(email) });
      if (!scope.current(ticket)) return;
      demo?.notify();
      wait.start(60);
      setFeedback({
        key: scope.key,
        type: "accepted",
        message:
          "Nếu email đủ điều kiện, hệ thống sẽ gửi hướng dẫn. Thông báo này không xác nhận email có tài khoản hay thư đã đến.",
      });
    } catch (caught) {
      if (!scope.current(ticket)) return;
      const limited = isApiError(caught) && caught.status === 429;
      if (limited) wait.start(Math.max(60, caught.retryAfterSeconds ?? 60));
      setFeedback({
        key: scope.key,
        type: limited ? "limited" : "error",
        message: limited
          ? "Tải lại trang không xóa giới hạn của máy chủ. Hãy chờ hết thời gian rồi thử lại."
          : "Chưa nhận được xác nhận gửi lại. Kiểm tra kết nối và hộp thư trước khi thử; yêu cầu có thể đã được nhận.",
      });
    } finally {
      if (busy.current === ticket) busy.current = null;
      if (scope.current(ticket)) setPending(false);
    }
  }
  return {
    email,
    setEmail,
    fieldError,
    resend,
    pending,
    remaining: wait.remaining,
    feedback: feedback?.key === scope.key ? feedback : null,
    session: scope.session,
    scopeKey: scope.key,
  };
}

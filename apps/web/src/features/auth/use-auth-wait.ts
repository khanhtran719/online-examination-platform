import { useEffect, useRef, useState } from "react";

export function useAuthWait() {
  const deadline = useRef(0);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!remaining) return;
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((deadline.current - performance.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [remaining]);
  return {
    remaining,
    blocked: () => performance.now() < deadline.current,
    start: (seconds: number) => {
      const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
      deadline.current = performance.now() + safe * 1000;
      setRemaining(Math.ceil(safe));
    },
  };
}

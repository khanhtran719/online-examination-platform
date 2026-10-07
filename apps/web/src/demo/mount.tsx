import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../app/app";
import type { DemoControls } from "../app/runtime";
import { isApiError } from "../shared/api/errors";
import type { PlatformApi } from "../shared/api/platform";
import type { SessionTransport } from "../features/auth/session-coordinator";
import { DemoChrome } from "./chrome";
import { createDemoServer, type DemoExtras } from "./server";

function DemoState({
  api,
  extras,
  verifyToken,
  transport,
}: {
  api: PlatformApi;
  extras: DemoExtras;
  verifyToken: string;
  transport: SessionTransport;
}) {
  const [tick, setTick] = useState(0);
  const [resetEpoch, setResetEpoch] = useState(0);
  const demo = useMemo<DemoControls>(() => {
    void tick;
    return {
      permissions: extras.permissions(),
      fault: extras.fault(),
      mailbox: extras.mailbox(),
      setPreset(preset) {
        extras.setPermissions(preset);
        setTick((value) => value + 1);
      },
      setFault(fault) {
        extras.setFault(fault);
        setTick((value) => value + 1);
      },
      reset() {
        extras.reset();
        setResetEpoch((value) => value + 1);
      },
      notify() {
        setTick((value) => value + 1);
      },
      replayRevision(attemptId) {
        return extras.replayRevision(attemptId);
      },
      loadStress(count) {
        const id = extras.loadStressExam(count);
        setTick((value) => value + 1);
        return id;
      },
    };
  }, [extras, tick]);
  const runtime = useMemo(
    () => ({ api, mode: "demo" as const, verifyToken, transport, demo }),
    [api, demo, transport, verifyToken],
  );
  return <App key={resetEpoch} runtime={runtime} headerSlot={<DemoChrome />} />;
}

export function mountDemo(root: HTMLElement, verifyToken: string): void {
  const { api, extras } = createDemoServer();
  const transport: SessionTransport = {
    async probe() {
      try {
        await api.getProfile();
        return "authenticated";
      } catch (error) {
        if (isApiError(error) && error.status === 401) return "anonymous";
        return "unknown";
      }
    },
    async refresh() {
      return (await api.refresh()).data;
    },
  };
  createRoot(root).render(
    <StrictMode>
      <DemoState api={api} extras={extras} verifyToken={verifyToken} transport={transport} />
    </StrictMode>,
  );
}

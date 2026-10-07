import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../app/app";
import { createHttpApi } from "./create-http-api";

export function mountLive(root: HTMLElement, verifyToken: string): void {
  const handle = createHttpApi();
  createRoot(root).render(
    <StrictMode>
      <App
        runtime={{
          api: handle.api,
          mode: "live",
          verifyToken,
          transport: handle.transport,
          bindRecovery: (recover) => handle.bindRecovery(recover),
          demo: null,
        }}
      />
    </StrictMode>,
  );
}

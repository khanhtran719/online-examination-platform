import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { IdentityService } from "./runtime.mjs";
const require = createRequire(import.meta.url);
const { Module } = require("../../node_modules/@nestjs/common");
const { ShutdownGate } = require("../../dist/infrastructure/resilience/shutdown/shutdown-gate.js");
const {
  createHttpApplication,
} = require("../../dist/infrastructure/http/configure-http-application.js");
const {
  IdentityController,
} = require("../../dist/modules/identity/presentation/http/identity.controller.js");
const {
  HTTP_SESSION,
} = require("../../dist/modules/identity/presentation/http/http-session.port.js");
const { HttpSession } = require("../../dist/modules/identity/infrastructure/http/http-session.js");
export async function httpFixture(identity, security) {
  const origin = "http://127.0.0.1:3000";
  class ExperimentModule {}
  Module({
    controllers: [IdentityController],
    providers: [
      { provide: IdentityService, useValue: identity },
      {
        provide: HTTP_SESSION,
        useValue: new HttpSession(identity, security, origin, randomBytes(32)),
      },
      ShutdownGate,
    ],
  })(ExperimentModule);
  const api = await createHttpApplication(ExperimentModule);
  await api.app.listen(0, "127.0.0.1");
  const url = await api.app.getUrl();
  return {
    origin,
    close: () => api.app.close(),
    async call(path, options = {}) {
      return fetch(url + path, options);
    },
  };
}

import { expect, it } from "vitest";

import { createDemoServer } from "../server";

const examId = "00000000-0000-4000-8000-000000000102";
it("replays one synthetic attempt after a lost start acknowledgement and checks permission before replay", async () => {
  const { api, extras } = createDemoServer({ sleep: async () => undefined });
  await api.login({ email: "candidate@example.test", password: "fixture-password-ok" });
  const before = (await api.getHistory({ pageSize: 100 })).data.items.length;
  extras.setFault("lose-ack");
  await expect(api.startAttempt(examId, "start-intent")).rejects.toMatchObject({ kind: "network" });
  const first = await api.startAttempt(examId, "start-intent");
  const retry = await api.startAttempt(examId, "start-intent");
  expect(retry).toEqual(first);
  expect((await api.getHistory({ pageSize: 100 })).data.items.length).toBe(before + 1);
  extras.setPermissions("reviewer");
  await expect(api.startAttempt(examId, "start-intent")).rejects.toMatchObject({ status: 403 });
});

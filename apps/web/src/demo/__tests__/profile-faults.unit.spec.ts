import { expect, it } from "vitest";

import { createDemoServer } from "../server";

it("keeps a profile receipt after lost ACK and replays exactly once", async () => {
  const { api, extras } = createDemoServer({ sleep: async () => undefined });
  await api.login({ email: "candidate@example.test", password: "fixture-password-ok" });
  const base = (await api.getProfile()).data;
  const body = { displayName: "Lan mới", leaderboardOptIn: true, expectedRevision: base.revision };
  extras.setFault("lose-ack");
  await expect(api.updateProfile("profile-key", body)).rejects.toMatchObject({ kind: "network" });
  const current = (await api.getProfile()).data;
  expect(current.revision).toBe(base.revision + 1);
  expect(current.leaderboardOptIn).toBe(true);
  const receipt = await api.updateProfile("profile-key", body);
  expect(receipt.data.resourceId).toBe(base.id);
  expect((await api.getProfile()).data.revision).toBe(current.revision);
});
it("does not expose another candidate's cached profile receipt when the same key is reused", async () => {
  const { api, extras } = createDemoServer();
  await api.login({ email: "candidate@example.test", password: "fixture-password-ok" });
  const body = { displayName: "Private A", leaderboardOptIn: false, expectedRevision: 1 };
  const first = (await api.updateProfile("same-key", body)).data;
  await api.logout();
  await api.register({
    email: "second@example.test",
    displayName: "Second",
    password: "fixture-password-ok",
  });
  const token = extras.mailbox().find((mail) => mail.email === "second@example.test")!.token;
  await api.confirmEmailVerification({ token, password: "fixture-password-ok" });
  await api.login({ email: "second@example.test", password: "fixture-password-ok" });
  const second = (await api.updateProfile("same-key", body)).data;
  expect(second.resourceId).not.toBe(first.resourceId);
});

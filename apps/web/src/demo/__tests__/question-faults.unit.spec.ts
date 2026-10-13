import { expect, it } from "vitest";

import { IMPORT_TEMPLATE } from "../../shared/validation";
import { createDemoServer } from "../server";

async function setup() {
  const server = createDemoServer({ sleep: async () => undefined });
  await server.api.login({ email: "candidate@example.test", password: "fixture-password-ok" });
  server.extras.setPermissions("admin");
  return server;
}
it("replays one question write after a synthetic lost acknowledgement", async () => {
  const { api, extras } = await setup();
  const q = (await api.listBankQuestions({ pageSize: 1 })).data.items[0]!;
  const { id, revision, archived: _archived, ...fields } = q;
  expect(_archived).toBe(false);
  const body = { ...fields, prompt: "Local changed", expectedRevision: revision };
  extras.setFault("lose-ack");
  await expect(api.replaceBankQuestion(id, "question-replace", body)).rejects.toMatchObject({
    kind: "network",
  });
  const ack = await api.replaceBankQuestion(id, "question-replace", body);
  expect(ack.data.revision).toBe(revision + 1);
});
it("replays one atomic import without adding duplicate synthetic questions", async () => {
  const { api, extras } = await setup();
  const body = { ...JSON.parse(IMPORT_TEMPLATE), dryRun: false };
  const count = (await api.listBankQuestions({ pageSize: 100 })).data.items.length;
  extras.setFault("lose-ack");
  await expect(api.importQuestions("import-commit", body)).rejects.toMatchObject({
    kind: "network",
  });
  expect((await api.importQuestions("import-commit", body)).data.committed).toBe(true);
  expect((await api.listBankQuestions({ pageSize: 100 })).data.items.length).toBe(count + 1);
});

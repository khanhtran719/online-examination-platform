import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

import { chromium, expect, test as base } from "playwright/test";

import { startIdentityHttps } from "../../../../scripts/identity-https-fixture.mjs";
import { login, requestKey, verifiedAccount } from "../catalog-https/fixtures.mjs";

export { requestKey } from "../catalog-https/fixtures.mjs";

async function seed(harness, browser) {
  const context = await browser.newContext();
  try {
    const account = await verifiedAccount(harness, context);
    const auth = await harness.request(context, "POST", "/v1/auth/login", account);
    expect(auth.status).toBe(200);
    await harness.fixture.query(
      `
      SELECT identity.operator_admin($1, $2, $3, $4, true, true)
      `,
      [
        JSON.parse(auth.text).data.userId,
        "local-assessment-fixture",
        "Disposable seed",
        randomUUID(),
      ],
    );
    async function write(method, path, body) {
      await new Promise((done) => setTimeout(done, 425));
      const response = await harness.request(context, method, path, body, {
        "idempotency-key": requestKey(),
      });
      expect([200, 201]).toContain(response.status);
      return JSON.parse(response.text).data;
    }
    const questions = [];
    for (let index = 0; index < 23; index++) {
      const type = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"][index] ?? "SINGLE_CHOICE";
      const body = {
        type,
        prompt: `Câu HTTPS ${index + 1}: chọn đáp án.`,
        options:
          type === "TRUE_FALSE"
            ? [
                { position: 1, text: "Đúng" },
                { position: 2, text: "Sai" },
              ]
            : [
                { position: 1, text: "Lựa chọn A" },
                { position: 2, text: "Lựa chọn B" },
              ],
        correctOptionPositions: type === "MULTIPLE_CHOICE" ? [1, 2] : [1],
        points: 2,
        explanation: "PRIVATE_ASSESSMENT_EXPLANATION_SENTINEL",
        expectedRevision: 0,
      };
      questions.push({ ...(await write("POST", "/v1/admin/questions", body)), body });
    }
    async function exam(title, groups) {
      const body = {
        title,
        category: "IT_CERTIFICATION",
        durationSeconds: 1800,
        openAt: new Date(Date.now() - 3600_000).toISOString(),
        closeAt: new Date(Date.now() + 3600_000).toISOString(),
        displayTimezone: "Asia/Ho_Chi_Minh",
        attemptLimit: 2,
        explanationPolicy: "NEVER",
        leaderboardEnabled: false,
        sections: groups.map((group, index) => ({
          title: `Phần HTTPS ${index + 1}`,
          position: index + 1,
          questions: group.map((q, position) => ({
            bankQuestionId: q.resourceId,
            position: position + 1,
            points: 2,
          })),
        })),
        expectedRevision: 0,
      };
      const created = await write("POST", "/v1/admin/exams", body);
      const published = await write("POST", `/v1/admin/exams/${created.resourceId}/publish`, {
        expectedRevision: created.revision,
      });
      return { id: created.resourceId, body, revision: published.revision };
    }
    return {
      small: await exam("Đề HTTPS ba loại câu", [questions.slice(0, 2), questions.slice(2, 3)]),
      paged: await exam("Đề HTTPS nhiều trang", [questions.slice(0, 12), questions.slice(12)]),
      frozen: await exam("Đề HTTPS phiên bản gốc", [questions.slice(0, 1)]),
      questions,
      write,
      close: () => context.close(),
    };
  } catch (error) {
    await context.close();
    throw error;
  }
}

export const test = base.extend({
  harness: [
    async ({}, provide) => {
      const harness = await startIdentityHttps();
      try {
        await provide(harness);
      } finally {
        try {
          await mkdir("../../.local/web-evidence/web-04", { recursive: true });
          await writeFile(
            "../../.local/web-evidence/web-04/boundaries.json",
            JSON.stringify(
              {
                requests: harness.requests,
                httpLogs: harness.logs,
                buildProvenance: harness.buildProvenance,
              },
              null,
              2,
            ),
          );
        } finally {
          await harness.close();
        }
      }
    },
    { scope: "worker", timeout: 60_000 },
  ],
  browser: [
    async ({ harness }, provide) => {
      const browser = await chromium.launch({
        args: [`--ignore-certificate-errors-spki-list=${harness.spki}`],
      });
      try {
        await provide(browser);
      } finally {
        await browser.close();
      }
    },
    { scope: "worker" },
  ],
  exams: [
    async ({ harness, browser }, provide) => {
      const exams = await seed(harness, browser);
      try {
        await provide(exams);
      } finally {
        await exams.close();
      }
    },
    { scope: "worker", timeout: 60_000 },
  ],
  context: async ({ browser, harness }, provide) => {
    const context = await browser.newContext({
      baseURL: harness.origin,
      viewport: { width: 1280, height: 1100 },
      ignoreHTTPSErrors: false,
    });
    try {
      await provide(context);
    } finally {
      await context.close();
    }
  },
  candidate: async ({ harness, context, page, exams: _exams }, provide) => {
    const account = await verifiedAccount(harness, context);
    const id = await login(page, account);
    await expect(page.locator("main li")).toHaveCount(3);
    await provide({ ...account, id });
  },
});
export { expect } from "playwright/test";

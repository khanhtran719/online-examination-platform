import { processGradingDelivery } from "../grading-delivery";
import { QueueConsumer } from "../../../shared/application/ports/queue-consumer.port";

describe("grading delivery settlement", () => {
  it("waits for durable completion before delete and permits verified duplicate/quarantine ACK", async () => {
    for (const outcome of ["completed", "duplicate", "quarantined"]) {
      let committed = false,
        deleted = false;
      const queue: QueueConsumer = {
        receive: async () => [],
        extend: async () => {},
        acknowledge: async () => {
          expect(committed).toBe(true);
          deleted = true;
        },
      };
      await processGradingDelivery({
        queue,
        delivery: { body: "body", receipt: "latest-handle" },
        heartbeatMs: 100,
        consume: async () => {
          committed = true;
          return { outcome };
        },
      });
      expect(deleted).toBe(true);
    }
  });
  it("does not ACK a rolled-back effect or quarantine storage failure", async () => {
    let deleted = false;
    const queue: QueueConsumer = {
      receive: async () => [],
      extend: async () => {},
      acknowledge: async () => {
        deleted = true;
      },
    };
    await expect(
      processGradingDelivery({
        queue,
        delivery: { body: "body", receipt: "handle" },
        heartbeatMs: 100,
        consume: async () => {
          throw new Error("DB unavailable");
        },
      }),
    ).rejects.toThrow();
    expect(deleted).toBe(false);
  });
  it("surfaces lost delete ACK so broker redelivery uses the durable inbox", async () => {
    const queue: QueueConsumer = {
      receive: async () => [],
      extend: async () => {},
      acknowledge: async () => {
        throw new Error("lost ACK");
      },
    };
    await expect(
      processGradingDelivery({
        queue,
        delivery: { body: "body", receipt: "handle" },
        heartbeatMs: 100,
        consume: async () => ({ outcome: "completed" }),
      }),
    ).rejects.toThrow("lost ACK");
  });
  it("extends visibility without overlap and stops heartbeats before ACK", async () => {
    jest.useFakeTimers();
    let active = 0,
      max = 0,
      extended = 0;
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const queue: QueueConsumer = {
      receive: async () => [],
      acknowledge: async () => {
        expect(active).toBe(0);
      },
      extend: async () => {
        active++;
        max = Math.max(max, active);
        extended++;
        await new Promise((done) => setTimeout(done, 30));
        active--;
      },
    };
    try {
      const work = processGradingDelivery({
        queue,
        delivery: { body: "body", receipt: "handle" },
        heartbeatMs: 10,
        consume: async () => {
          await pending;
          return { outcome: "completed" };
        },
      });
      await jest.advanceTimersByTimeAsync(65);
      finish();
      await jest.advanceTimersByTimeAsync(40);
      await work;
      const count = extended;
      await jest.advanceTimersByTimeAsync(100);
      expect(extended).toBe(count);
      expect(count).toBeGreaterThan(0);
      expect(max).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });
  it("suppresses ACK if a visibility heartbeat failed and isolates telemetry", async () => {
    jest.useFakeTimers();
    let deleted = false;
    const queue: QueueConsumer = {
      receive: async () => [],
      extend: async () => {
        throw new Error("lease lost");
      },
      acknowledge: async () => {
        deleted = true;
      },
    };
    try {
      const work = processGradingDelivery({
        queue,
        delivery: { body: "body", receipt: "handle" },
        heartbeatMs: 10,
        consume: async () => {
          await new Promise((done) => setTimeout(done, 30));
          return { outcome: "completed" };
        },
        observe: () => {
          throw new Error("sink");
        },
      });
      const assertion = expect(work).rejects.toThrow("QUEUE_VISIBILITY_UNAVAILABLE");
      await jest.advanceTimersByTimeAsync(40);
      await assertion;
      expect(deleted).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});
import { jest } from "@jest/globals";

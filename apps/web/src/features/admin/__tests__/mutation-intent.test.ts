import { describe, expect, it } from "vitest";
import { idleIntent, settleIntent, startIntent } from "../mutation-intent";

describe("mutation intents", () => {
  it("keeps the key and body after an unknown outcome and blocks a mutated retry", () => {
    const first = startIntent(idleIntent<{ title: string }>(), {
      action: "save-draft",
      body: { title: "One" },
      expectedRevision: 3,
      keyFactory: () => "key-1",
    });
    const unknown = settleIntent(first.machine, "unknown");
    const changed = startIntent(unknown, {
      action: "save-draft",
      body: { title: "Two" },
      expectedRevision: 3,
      keyFactory: () => "key-2",
    });
    expect(changed.send).toBeNull();
    expect(changed.blocked).toBe("changed");
    expect(changed.machine.frozen?.key).toBe("key-1");
    const same = startIntent(unknown, {
      action: "save-draft",
      body: { title: "One" },
      expectedRevision: 3,
      keyFactory: () => "key-2",
    });
    expect(same.send?.key).toBe("key-1");
    expect(same.send?.body).toEqual({ title: "One" });
  });

  it("blocks a second click while the first intent is in flight", () => {
    const first = startIntent(idleIntent<string>(), {
      action: "publish",
      body: "frozen",
      expectedRevision: 1,
      keyFactory: () => "publish-key",
    });
    const second = startIntent(first.machine, {
      action: "publish",
      body: "frozen",
      expectedRevision: 1,
      keyFactory: () => "other",
    });
    expect(second.blocked).toBe("duplicate");
    expect(second.send).toBeNull();
  });

  it("starts a new intent after acknowledgement", () => {
    const first = startIntent(idleIntent<{ title: string }>(), {
      action: "create",
      body: { title: "Draft" },
      expectedRevision: 0,
      keyFactory: () => "create-key",
    });
    const acked = settleIntent(first.machine, "acked");
    const publish = startIntent(acked, {
      action: "publish",
      body: { title: "ignored" },
      expectedRevision: 4,
      keyFactory: () => "publish-key",
    });
    expect(publish.send?.action).toBe("publish");
    expect(publish.send?.key).toBe("publish-key");
    expect(publish.send?.key).not.toBe("create-key");
  });
});

import { describe, expect, it } from "vitest";
import { initialSample, sampleReducer, sampleScore } from "../sample";

describe("public sample session", () => {
  it("scores only the three authored sample answers", () => {
    expect(sampleScore([[2], [0, 2], [0]])).toBe(3);
    expect(sampleScore([[], [], []])).toBe(0);
  });

  it("requires an exact set for the multiple-choice sample", () => {
    expect(sampleScore([[2], [2, 0], [0]])).toBe(3);
    expect(sampleScore([[2], [0], [0]])).toBe(2);
    expect(sampleScore([[2], [0, 1, 2], [0]])).toBe(2);
  });

  it("keeps choices and marks when moving between questions", () => {
    let state = sampleReducer(initialSample(), { type: "select", option: 2, selected: true });
    state = sampleReducer(state, { type: "mark" });
    state = sampleReducer(state, { type: "jump", index: 1 });
    state = sampleReducer(state, { type: "select", option: 0, selected: true });
    state = sampleReducer(state, { type: "select", option: 2, selected: true });
    state = sampleReducer(state, { type: "jump", index: 0 });
    expect(state.choices).toEqual([[2], [0, 2], []]);
    expect(state.marked).toEqual([true, false, false]);
    expect(state.current).toBe(0);
  });

  it("replaces a radio choice and removes unchecked checkbox choices", () => {
    let state = sampleReducer(initialSample(), { type: "select", option: 0, selected: true });
    state = sampleReducer(state, { type: "select", option: 2, selected: true });
    expect(state.choices[0]).toEqual([2]);
    state = sampleReducer(state, { type: "jump", index: 1 });
    state = sampleReducer(state, { type: "select", option: 0, selected: true });
    state = sampleReducer(state, { type: "select", option: 2, selected: true });
    state = sampleReducer(state, { type: "select", option: 0, selected: false });
    expect(state.choices[1]).toEqual([2]);
  });

  it("clears only the current answer and resets the full experience on retry", () => {
    let state = sampleReducer(initialSample(), { type: "select", option: 2, selected: true });
    state = sampleReducer(state, { type: "mark" });
    state = sampleReducer(state, { type: "clear" });
    expect(state.choices).toEqual([[], [], []]);
    expect(state.marked[0]).toBe(true);
    expect(sampleReducer(state, { type: "retry" })).toEqual(initialSample());
  });

  it("allows reviewing incomplete choices before showing a sample result", () => {
    const review = sampleReducer(initialSample(), { type: "review" });
    expect(review.stage).toBe("review");
    expect(sampleReducer(review, { type: "result" }).stage).toBe("result");
  });

  it("ignores invalid question or option indexes", () => {
    const start = initialSample();
    expect(sampleReducer(start, { type: "jump", index: 3 })).toEqual(start);
    expect(sampleReducer(start, { type: "select", option: -1, selected: true })).toEqual(start);
  });
});

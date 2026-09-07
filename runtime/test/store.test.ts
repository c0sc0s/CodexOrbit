import { describe, expect, it } from "vitest";

import { createInitialState, reduceRuntimeState, RuntimeStore } from "../src/injected/store";

describe("RuntimeStore", () => {
  it("applies explicit dashboard actions without mutating reducer input", () => {
    const initial = createInitialState();
    const next = reduceRuntimeState(initial, { type: "dashboard.open" });
    expect(initial.open).toBe(false);
    expect(next).toEqual(expect.objectContaining({ open: true, view: "sessions", sortOpen: false }));
  });

  it("keeps a stable state reference for imperative host integrations", () => {
    const store = new RuntimeStore();
    const reference = store.state;
    store.dispatch({ type: "query.set", value: "中文" });
    store.dispatch({ type: "tag.set", value: "Bug" });
    expect(store.state).toBe(reference);
    expect(reference).toEqual(expect.objectContaining({ query: "中文", tag: "Bug" }));
  });
});

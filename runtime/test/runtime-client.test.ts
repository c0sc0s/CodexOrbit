import { describe, expect, it, vi } from "vitest";

import { RuntimeClient } from "../src/injected/runtime-client";

describe("RuntimeClient", () => {
  it("sends versioned messages through the configured binding", () => {
    const binding = vi.fn();
    const client = new RuntimeClient("bridge", () => true, () => undefined, () => binding);
    expect(client.send("search.request", { query: "架构" }, 9)).toBe(true);
    expect(JSON.parse(binding.mock.calls[0][0])).toEqual({
      protocolVersion: 1,
      type: "search.request",
      requestId: 9,
      payload: { query: "架构" },
    });
  });

  it("rejects malformed messages before feature handlers", () => {
    const onMessage = vi.fn(() => true);
    const onRejected = vi.fn();
    const client = new RuntimeClient("bridge", onMessage, onRejected, () => undefined);
    expect(client.handle({ protocolVersion: 2, type: "hello", payload: {} })).toBe(false);
    expect(onMessage).not.toHaveBeenCalled();
    expect(onRejected).toHaveBeenCalledWith("unsupported-version");
  });
});

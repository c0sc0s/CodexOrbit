import { describe, expect, it, vi } from "vitest";

import { RuntimeClient } from "../src/injected/runtime-client";

describe("RuntimeClient", () => {
  it("sends versioned messages through the supplied transport", async () => {
    const binding = vi.fn();
    const client = new RuntimeClient(async (message) => { binding(message); }, () => true, () => undefined, () => undefined);
    client.send("search.request", { query: "架构" }, 9);
    await Promise.resolve();
    expect(binding.mock.calls[0][0]).toEqual({
      protocolVersion: 1,
      type: "search.request",
      requestId: 9,
      payload: { query: "架构" },
    });
  });

  it("rejects malformed messages before feature handlers", () => {
    const onMessage = vi.fn(() => true);
    const onRejected = vi.fn();
    const client = new RuntimeClient(async () => {}, onMessage, onRejected, () => {});
    expect(client.handle({ protocolVersion: 2, type: "hello", payload: {} })).toBe(false);
    expect(onMessage).not.toHaveBeenCalled();
    expect(onRejected).toHaveBeenCalledWith("unsupported-version");
  });
});

it("returns rejected transports to business error handling with the original request identity", async () => {
  const onFailure = vi.fn();
  const client = new RuntimeClient(async () => { throw new Error("disconnected"); }, () => true, () => {}, onFailure);
  client.send("search.request", { query: "offline" }, 27);
  await vi.waitFor(() => expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ type: "search.request", requestId: 27 })));
});

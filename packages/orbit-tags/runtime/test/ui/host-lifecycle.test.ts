import { afterEach, describe, expect, it, vi } from "vitest";

import { HostLifecycle } from "../../src/injected/host-lifecycle";

describe("HostLifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("falls back when animation frames are suspended and flushes only once", () => {
    vi.useFakeTimers();
    let mutationCallback: MutationCallback | null = null;
    let frameCallback: FrameRequestCallback | null = null;
    const cancelAnimationFrame = vi.fn();
    class TestMutationObserver {
      constructor(callback: MutationCallback) {
        mutationCallback = callback;
      }

      observe(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal("document", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("MutationObserver", TestMutationObserver);
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 17;
    }));
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);
    const onRefresh = vi.fn();
    const lifecycle = new HostLifecycle({
      isInsideOwnedSurface: () => false,
      isRelevantMutation: () => true,
      hasInteractionFocus: () => false,
      onRefresh,
      trace: vi.fn(),
    });

    lifecycle.mount({} as Node);
    mutationCallback?.([{} as MutationRecord], {} as MutationObserver);
    vi.advanceTimersByTime(32);

    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onRefresh).toHaveBeenCalledWith("observer");
    expect(cancelAnimationFrame).toHaveBeenCalledWith(17);
    frameCallback?.(48);
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});

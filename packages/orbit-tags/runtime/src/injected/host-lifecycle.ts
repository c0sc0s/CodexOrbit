interface HostLifecycleOptions {
  isInsideOwnedSurface(target: Node): boolean;
  isRelevantMutation(mutation: MutationRecord): boolean;
  hasInteractionFocus(): boolean;
  onRefresh(reason: string): void;
  trace(event: string, details?: Record<string, unknown>): void;
}

export class HostLifecycle {
  private observer: MutationObserver | null = null;
  private queued = false;
  private queuedFrame: number | null = null;
  private queuedTimer: ReturnType<typeof setTimeout> | null = null;
  private pointerActive = false;
  private pendingRefresh = false;
  private refreshCount = 0;

  constructor(private readonly options: HostLifecycleOptions) {}

  get observerRefreshCount(): number {
    return this.refreshCount;
  }

  mount(root: Node): void {
    if (this.observer) return;
    document.addEventListener("pointerdown", this.trackPointerDown, true);
    document.addEventListener("pointerup", this.trackPointerEnd, true);
    document.addEventListener("pointercancel", this.trackPointerEnd, true);
    document.addEventListener("focusout", this.trackFocusOut, true);
    this.observer = new MutationObserver((mutations) => {
      if (!mutations.some(this.options.isRelevantMutation) || this.queued) return;
      this.refreshCount += 1;
      this.scheduleObserverRefresh();
    });
    this.observer.observe(root, { childList: true, subtree: true, characterData: true });
  }

  deferIfInteracting(reason: string): boolean {
    const focusWithin = this.options.hasInteractionFocus();
    if (!this.pointerActive && !focusWithin) return false;
    this.pendingRefresh = true;
    this.options.trace("render-deferred", { reason, pointerActive: this.pointerActive, focusWithin });
    return true;
  }

  didRender(): void {
    this.pendingRefresh = false;
  }

  dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.queuedFrame !== null) cancelAnimationFrame(this.queuedFrame);
    if (this.queuedTimer !== null) clearTimeout(this.queuedTimer);
    this.queued = false;
    this.queuedFrame = null;
    this.queuedTimer = null;
    this.pointerActive = false;
    this.pendingRefresh = false;
    document.removeEventListener("pointerdown", this.trackPointerDown, true);
    document.removeEventListener("pointerup", this.trackPointerEnd, true);
    document.removeEventListener("pointercancel", this.trackPointerEnd, true);
    document.removeEventListener("focusout", this.trackFocusOut, true);
  }

  private scheduleObserverRefresh(): void {
    this.queued = true;
    const flush = (): void => {
      if (!this.queued) return;
      this.queued = false;
      if (this.queuedFrame !== null) cancelAnimationFrame(this.queuedFrame);
      if (this.queuedTimer !== null) clearTimeout(this.queuedTimer);
      this.queuedFrame = null;
      this.queuedTimer = null;
      this.options.onRefresh("observer");
    };
    this.queuedFrame = requestAnimationFrame(flush);
    // requestAnimationFrame pauses in occluded Electron windows; host data still needs to converge.
    this.queuedTimer = setTimeout(flush, 32);
  }

  private readonly trackPointerDown = (event: PointerEvent): void => {
    if (!(event.target instanceof Node) || !this.options.isInsideOwnedSurface(event.target)) return;
    this.pointerActive = true;
    const control = event.target instanceof Element ? event.target.closest("button,select,input")?.className : null;
    this.options.trace("pointerdown", { control: control ?? "toolbar" });
  };

  private readonly trackPointerEnd = (): void => {
    if (!this.pointerActive) return;
    setTimeout(() => {
      this.pointerActive = false;
      this.options.trace("pointerend");
      this.flushDeferredRefresh();
    }, 0);
  };

  private readonly trackFocusOut = (event: FocusEvent): void => {
    if (!(event.target instanceof Node) || !this.options.isInsideOwnedSurface(event.target)) return;
    setTimeout(() => this.flushDeferredRefresh(), 0);
  };

  private flushDeferredRefresh(): void {
    if (!this.pendingRefresh || this.pointerActive || this.options.hasInteractionFocus()) return;
    this.options.onRefresh("interaction-end");
  }
}

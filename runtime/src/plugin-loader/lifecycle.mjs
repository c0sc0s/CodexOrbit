/** Tracks plugin resources and bounds asynchronous cleanup. Safe to serialize into a renderer. */
export function createResourceScope(timeoutMs = 5000) {
  const abort = new AbortController();
  const disposers = [];
  let closing = null;
  const bounded = (operation, label) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    Promise.resolve().then(operation).then(resolve, reject).finally(() => clearTimeout(timer));
  });
  const onDispose = (dispose) => {
    if (typeof dispose !== 'function') throw new Error('Expected a cleanup function');
    if (closing) {
      // An activation may finish after its deadline; do not retain its late resources.
      void bounded(dispose, 'Late cleanup').catch(() => {});
    } else disposers.push(dispose);
  };
  const close = () => {
    if (closing) return closing;
    abort.abort();
    closing = Promise.resolve().then(async () => {
      let failed = false;
      for (const dispose of disposers.splice(0).reverse()) {
        try { await bounded(dispose, 'Cleanup'); } catch { failed = true; }
      }
      if (failed) throw new Error('Plugin cleanup failed');
    });
    return closing;
  };
  return { signal: abort.signal, abort: () => abort.abort(), onDispose, close, bounded };
}

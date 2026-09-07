import { buildInjectionExpression, buildRemovalExpression, RUNTIME_VERSION } from "./inject-expression.mjs";

export function isCodexRendererTarget(target) {
  return target?.type === "page"
    && typeof target.url === "string"
    && target.url.startsWith("app://-")
    && typeof target.webSocketDebuggerUrl === "string";
}

export class RuntimeTargetRegistry {
  constructor(options) {
    this.port = options.port;
    this.ownsEndpoint = options.ownsEndpoint;
    this.settingsRepository = options.settingsRepository;
  }

  async discover() {
    const response = await fetch(`http://127.0.0.1:${this.port}/json/list`, {
      redirect: "error",
      signal: AbortSignal.timeout(800),
    });
    if (!response.ok) throw new Error(`CDP discovery failed: HTTP ${response.status}`);
    const targets = await response.json();
    return targets.filter(isCodexRendererTarget);
  }

  async evaluate(target, expression) {
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.close();
        reject(new Error(`CDP websocket open timed out for target ${target.id}`));
      }, 3000);
      socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error(`CDP websocket open failed for target ${target.id}`)); }, { once: true });
    });

    try {
      return await new Promise((resolve, reject) => {
        const id = 1;
        const timer = setTimeout(() => reject(new Error(`Runtime.evaluate timed out for target ${target.id}`)), 15_000);
        socket.addEventListener("message", (event) => {
          let message;
          try {
            message = JSON.parse(event.data);
          } catch {
            return;
          }
          if (message.id !== id) return;
          clearTimeout(timer);
          if (message.error) reject(new Error(message.error.message ?? "Runtime.evaluate failed"));
          else if (message.result?.exceptionDetails) reject(new Error(message.result.exceptionDetails.text ?? "injected script failed"));
          else resolve(message.result?.result?.value);
        });
        socket.send(JSON.stringify({
          id,
          method: "Runtime.evaluate",
          params: { expression, awaitPromise: true, returnByValue: true },
        }));
      });
    } finally {
      socket.close();
    }
  }

  async ensureInjected(settingsState) {
    if (!(await this.ownsEndpoint())) throw new Error(`拒绝连接：127.0.0.1:${this.port} 不属于 Codex`);
    const resolvedSettings = settingsState ?? await this.settingsRepository.read();
    const targets = await this.discover();
    if (targets.length === 0) throw new Error("未找到 Codex 主窗口 renderer");
    const results = [];
    const injectedTargetIds = new Set();
    for (const target of targets) {
      const activeVersion = await this.evaluate(target, "window.__codexSidebarTags?.version ?? null");
      if (activeVersion === RUNTIME_VERSION) {
        results.push(await this.evaluate(target, "window.__codexSidebarTags.status()"));
        continue;
      }
      results.push(await this.evaluate(target, buildInjectionExpression({
        tagDefinitions: resolvedSettings.settings.tags,
        settingsSource: resolvedSettings.exists ? "repository" : "defaults",
      })));
      injectedTargetIds.add(target.id);
    }
    return { targets, results, injectedTargetIds };
  }

  async removeInjection() {
    if (!(await this.ownsEndpoint())) throw new Error(`拒绝连接：127.0.0.1:${this.port} 不属于 Codex`);
    for (const target of await this.discover()) await this.evaluate(target, buildRemovalExpression());
  }
}

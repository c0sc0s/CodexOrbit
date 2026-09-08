import type { RuntimeI18n, MessageKey } from "./i18n";

export class UpdatePanel {
  private state: Record<string, unknown> = { phase: "idle" };
  private element: HTMLElement | null = null;
  constructor(private readonly i18n: RuntimeI18n, private readonly check: (force: boolean) => void, private readonly install: () => void) {}
  mount(): HTMLElement {
    this.element = document.createElement("section");
    this.element.className = "codex-sidebar-update-panel";
    this.render();
    queueMicrotask(() => this.check(false));
    return this.element;
  }
  update(state: Record<string, unknown>): void { this.state = state; this.render(); }
  private render(): void {
    if (!this.element) return;
    const { phase, currentVersion, latestVersion, error } = this.state;
    const busy = phase === "checking" || phase === "updating";
    const heading = document.createElement("strong");
    heading.textContent = this.i18n.t("updatesTitle");
    const versions = document.createElement("div");
    versions.textContent = this.i18n.t("updatesVersion", { current: typeof currentVersion === "string" && currentVersion ? currentVersion : "—" });
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    const keys: Record<string, MessageKey> = { idle: "updatesIdle", checking: "updatesChecking", current: "updatesCurrent", available: "updatesAvailable", updating: "updatesInstalling", succeeded: "updatesSucceeded" };
    const errors: Record<string, MessageKey> = { check: "updatesCheckError", start: "updatesStartError", install: "updatesInstallError", interrupted: "updatesInterrupted", transport: "updatesTransportError" };
    status.textContent = this.i18n.t(phase === "error" ? errors[String(error)] ?? "updatesInstallError" : keys[String(phase)] ?? "updatesIdle", { version: typeof latestVersion === "string" ? latestVersion : "" });
    const actions = document.createElement("div");
    const check = document.createElement("button");
    check.type = "button"; check.textContent = this.i18n.t(phase === "error" ? "updatesRetry" : "updatesCheck"); check.disabled = busy;
    check.addEventListener("click", () => { this.update({ ...this.state, phase: "checking" }); this.check(true); });
    actions.append(check);
    if (phase === "available") {
      const install = document.createElement("button");
      install.type = "button"; install.textContent = this.i18n.t("updatesInstall");
      install.addEventListener("click", () => { this.update({ ...this.state, phase: "updating" }); this.install(); });
      actions.append(install);
    }
    this.element.setAttribute("aria-busy", String(busy));
    this.element.replaceChildren(heading, versions, status, actions);
  }
}

import type { RuntimeI18n } from "./i18n";
import type { SidebarSortMode } from "./sidebar-tag-filter";

export class SidebarSortControl {
  readonly element = document.createElement("div");
  private readonly trigger = document.createElement("button");
  private menu: HTMLElement | null = null;

  constructor(private readonly i18n: RuntimeI18n, private readonly getMode: () => SidebarSortMode, private readonly setMode: (mode: SidebarSortMode) => void) {
    this.element.className = "codex-sidebar-order-control";
    this.trigger.type = "button";
    this.trigger.className = "codex-sidebar-order-trigger";
    this.trigger.setAttribute("aria-haspopup", "menu");
    this.trigger.addEventListener("click", () => this.menu ? this.close() : this.open());
    this.trigger.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      this.open();
      const buttons = this.buttons();
      (event.key === "ArrowUp" ? buttons.at(-1) : buttons[0])?.focus();
    });
    this.element.append(this.trigger);
    document.addEventListener("pointerdown", this.outside, true);
    this.element.addEventListener("focusout", this.focusOut);
    this.update();
  }

  get isOpen(): boolean { return this.menu !== null; }

  update(): void {
    this.trigger.textContent = this.i18n.t(this.getMode() === "tag" ? "sidebarSortTag" : "sidebarSortNative");
    this.trigger.title = this.i18n.t("sidebarSortNativeHint");
    this.trigger.setAttribute("aria-label", `${this.i18n.t("sidebarSort")}: ${this.trigger.textContent}`);
    this.trigger.setAttribute("aria-expanded", String(this.isOpen));
    this.menu?.setAttribute("aria-label", this.i18n.t("sidebarSort"));
    for (const option of this.buttons()) {
      option.textContent = this.i18n.t(option.dataset.mode === "tag" ? "sidebarSortTag" : "sidebarSortNative");
    }
  }

  dispose(): void {
    document.removeEventListener("pointerdown", this.outside, true);
    this.close();
    this.element.remove();
  }

  private buttons(): HTMLButtonElement[] { return [...(this.menu?.querySelectorAll("button") ?? [])]; }

  private open(): void {
    if (this.menu) return;
    this.menu = document.createElement("div");
    this.menu.className = "codex-sidebar-order-menu";
    this.menu.setAttribute("role", "menu");
    this.menu.setAttribute("aria-label", this.i18n.t("sidebarSort"));
    for (const mode of ["tag", "native"] as const) {
      const option = document.createElement("button");
      option.type = "button";
      option.dataset.mode = mode;
      option.setAttribute("role", "menuitemradio");
      option.setAttribute("aria-checked", String(this.getMode() === mode));
      option.textContent = this.i18n.t(mode === "tag" ? "sidebarSortTag" : "sidebarSortNative");
      option.addEventListener("click", () => { this.setMode(mode); this.close(); this.trigger.focus(); });
      this.menu.append(option);
    }
    this.menu.addEventListener("keydown", (event) => {
      const buttons = this.buttons();
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); this.close(); this.trigger.focus(); }
      else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }
    });
    this.element.append(this.menu);
    this.update();
    this.menu.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }

  private close(): void { this.menu?.remove(); this.menu = null; this.update(); }
  private readonly outside = (event: Event): void => { if (event.target instanceof Node && !this.element.contains(event.target)) this.close(); };
  private readonly focusOut = (event: FocusEvent): void => {
    if (!(event.relatedTarget instanceof Node) || !this.element.contains(event.relatedTarget)) this.close();
  };
}

import { render } from "preact";
import { registerHomeSection } from "@c0sc0s/orbit/ui";
import type { RendererContext } from "@c0sc0s/orbit/sdk";
import { RUNTIME_VERSION, unwrap } from "../shared/model.js";
import type { Result } from "../shared/model.js";
import { TodoPanel } from "./panel.js";
import { styles } from "./styles.js";
import { mountSidebarLauncher } from "./sidebar-launcher.js";
import { HomeTasks } from "./home-tasks.js";
import { homeStyles } from "./home-styles.js";

export function activate(context: RendererContext) {
  const host = document.createElement("div");
  host.id = "orbit-todo-root";
  const shadow = host.attachShadow({ mode: "open" }), style = document.createElement("style"), root = document.createElement("div");
  style.textContent = styles; shadow.append(style, root); document.body.append(host);
  context.onDispose(() => { render(null, root); host.remove(); });
  const api = async <T,>(method: string, payload?: unknown): Promise<T> => unwrap(await context.rpc.call<Result<T>>(method, payload, { signal: context.signal }));
  const subscribe = (refresh: () => void) => context.events.subscribe("changed", refresh);
  let open = false, selectionRequest: { id: string | null; sequence: number } | undefined;
  let origin: HTMLElement | null = null;
  const close = () => { open = false; update(); };
  const launcher = mountSidebarLauncher(() => { origin = launcher.element(); open = true; update(); });
  context.onDispose(launcher.dispose);
  const returnFocus = () => origin?.isConnected ? origin : launcher.element();
  const openTask = (id: string | null) => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    origin = active instanceof HTMLElement ? active : null;
    selectionRequest = { id, sequence: (selectionRequest?.sequence ?? 0) + 1 };
    open = true; update();
  };
  context.onDispose(registerHomeSection({ id: context.id, title: "待办事项", slot: "main", order: 100, mount(container, header) {
    const section = document.createElement("div"), shadow = section.attachShadow({ mode: "open" });
    const style = document.createElement("style"), content = document.createElement("div");
    style.textContent = styles + homeStyles; shadow.append(style, content); container.append(section);
    render(<HomeTasks api={api} subscribe={subscribe} openTask={openTask} header={header} />, content);
    return () => { render(null, content); section.remove(); };
  } }));
  function update() {
    launcher.setExpanded(open);
    render(<TodoPanel api={api} subscribe={subscribe} open={open} onClose={close} returnFocus={returnFocus} selectionRequest={selectionRequest} />, root);
  }
  update();
  return { isActive: () => host.isConnected, status: () => ({ version: RUNTIME_VERSION, mounted: host.isConnected, launcherMounted: Boolean(launcher.element()?.isConnected) }) };
}

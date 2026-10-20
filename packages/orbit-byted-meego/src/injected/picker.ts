import type { BugDetail, BugItem } from "../shared/model.js";
import { formatReferences, statusLabel } from "../shared/model.js";
import { element, mountBugList } from "./list-view.js";
import type { BugStore } from "./store.js";
import { styles } from "./styles.js";

export function openBugPicker(document: Document, store: BugStore, initial: BugItem | undefined, onClose: () => void) {
  const previousFocus = document.activeElement, host = element(document, "div"), shadow = host.attachShadow({ mode: "open" });
  host.dataset.orbitMeegoPicker = "true";
  const sheet = element(document, "style", "", styles), overlay = element(document, "div", "overlay"), dialog = element(document, "div", "dialog");
  dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true"); dialog.setAttribute("aria-label", "引用 Meego Bug");
  const header = element(document, "div", "header"), heading = element(document, "div"), close = element(document, "button", "close", "×");
  close.setAttribute("aria-label", "关闭 Bug 选择器");
  heading.append(element(document, "h2", "", "引用 Bug")); header.append(heading, close);
  const content = element(document, "div", "content"), listContainer = element(document, "div", "picker-list"), preview = element(document, "div", "preview");
  preview.setAttribute("role", "region"); preview.setAttribute("aria-label", "Bug 内容预览"); preview.setAttribute("aria-live", "polite");
  content.append(listContainer, preview);
  const message = element(document, "div", "message"); message.setAttribute("role", "status");
  const footer = element(document, "div", "footer"), commentLabel = element(document, "label"), comments = element(document, "input"); comments.type = "checkbox";
  commentLabel.append(comments, document.createTextNode("附带最近讨论")); commentLabel.title = "最多附带 3 条文字评论";
  const actions = element(document, "div", "footer-actions"), count = element(document, "span", "hint"), copy = element(document, "button", "primary", "复制引用");
  actions.append(count, copy); footer.append(commentLabel, actions); dialog.append(header, content, message, footer); overlay.append(dialog); shadow.append(sheet, overlay); document.body.append(host);
  const selected = new Map<string, BugItem>(initial ? [[initial.id, initial]] : []), lifetime = new AbortController();
  let active = initial ?? null, previewRequest: AbortController | null = null, busy = false, disposed = false, reference: HTMLTextAreaElement | null = null;
  const closePicker = (restore = true) => {
    if (disposed) return; disposed = true; lifetime.abort(); previewRequest?.abort(); list.dispose(); unsubscribe(); host.remove();
    if (restore && previousFocus instanceof document.defaultView!.HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    onClose();
  };
  function controls() {
    count.textContent = `已选 ${selected.size} 个`;
    copy.disabled = !selected.size || busy; comments.disabled = busy;
    listContainer.inert = busy; dialog.setAttribute("aria-busy", String(busy));
  }
  function clearReference() { reference?.remove(); reference = null; message.textContent = ""; }
  async function show(bug: BugItem | null) {
    previewRequest?.abort(); active = bug; preview.replaceChildren();
    if (!bug) { preview.append(element(document, "div", "empty", "选择 Bug 查看内容")); return; }
    const request = new AbortController(); previewRequest = request;
    preview.append(element(document, "h3", "", bug.title), element(document, "div", "meta", `${bug.projectName} · ${statusLabel(bug.status)}`));
    const body = element(document, "pre", "", "正在读取描述…"); preview.append(body);
    try {
      const detail = await store.detail(bug, comments.checked, AbortSignal.any([request.signal, lifetime.signal]));
      if (request.signal.aborted || disposed) return;
      body.textContent = detail.description || "工单没有提供可读取的文字描述，请查看原工单。";
      const metadata = element(document, "div", "meta", detail.attributes.map(item => `${item.name}：${item.value}`).join("\n")); metadata.style.whiteSpace = "pre-wrap"; body.before(metadata);
      if (detail.status !== bug.status) body.before(element(document, "div", "notice", `工单当前状态：${statusLabel(detail.status)}。列表可能尚未刷新。`));
      if (comments.checked) {
        preview.append(element(document, "div", "preview-label", "最近讨论"));
        for (const comment of detail.comments) preview.append(element(document, "div", "meta", `${comment.author} · ${comment.time}`), element(document, "pre", "", comment.body));
        if (!detail.comments.length) preview.append(element(document, "div", "meta", "没有可读取的文字评论。"));
        if (!detail.commentsComplete) preview.append(element(document, "div", "meta", "讨论仅读取了部分内容。"));
      }
    } catch { if (!request.signal.aborted && !disposed) body.textContent = "描述读取失败，请检查登录和网络后重新选择此 Bug。"; }
  }
  const list = mountBugList(listContainer, store, {
    preview: bug => { void show(bug); },
    selection: { has: id => selected.has(id), toggle(bug) {
      clearReference();
      if (selected.has(bug.id)) selected.delete(bug.id);
      else if (selected.size < 5) { selected.set(bug.id, bug); void show(bug); }
      else message.textContent = "一次最多引用 5 个 Bug。";
      list.render(); controls();
    } },
  });
  const unsubscribe = store.subscribe(() => {
    for (const id of selected.keys()) if (!store.bugs.some(bug => bug.id === id)) selected.delete(id);
    controls(); list.render();
  });
  async function generate() {
    if (busy || !selected.size) return;
    busy = true; clearReference(); controls(); message.textContent = "正在准备引用…";
    try {
      const details: BugDetail[] = [];
      for (const bug of selected.values()) details.push(await store.detail(bug, comments.checked, lifetime.signal));
      if (disposed) return;
      const text = formatReferences(details, comments.checked);
      reference = element(document, "textarea", "reference"); reference.readOnly = true; reference.value = text; reference.setAttribute("aria-label", "完整 Bug 引用"); message.after(reference);
      try { await document.defaultView!.navigator.clipboard.writeText(text); if (!disposed) message.textContent = "已复制"; }
      catch { if (!disposed) { message.textContent = "按 ⌘C 复制下方引用"; reference.focus(); reference.select(); } }
    } catch { if (!disposed) message.textContent = "读取失败，请检查登录和网络后重试。"; }
    finally { busy = false; if (!disposed) controls(); }
  }
  comments.addEventListener("change", () => { clearReference(); void show(active); });
  copy.addEventListener("click", () => { void generate(); });
  close.addEventListener("click", () => closePicker()); overlay.addEventListener("click", event => { if (event.target === overlay) closePicker(); });
  shadow.addEventListener("keydown", event => {
    if (!(event instanceof document.defaultView!.KeyboardEvent) || event.isComposing || event.defaultPrevented) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closePicker(); }
    if (event.key !== "Tab") return;
    const focusable = [...shadow.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea, a[href]')].filter(node => !node.closest("[inert]"));
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && shadow.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && shadow.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  controls(); void show(initial ?? null); list.search.focus(); void store.refresh(false);
  return () => closePicker();
}

export function controlLabel(element: HTMLElement): string {
  const labelledBy = element.getAttribute("aria-labelledby")?.split(/\s+/u).map(id => element.ownerDocument.getElementById(id)?.textContent ?? "").join(" ");
  return (labelledBy || element.getAttribute("aria-label") || element.title || element.textContent || "").replace(/\s+/gu, " ").replace(/\s*[（(]?(?:[⌘⌃⌥⇧]|(?:Ctrl|Command|Alt|Shift|Meta|Control)\+).*$/u, "").trim();
}

export function isElementVisible(element: HTMLElement): boolean {
  if (!element.isConnected || element.closest("[hidden], [inert], [aria-hidden='true']")) return false;
  const bounds = element.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0 || bounds.right <= 0 || bounds.bottom <= 0 || bounds.left >= window.innerWidth || bounds.top >= window.innerHeight) return false;
  for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
    const style = getComputedStyle(ancestor);
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return false;
  }
  return true;
}

export function isHomeControl(element: HTMLElement): boolean {
  return /^(Home|首页|主页|主頁|首頁)$/u.test(controlLabel(element));
}

export function isNewConversationControl(element: HTMLElement): boolean {
  if (element.matches(":disabled, [aria-disabled='true']")) return false;
  const label = controlLabel(element);
  return /^(?:start )?new (?:local )?(?:chat|task|conversation)(?: in .+)?$/iu.test(label)
    || /^(?:新建|新增|创建|創建|建立|新)(?:新)?(?:本地|本機)?(?:聊天|会话|对话|任务|會話|對話|任務)$/u.test(label)
    || /^在.+(?:开始|开启|创建|新建|新增|開始|開啟|建立|創建)(?:新)?(?:本地|本機)?(?:聊天|会话|对话|任务|會話|對話|任務)$/u.test(label);
}

export function findHomeControl(document: Document): HTMLElement | null {
  const mains = [...document.querySelectorAll("main, [role='main']")];
  return [...document.querySelectorAll<HTMLElement>("button, a, [role='button']")].find(element =>
    isHomeControl(element) && isElementVisible(element) && (element.closest("nav, [role='navigation']") || !mains.some(main => main.contains(element))),
  ) ?? null;
}

export function findContentRegion(document: Document): HTMLElement | null {
  const home = findHomeControl(document);
  const main = [...document.querySelectorAll<HTMLElement>("main, [role='main']")].find(element => {
    return isElementVisible(element) && !element.contains(home);
  });
  if (!main) return null;
  const bounds = main.getBoundingClientRect();
  let region = main;
  // The composer can be a sibling of main; keep the whole content column together.
  while (region.parentElement && region.parentElement !== document.body) {
    const parent = region.parentElement, rect = parent.getBoundingClientRect();
    if (parent.contains(home) || Math.abs(rect.x - bounds.x) > 2 || Math.abs(rect.width - bounds.width) > 4 || rect.height < bounds.height) break;
    region = parent;
  }
  return region;
}

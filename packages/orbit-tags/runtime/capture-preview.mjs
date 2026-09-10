import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const port = 9341;

async function command(target, method, params = {}) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  try {
    return await new Promise((resolve, reject) => {
      const id = 1;
      socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (message.id !== id) return;
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
  } finally {
    socket.close();
  }
}

const response = await fetch(`http://127.0.0.1:${port}/json/list`);
const targets = (await response.json()).filter((target) => target.type === "page" && target.url.startsWith("app://-"));
let selected = null;
for (const target of targets) {
  const result = await command(target, "Runtime.evaluate", {
    expression: "Boolean(document.getElementById('codex-sidebar-tags-toolbar'))",
    returnByValue: true,
  });
  if (result.result?.value) { selected = target; break; }
}
selected ??= targets.find((target) => target.url === "app://-/index.html") ?? targets[0];
if (!selected) throw new Error("未找到 Codex 页面");

const evidence = await command(selected, "Runtime.evaluate", {
  expression: `(() => {
    const host = document.getElementById("codex-sidebar-tags-toolbar");
    const rect = host.getBoundingClientRect();
    const style = getComputedStyle(host);
    return {
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      viewport: { width: innerWidth, height: innerHeight },
      location: location.href,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      titleCount: document.querySelectorAll("[data-thread-title]").length,
      enhancedCount: document.querySelectorAll("[data-codex-sidebar-tags-enhanced]").length,
      background: style.backgroundColor,
      foreground: style.color,
    };
  })()`,
  returnByValue: true,
});
const screenshot = await command(selected, "Page.captureScreenshot", { format: "png", fromSurface: true });
const outputDir = join(homedir(), "Library", "Application Support", "Codex Sidebar Tags", "previews");
const outputPath = join(outputDir, "sidebar-v3.png");
await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, Buffer.from(screenshot.data, "base64"));
console.log(JSON.stringify({ outputPath, evidence: evidence.result?.value }, null, 2));

import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { CodexProcess, PluginTargetRegistry } from "@c0sc0s/orbit";
import { workspaceComposer, workspaceComposerControls, selectedThreadId } from "@c0sc0s/orbit-tags/host-adapter";
import { PLUGIN_ID, RUNTIME_VERSION, localSessionIdentity, currentWorkspace } from "../dist/shared/model.js";
import { branchLabel } from "../dist/injected/view.js";
import { WorkspaceRepository } from "../dist/service/repository.js";

const argument = name => { const at = process.argv.indexOf(name); return at < 0 ? null : process.argv[at + 1]; };
const screenshot = argument("--screenshot"), toolbarScreenshot = argument("--toolbar-screenshot");
for (const path of [screenshot, toolbarScreenshot]) assert.ok(!path || isAbsolute(path), "Screenshot path must be absolute");
const owner = new CodexProcess(), registry = new PluginTargetRegistry({ ownsEndpoint: () => owner.ownsCdpEndpoint() });
const adapter = `const workspaceComposer = ${workspaceComposer.toString()}; const workspaceComposerControls = ${workspaceComposerControls.toString()}; const selectedThreadId = ${selectedThreadId.toString()};`;
let client, identity;
try {
  for (const target of await registry.discover()) {
    const candidate = await registry.client(target);
    const state = await candidate.evaluate(`(() => { ${adapter} return { visible: !document.hidden && Boolean(workspaceComposerControls()), selected: selectedThreadId(), url: location.href }; })()`);
    const resolved = localSessionIdentity(state.selected, state.url);
    if (state.visible && resolved) { client = candidate; identity = resolved; break; }
  }
  assert.ok(client && identity, "Open a local conversation with visible composer controls");
  const id = identity.id;
  const status = await client.evaluate(`window.__codexPluginLoader?.inspect(${JSON.stringify(PLUGIN_ID)})`); assert.equal(status?.version, RUNTIME_VERSION); assert.equal(status.placement, "composer");
  const repository = new WorkspaceRepository(process.env.CODEX_HOME ?? join(homedir(), ".codex"));
  const expected = id ? await repository.read(id, new AbortController().signal) : null;
  if (expected) assert.equal(expected.status, "ready");
  const selected = expected ? currentWorkspace(expected.snapshot) : null;
  const trigger = await client.evaluate(`(() => { ${adapter} const host=document.getElementById('better-work-tree-indicator'), button=document.getElementById('better-work-tree-trigger'), controls=workspaceComposerControls(); const b=button.getBoundingClientRect(); return {sessionId:host.dataset.sessionId,placement:host.parentElement===controls?.container,count:document.querySelectorAll('#better-work-tree-indicator').length,width:b.width,height:b.height,templateWidth:controls.template.getBoundingClientRect().width,text:button.textContent.trim(),x:b.x+b.width/2,y:b.y+b.height/2}; })()`);
  assert.equal(trigger.sessionId, id ?? ""); assert.equal(trigger.placement, true); assert.equal(trigger.count, 1); assert.equal(trigger.text, ""); assert.ok(trigger.width > 0); assert.ok(Math.abs(trigger.width - trigger.templateWidth) < 2);
  await client.command("Input.dispatchMouseEvent", { type: "mouseMoved", x: trigger.x, y: trigger.y });
  const observed = await client.evaluate(`(async () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const host=document.getElementById('better-work-tree-panel'), root=host?.shadowRoot;
      if (host?.dataset.sessionId===${JSON.stringify(id ?? "")} && ['ready','not-started'].includes(window.__codexPluginLoader?.inspect(${JSON.stringify(PLUGIN_ID)})?.status)) {
        const b=host.getBoundingClientRect(), trigger=document.getElementById('better-work-tree-trigger').getBoundingClientRect();
        return {directory:root.querySelector('.directory').textContent,branch:root.querySelector('.branch').textContent,mode:root.querySelector('.mode').textContent,
          count:document.querySelectorAll('#better-work-tree-panel').length,expanded:document.getElementById('better-work-tree-trigger').getAttribute('aria-expanded'),
          fits:b.width>0&&b.left>=8&&b.top>=8&&b.right<=innerWidth-8&&b.bottom<=innerHeight-8,above:b.bottom<=trigger.top-6};
      }
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    return null;
  })()`);
  assert.equal(observed?.count, 1); assert.equal(observed.expanded, "true"); assert.equal(observed.fits, true);
  assert.equal(observed.directory, selected?.directory ?? (!id ? "发送消息后显示工作目录" : (expected.snapshot.toolActivity?.directories.length ?? 0)>1 ? "多个工作目录" : "目录未知"));
  assert.equal(observed.branch, selected ? branchLabel(selected.git) : "—");
  const git = selected?.git;
  assert.equal(observed.mode, !id ? "新会话" : git?.status==="ready" ? git.worktree ? "Worktree" : "主工作副本" : git?.status==="not-git" ? "非 Git" : "工作目录");
  for (const [path, toolbar] of [[screenshot, false], [toolbarScreenshot, true]]) {
    if (!path) continue;
    const clip=await client.evaluate(`(() => { const target=${toolbar ? "document.getElementById('better-work-tree-indicator').parentElement" : "document.getElementById('better-work-tree-panel')"};const b=target.getBoundingClientRect();return{x:Math.max(0,b.left),y:Math.max(0,b.top),width:Math.min(b.width,innerWidth-b.left),height:Math.min(b.height,innerHeight-b.top),scale:1};})()`);
    const png=await client.command("Page.captureScreenshot",{format:"png",clip}); await writeFile(path,Buffer.from(png.data,"base64"));
  }
  console.log(JSON.stringify({runtimeVersion:RUNTIME_VERSION,mounted:true,placement:"composer",iconMatchesNative:true,hoverPanel:true,visibleThreadMatches:true,directoryMatches:Boolean(id),branchMatches:Boolean(id),worktreeStatusMatches:Boolean(id),pendingSession:!id,panelInsideViewport:true,panelAboveTrigger:observed.above},null,2));
} finally {
  if (client) await client.command("Input.dispatchMouseEvent",{type:"mouseMoved",x:0,y:0}).catch(()=>{});
  registry.close();
}

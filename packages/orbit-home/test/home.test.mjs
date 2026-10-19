import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { registerHomeSection } from "@c0sc0s/orbit/ui";

const source = await readFile(new URL("../runtime/injected.js", import.meta.url), "utf8");
const rect = (x, y, width, height) => ({ x, y, width, height, top:y, left:x, right:x+width, bottom:y+height, toJSON() {} });
function setup(t, { duplicateHome = false, nativePopState = false, failSave = false, saveGate } = {}) {
  const window = new Window({url:"https://host.test/chat/current"}), document = window.document;
  document.body.innerHTML = `${duplicateHome ? '<div hidden><button aria-label="Home">Home</button><main>Inactive content</main></div>' : ''}<div id="app"><aside><button id="home" aria-label="Home">Home</button><a id="chat" href="/chat/existing">Existing chat</a><button id="new-chat">New chat</button><button id="collapse">Collapse group</button></aside><div id="column"><main><h1>Native page</h1></main><form id="composer" style="display:flex" aria-hidden="false"><textarea></textarea></form></div></div>`;
  window.HTMLElement.prototype.getBoundingClientRect = function() {
    if (this.id === "column" || this.tagName === "MAIN") return rect(240,40,760,this.tagName === "MAIN"?500:680);
    return rect(0,0,1000,720);
  };
  const context = vm.createContext({ window, document, HTMLElement:window.HTMLElement, Element:window.Element, getComputedStyle:window.getComputedStyle.bind(window), ShadowRoot:window.ShadowRoot, setInterval, clearInterval,
    MutationObserver:window.MutationObserver, requestAnimationFrame:window.requestAnimationFrame.bind(window), cancelAnimationFrame:window.cancelAnimationFrame.bind(window) });
  vm.runInContext(source, context);
  const disposers = [];
  let preferences={schemaVersion:1,revision:0,displayName:"",clockVisible:true,moduleVisibility:{}};
  const subscribers=new Set();
  const instance = context.CodexPlugin.activate({id:"orbit-home",signal:new AbortController().signal,onDispose:fn=>disposers.push(fn),
    events:{subscribe(topic,handler){subscribers.add(handler);return()=>subscribers.delete(handler);}},
    rpc:{async call(method,patch){
      if(method==="getPreferences")return structuredClone(preferences);
      if(saveGate)await saveGate;
      if(failSave)throw new Error("storage unavailable");
      preferences={...preferences,revision:preferences.revision+1,...patch.displayName!==undefined?{displayName:patch.displayName}:{},...patch.clockVisible!==undefined?{clockVisible:patch.clockVisible}:{},moduleVisibility:{...preferences.moduleVisibility,...patch.module?{[patch.module.id]:patch.module.visible}:{}}};
      for(const subscriber of subscribers)subscriber(structuredClone(preferences));return structuredClone(preferences);
    }}});
  let nativeClicks = 0;
  const home = document.querySelector('#home');
  home.addEventListener("click",()=>{
    nativeClicks++;window.history.pushState({},"","/home");
    if (nativePopState) window.dispatchEvent(new window.PopStateEvent("popstate"));
  });
  document.querySelector("#chat").addEventListener("click",event=>{event.preventDefault();window.history.pushState({},"","/chat/existing");});
  t.after(async()=>{for(const dispose of disposers.splice(0).reverse()) dispose();await window.happyDOM.close();});
  const flush = ()=>window.happyDOM.whenAsyncComplete();
  return {window,document,home,flush,instance,dispose:()=>disposers.splice(0).reverse().forEach(fn=>fn()),nativeClicks:()=>nativeClicks,
    publish:value=>{preferences=value;for(const subscriber of subscribers)subscriber(value);}, subscribers,
    page:()=>document.querySelector("#orbit-home-root")?.shadowRoot?.querySelector(".orbit-home-page")};
}

test("Home preserves native navigation and shows Hello World without providers",async t=>{
  const host=setup(t);host.home.click();await host.flush();
  assert.equal(host.nativeClicks(),1);assert.equal(host.window.location.pathname,"/home");
  assert.equal(host.page().querySelector("h1").textContent,"Hello World");
  assert.equal(host.document.querySelector("#composer").style.display,"none");
  assert.equal(host.document.querySelector("#composer").inert,true);
  assert.ok(!host.document.querySelector("aside").inert);
  host.document.querySelector("#collapse").click();await host.flush();assert.ok(host.page());
  host.document.querySelector("#chat").click();await host.flush();
  assert.equal(host.page(),undefined);
  assert.equal(host.document.querySelector("#composer").style.display,"flex");
  assert.equal(host.document.querySelector("#composer").getAttribute("aria-hidden"),"false");
  assert.equal(host.document.querySelector("#composer").inert,false);
});

test("the icon settings control opens preferences and Escape returns focus",async t=>{
  const host=setup(t);host.home.click();await host.flush();
  const page=host.page(),button=page.querySelector('button[aria-label="首页设置"]'),settings=page.querySelector('#home-customization');
  assert.equal(button.textContent,"");assert.equal(settings.hidden,true);
  button.click();await host.flush();
  assert.equal(settings.hidden,false);assert.equal(button.getAttribute('aria-expanded'),"true");
  assert.equal(page.getRootNode().activeElement,settings.querySelector('input[type="text"]'));
  settings.dispatchEvent(new host.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await host.flush();
  assert.equal(settings.hidden,true);assert.equal(button.getAttribute('aria-expanded'),"false");
  assert.equal(page.getRootNode().activeElement,button);
});

test("main modules precede summaries and receive owned heading slots without remounting",async t=>{
  const host=setup(t);let mounts=0,heading;
  const main=registerHomeSection({id:"work",title:"Work",mount(node,context){mounts++;heading=context;context.summary.textContent="2";const button=host.document.createElement('button');button.textContent="Open";context.actions.append(button);node.textContent="Items";return()=>button.remove();}},host.document);
  const overview=registerHomeSection({id:"summary",title:"Summary",slot:"overview",mount(){return()=>{};}},host.document);
  t.after(main);t.after(overview);host.home.click();await host.flush();
  const page=host.page(),section=page.querySelector('[data-orbit-home-section="work"]');
  assert.equal(page.querySelector('.home-main').nextElementSibling.className,"home-overview");
  assert.equal(section.querySelector('.home-section-header h2').textContent,"Work");
  assert.equal(section.querySelector('.home-section-summary').textContent,"2");
  assert.equal(section.querySelector('.home-section-actions button').textContent,"Open");
  heading.setCompact(true);assert.ok(section.classList.contains('is-compact'));
  heading.setCompact(false);assert.equal(section.classList.contains('is-compact'),false);assert.equal(mounts,1);
  main();assert.equal(section.isConnected,false);
});

test("provider registration order, removal and Home unload preserve peer ownership",async t=>{
  const host=setup(t);let mounted=0,removed=0;
  const unregister=registerHomeSection({id:"todo",title:"Todo",mount(container){mounted++;container.textContent="Pending work";return()=>{removed++;};}},host.document);
  t.after(unregister);
  host.home.click();await host.flush();assert.ok(host.page().textContent.includes("Pending work"));
  host.home.click();await host.flush();assert.equal(mounted,1);
  unregister();await host.flush();assert.equal(host.page().querySelector("h1").textContent,"Hello World");assert.equal(removed,1);
  const second=registerHomeSection({id:"other",title:"Other",mount(container){container.textContent="Other";return()=>{removed++;};}},host.document);t.after(second);
  assert.ok(host.page().textContent.includes("Other"));
  host.dispose();assert.equal(host.page(),undefined);assert.equal(removed,2);
  assert.equal(host.document.querySelector("main").style.display,"");assert.equal(host.document.querySelector("main").hasAttribute("aria-hidden"),false);
});

test("new chat on the same route and browser back release the custom page",async t=>{
  const host=setup(t);host.home.click();await host.flush();
  host.document.querySelector("#new-chat").textContent="New chat ⌘N";
  host.document.querySelector("#new-chat").click();await host.flush();assert.equal(host.page(),undefined);
  assert.equal(host.document.querySelector("#composer").inert,false);
  host.home.click();await host.flush();
  host.window.history.pushState({},"","/chat/previous");
  host.window.dispatchEvent(new host.window.PopStateEvent("popstate"));await host.flush();assert.equal(host.page(),undefined);
  host.window.history.pushState({},"","/home");
  host.window.dispatchEvent(new host.window.PopStateEvent("popstate"));await host.flush();assert.ok(host.page());
});

for (const label of [
  "Start new chat in live_studio_mono",
  "New chat in My Project",
  "New local chat in My Project",
  "在 live_studio_mono 中开始新聊天",
  "在 我的项目 中开启新聊天",
  "在 我的项目 中新建本地聊天",
  "在「我的專案」中開始新對話",
  "在 我的專案 中新增本機對話",
  "在「工作」建立新對話",
]) test(`project-scoped creation releases Home before native handling: ${label}`,async t=>{
  const host=setup(t),button=host.document.createElement('button');button.setAttribute('aria-label',label);
  button.innerHTML='<svg viewBox="0 0 16 16"><path d="M8 2v12M2 8h12" /></svg>';
  host.document.querySelector('aside').append(button);
  let nativeCalls=0,composerReady=false;
  button.addEventListener('click',()=>{
    nativeCalls++;const composer=host.document.querySelector('#composer');
    composerReady=!composer.inert&&composer.style.display==='flex';
    composer.querySelector('textarea').focus();
  });
  host.home.click();await host.flush();const location=host.window.location.href;
  button.querySelector('path').dispatchEvent(new host.window.MouseEvent('click',{bubbles:true,button:0}));await host.flush();
  assert.equal(nativeCalls,1);assert.equal(composerReady,true);assert.equal(host.window.location.href,location);
  assert.equal(host.page(),undefined);assert.equal(host.subscribers.size,0);
  assert.equal(host.document.activeElement,host.document.querySelector('#composer textarea'));
});

test("unrelated or disabled project controls keep Home visible",async t=>{
  const host=setup(t);host.home.click();await host.flush();
  for(const [label,disabled] of [['Add new project',false],['New chat settings',false],['Start new chat in disconnected project',true]]) {
    const button=host.document.createElement('div');button.setAttribute('role','button');button.setAttribute('aria-label',label);
    if(disabled)button.setAttribute('aria-disabled','true');host.document.querySelector('aside').append(button);
    button.dispatchEvent(new host.window.MouseEvent('click',{bubbles:true,button:0}));await host.flush();assert.ok(host.page());
  }
});

test("native content replacement remounts Home without duplicate sections",async t=>{
  const host=setup(t);host.home.click();await host.flush();
  const replacement=host.document.createElement("div");replacement.id="column";replacement.innerHTML='<main>New native content</main><form id="composer"></form>';
  host.document.querySelector("#column").replaceWith(replacement);await host.flush();
  assert.equal(host.document.querySelectorAll("#orbit-home-root").length,1);
  assert.equal(host.page().querySelector("h1").textContent,"Hello World");assert.equal(replacement.querySelector("main").inert,true);
  host.dispose();assert.equal(replacement.querySelector("main").inert,false);
});

test("the clicked Home and visible content win over retained inactive controls and landmarks",async t=>{
  const host=setup(t,{duplicateHome:true});host.home.click();await host.flush();
  assert.equal(host.page()?.querySelector("h1").textContent,"Hello World");
  assert.equal(host.document.querySelector("#orbit-home-root")?.parentElement.id,"column");
  assert.equal(host.document.querySelector("[hidden] main").style.display,"");
  assert.equal(host.instance.status().visible,true);
});

test("native route events during the Home click do not cancel the requested page",async t=>{
  const host=setup(t,{nativePopState:true});host.home.click();await host.flush();
  assert.equal(host.page()?.querySelector("h1").textContent,"Hello World");
  assert.equal(host.document.querySelector("#composer").inert,true);
  host.document.querySelector("#chat").click();await host.flush();assert.equal(host.page(),undefined);
});

test("hiding a retained native pane releases Home and its original content",async t=>{
  const host=setup(t);host.home.click();await host.flush();
  host.document.querySelector("#column").setAttribute("aria-hidden","true");await host.flush();
  assert.equal(host.page(),undefined);
  assert.equal(host.instance.status().visible,false);
  assert.equal(host.document.querySelector("#composer").style.display,"flex");
});

test("visibility preferences unmount only their provider and persist when Home is reopened",async t=>{
  const host=setup(t);let mounts=0,disposals=0;
  const unregister=registerHomeSection({id:"todo",title:"Todo",mount(node){mounts++;node.textContent="Pending";return()=>{disposals++;};}},host.document);t.after(unregister);
  host.home.click();await host.flush();assert.equal(mounts,1);
  const checkbox=()=>[...host.page().querySelectorAll('.home-module-option')].find(label=>label.textContent==="Todo").querySelector('input');
  checkbox().click();await host.flush();assert.equal(disposals,1);assert.equal(host.page().querySelector('[data-orbit-home-section="todo"]'),null);
  host.document.querySelector('#new-chat').click();await host.flush();assert.equal(host.subscribers.size,0);
  host.home.click();await host.flush();assert.equal(mounts,1);assert.equal(checkbox().checked,false);
  checkbox().click();await host.flush();assert.equal(mounts,2);
});

test("cross-window settings update greeting and clock without resetting provider state",async t=>{
  const host=setup(t);let mounts=0;
  const unregister=registerHomeSection({id:"todo",title:"Todo",mount(){mounts++;return()=>{};}},host.document);t.after(unregister);
  host.home.click();await host.flush();
  host.publish({schemaVersion:1,revision:2,displayName:"Ian",clockVisible:false,moduleVisibility:{}});await host.flush();
  assert.equal(host.page().querySelector('h1').textContent,"Hello, Ian");assert.equal(host.page().querySelector('.home-clock').hidden,true);assert.equal(mounts,1);
  host.publish({schemaVersion:1,revision:1,displayName:"Old",clockVisible:true,moduleVisibility:{}});await host.flush();
  assert.equal(host.page().querySelector('h1').textContent,"Hello, Ian");
});

test("a failed preference write restores the checkbox and leaves its provider mounted",async t=>{
  const host=setup(t,{failSave:true});
  const unregister=registerHomeSection({id:"todo",title:"Todo",mount(){return()=>{};}},host.document);t.after(unregister);
  host.home.click();await host.flush();
  const checkbox=[...host.page().querySelectorAll('.home-module-option')].find(label=>label.textContent==="Todo").querySelector('input');
  checkbox.click();await host.flush();assert.equal(checkbox.checked,true);assert.ok(host.page().querySelector('[data-orbit-home-section="todo"]'));
  assert.equal(host.page().querySelector('.home-notice').hidden,false);
});

test("a visibility toggle responds immediately while its write is pending",async t=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});
  const host=setup(t,{saveGate:gate});
  const unregister=registerHomeSection({id:"todo",title:"Todo",mount(){return()=>{};}},host.document);t.after(unregister);
  host.home.click();await host.flush();
  const checkbox=[...host.page().querySelectorAll('.home-module-option')].find(label=>label.textContent==="Todo").querySelector('input');
  checkbox.click();assert.equal(checkbox.checked,false);assert.equal(host.page().querySelector('[data-orbit-home-section="todo"]'),null);
  release();await gate;await host.flush();assert.equal(checkbox.checked,false);assert.equal(checkbox.disabled,false);
});

test("provider mount and cleanup failures stay local and leave the Home core available",async t=>{
  const host=setup(t);
  const bad=registerHomeSection({id:"bad",title:"Bad",mount(){throw new Error("private payload");}},host.document);t.after(bad);
  const good=registerHomeSection({id:"good",title:"Good",mount(node){node.textContent="Available";return()=>{throw new Error("cleanup");};}},host.document);t.after(good);
  host.home.click();await host.flush();assert.equal(host.page().querySelector('h1').textContent,"Hello World");
  assert.ok(host.page().textContent.includes("Available"));assert.equal(host.page().textContent.includes("private payload"),false);
  assert.deepEqual(JSON.parse(JSON.stringify(host.instance.status().lastError)),{id:"bad",phase:"mount"});
  good();await host.flush();assert.deepEqual(JSON.parse(JSON.stringify(host.instance.status().lastError)),{id:"good",phase:"dispose"});
});

test("layout slots and opt-in defaults work for plugins registered after Home",async t=>{
  const host=setup(t);host.home.click();await host.flush();let mounts=0;
  const main=registerHomeSection({id:"main",title:"Main",slot:"main",mount(){return()=>{};}},host.document);t.after(main);
  const overview=registerHomeSection({id:"overview",title:"Overview",slot:"overview",defaultVisible:false,mount(){mounts++;return()=>{};}},host.document);t.after(overview);
  assert.equal(mounts,0);assert.equal(host.page().querySelector('.home-overview').hidden,true);
  [...host.page().querySelectorAll('.home-module-option')].find(label=>label.textContent==="Overview").querySelector('input').click();await host.flush();
  assert.equal(mounts,1);assert.equal(host.page().querySelector('.home-overview section').dataset.orbitHomeSection,"overview");
  assert.equal(host.page().querySelector('.home-main section').dataset.orbitHomeSection,"main");
});

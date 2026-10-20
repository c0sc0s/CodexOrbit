import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { getHomeSections } from "@c0sc0s/orbit/ui";
import { activateFeedView } from "../dist/injected/feed-view.js";

const item={id:'1',title:'<img src="https://example.test/private">Example',status:'OPEN',details:['Example project'],url:'https://example.test/item/1'};
const state=(revision,changes={})=>({generation:'test',revision,items:[item],complete:true,updatedAt:Date.now(),refreshing:false,error:null,...changes});
async function setup(t, initial=state(1)) {
  const window=new Window(),document=window.document,old=globalThis.document;
  globalThis.document=document;
  const handlers=new Set(),disposers=[],calls=[];
  let snapshot=initial;
  const instance=activateFeedView({id:'example',signal:new AbortController().signal,onDispose:fn=>disposers.push(fn),
    events:{subscribe:(topic,fn)=>{handlers.add(fn);return()=>handlers.delete(fn);}},
    rpc:{call:async method=>{calls.push(method);return structuredClone(snapshot);}}},
    {title:'Example feed',empty:'No items',order:200,homeUrl:'https://example.test/',hosts:['example.test'],loginCommand:'example login',runtimeVersion:'0.1.0'});
  const container=document.createElement('div'),summary=document.createElement('span'),actions=document.createElement('div');
  document.body.append(container,summary,actions);
  const compact=[],disposeView=getHomeSections(document)[0].mount(container,{summary,actions,setCompact:value=>compact.push(value)});
  const flush=()=>new Promise(resolve=>setImmediate(resolve));await flush();
  const dispose=()=>{disposeView();disposers.splice(0).reverse().forEach(fn=>fn());};
  t.after(async()=>{dispose();globalThis.document=old;await window.happyDOM.close();});
  return {document,container,summary,actions,handlers,calls,compact,instance,dispose,flush,
    body:()=>container.firstElementChild?.shadowRoot,
    publish:value=>{snapshot=value;for(const handler of handlers)handler(structuredClone(value));}};
}
test("feed renders text and allowed links without remote assets or HTML interpretation",async t=>{
  const host=await setup(t);
  assert.equal(host.body().querySelectorAll('img').length,0);
  assert.equal(host.body().querySelector('.feed-name').textContent,item.title);
  const link=host.body().querySelector('.feed-link');assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');
  assert.equal(host.summary.textContent,'1');assert.equal(host.body().querySelector('time').dateTime.length>0,true);
  host.publish(state(2,{complete:false}));assert.equal(host.summary.textContent,'1+');assert.match(host.body().textContent,/部分结果/);
});
test("authentication and offline states preserve rows; empty success becomes compact",async t=>{
  const host=await setup(t);
  host.publish(state(2,{error:'auth'}));assert.match(host.body().textContent,/example login/);assert.equal(host.body().querySelectorAll('li').length,1);
  host.publish(state(3,{items:[],error:null}));assert.equal(host.body().querySelector('.feed-empty').textContent,'No items');assert.equal(host.compact.at(-1),true);
  host.publish(state(4,{refreshing:true}));assert.equal(host.actions.querySelector('button').disabled,true);
});
test("stale replies and unsafe URLs cannot replace confirmed data; unmount cleans its slots",async t=>{
  const host=await setup(t,state(3));
  host.publish(state(2,{items:[]}));assert.equal(host.summary.textContent,'1');
  host.publish(state(4,{items:[{...item,url:'javascript:alert(1)'}]}));assert.equal(host.body().querySelector('.feed-link').href,item.url);
  assert.match(host.body().textContent,/服务暂不可用/);
  host.actions.querySelector('button').click();await host.flush();assert.ok(host.calls.includes('refreshFeed'));
  host.dispose();assert.equal(host.container.children.length,0);assert.equal(host.actions.children.length,0);assert.equal(host.summary.children.length,0);assert.equal(host.handlers.size,0);
  assert.deepEqual(getHomeSections(host.document),[]);
});
test("both generated plugin bundles register independent sections without private host selectors",async t=>{
  const window=new Window(),document=window.document,disposers=[];
  t.after(async()=>{disposers.reverse().forEach(fn=>fn());await window.happyDOM.close();});
  const context=vm.createContext({window,document,URL});
  for(const plugin of ['meego','libra']) {
    const root=new URL(`../../orbit-byted-${plugin}/`,import.meta.url);
    vm.runInContext(await readFile(new URL('runtime/injected.js',root),'utf8'),context);
    const manifest=JSON.parse(await readFile(new URL('orbit-plugin.json',root),'utf8'));
    const instance=context.CodexPlugin.activate({id:manifest.id,config:{},signal:new AbortController().signal,onDispose:fn=>disposers.push(fn),events:{subscribe:()=>()=>{}},rpc:{call:async()=>state(1)}});
    assert.equal(instance.status().version,manifest.runtimeVersion);
  }
  assert.deepEqual(getHomeSections(document).map(section=>section.id),['orbit-byted-meego.list','orbit-byted-libra.list']);
});

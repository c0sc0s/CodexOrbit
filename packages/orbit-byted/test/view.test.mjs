import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { getHomeSections } from "@c0sc0s/orbit/ui";
import { activateFeedView } from "../dist/injected/feed-view.js";

const item={id:'1',title:'<img src="https://example.test/private">Example',status:'OPEN',details:['Example project'],url:'https://example.test/item/1'};
const state=(revision,changes={})=>({generation:'test',revision,items:[item],complete:true,updatedAt:Date.now(),refreshing:false,error:null,...changes});
async function setup(t, initial=state(1), options={}, respond) {
  const window=new Window(),document=window.document,old=globalThis.document;
  globalThis.document=document;
  const handlers=new Set(),disposers=[],calls=[],requests=[];
  let snapshot=initial;
  const instance=activateFeedView({id:'example',signal:new AbortController().signal,onDispose:fn=>disposers.push(fn),
    events:{subscribe:(topic,fn)=>{handlers.add(fn);return()=>handlers.delete(fn);}},
    rpc:{call:async (method,input)=>{calls.push(method);requests.push({method,input});return respond ? respond(method,input) : structuredClone(snapshot);}}},
    {title:'Example feed',empty:'No items',order:200,homeUrl:'https://example.test/',hosts:['example.test'],loginCommand:'example login',runtimeVersion:'0.1.0',...options});
  const container=document.createElement('div'),summary=document.createElement('span'),actions=document.createElement('div');
  document.body.append(container,summary,actions);
  const compact=[],disposeView=getHomeSections(document)[0].mount(container,{summary,actions,setCompact:value=>compact.push(value)});
  const flush=()=>new Promise(resolve=>setImmediate(resolve));await flush();
  const dispose=()=>{disposeView();disposers.splice(0).reverse().forEach(fn=>fn());};
  t.after(async()=>{dispose();globalThis.document=old;await window.happyDOM.close();});
  return {document,container,summary,actions,handlers,calls,requests,compact,instance,dispose,flush,
    body:()=>container.firstElementChild?.shadowRoot,
    controls:()=>actions.firstElementChild?.shadowRoot,
    publish:value=>{snapshot=value;for(const handler of handlers)handler(structuredClone(value));}};
}
test("feed renders text and allowed links without remote assets or HTML interpretation",async t=>{
  const host=await setup(t);
  assert.equal(host.body().querySelectorAll('img').length,0);
  assert.equal(host.body().querySelector('.feed-name').textContent,item.title);
  const link=host.body().querySelector('.feed-link');assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');
  assert.equal(host.summary.textContent,'1');assert.equal(host.controls().querySelector('time').dateTime.length>0,true);
  assert.equal(host.body().querySelector('.feed-remove'),null);
  host.publish(state(2,{complete:false}));assert.equal(host.summary.textContent,'1+');assert.match(host.body().textContent,/部分结果/);
});
test("delete has its own button and waits for the service before removing the row",async t=>{
  let finish;
  const host=await setup(t,state(1),{dismissible:true},method=>method==='dismissFeedItem'
    ?new Promise(resolve=>{finish=resolve;}) :state(1));
  const button=host.body().querySelector('.feed-remove'),link=host.body().querySelector('.feed-link');
  assert.equal(button.closest('a'),null);assert.match(button.getAttribute('aria-label'),/删除/);
  let navigated=false;link.addEventListener('click',()=>{navigated=true;});button.click();button.click();
  assert.equal(navigated,false);assert.equal(button.disabled,true);assert.equal(button.getAttribute('aria-busy'),'true');assert.equal(button.querySelectorAll('svg').length,1);
  assert.deepEqual(host.requests.filter(request=>request.method==='dismissFeedItem'),[{method:'dismissFeedItem',input:{id:'1'}}]);
  host.publish(state(2,{refreshing:true}));assert.equal(host.body().querySelector('.feed-remove').disabled,true);
  finish(state(3,{items:[]}));await host.flush();
  assert.equal(host.body().querySelectorAll('li').length,0);assert.equal(host.summary.textContent,'0');
  assert.equal(host.compact.at(-1),true);assert.equal(host.body().querySelector('.feed-empty').textContent,'No items');
});
test("delete failure preserves rows and allows retry",async t=>{
  let fail=true;
  const host=await setup(t,state(1),{dismissible:true},method=>{
    if(method!=='dismissFeedItem')return state(1);
    if(fail)throw new Error('Storage unavailable');return state(2,{items:[]});
  });
  host.body().querySelector('.feed-remove').click();await host.flush();
  assert.match(host.body().querySelector('[role=status]').textContent,/删除失败/);
  assert.equal(host.body().querySelectorAll('li').length,1);assert.equal(host.body().querySelector('.feed-remove').disabled,false);
  fail=false;host.body().querySelector('.feed-remove').click();await host.flush();
  assert.equal(host.body().querySelectorAll('li').length,0);assert.equal(host.body().querySelector('[role=status]').textContent,'');
});
test("allocation meters show exact percentages and reject invalid values from the service",async t=>{
  const items=[0,12.5,50,100].map((value,index)=>({...item,id:String(index),meter:{label:'流量',value}}));
  const host=await setup(t,state(1,{items}));
  const meters=[...host.body().querySelectorAll('[role=meter]')];
  assert.deepEqual(meters.map(meter=>meter.getAttribute('aria-valuenow')),['0','12.5','50','100']);
  assert.deepEqual(meters.map(meter=>meter.querySelector('.feed-meter-fill').style.width),['0%','12.5%','50%','100%']);
  assert.deepEqual(meters.map(meter=>meter.textContent),['流量 0%','流量 12.5%','流量 50%','流量 100%']);
  for(const value of [-1,101,NaN,Infinity,'50'])host.publish(state(2,{items:[{...item,meter:{label:'流量',value}}]}));
  assert.equal(host.body().querySelectorAll('[role=meter]').length,4);
  assert.match(host.body().querySelector('[role=status]').textContent,/服务暂不可用/);
});
test("authentication and offline states preserve rows; empty success becomes compact",async t=>{
  const host=await setup(t);
  host.publish(state(2,{error:'auth'}));assert.match(host.body().textContent,/example login/);assert.equal(host.body().querySelectorAll('li').length,1);
  host.publish(state(3,{items:[],error:null}));assert.equal(host.body().querySelector('.feed-empty').textContent,'No items');assert.equal(host.compact.at(-1),true);
  host.publish(state(4,{refreshing:true}));assert.equal(host.controls().querySelector('button').disabled,true);
});
test("stale replies and unsafe URLs cannot replace confirmed data; unmount cleans its slots",async t=>{
  const host=await setup(t,state(3));
  host.publish(state(2,{items:[]}));assert.equal(host.summary.textContent,'1');
  host.publish(state(4,{items:[{...item,url:'javascript:alert(1)'}]}));assert.equal(host.body().querySelector('.feed-link').href,item.url);
  assert.match(host.body().textContent,/服务暂不可用/);
  host.controls().querySelector('button').click();await host.flush();assert.ok(host.calls.includes('refreshFeed'));
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

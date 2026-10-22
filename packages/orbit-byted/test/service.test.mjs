import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { activateFeed } from "../dist/service/feed-service.js";
import { FeedFailure } from "../dist/service/cli.js";

const item={id:'1',title:'Example issue',status:'OPEN',details:['Example'],url:'https://example.test/item/1'};
async function setup(t, load, cache, config={}, source={}) {
  const stateDirectory=await mkdtemp(join(tmpdir(),'orbit-byted-feed-')),handlers=new Map(),events=[],disposers=[];
  t.after(()=>rm(stateDirectory,{recursive:true,force:true}));
  if(cache)await writeFile(join(stateDirectory,'feed.json'),JSON.stringify(cache));
  const context={stateDirectory,id:'test',config,signal:new AbortController().signal,onDispose:fn=>disposers.push(fn),
    rpc:{handle:(method,fn)=>handlers.set(method,fn)},events:{publish:(topic,payload)=>events.push(structuredClone(payload))}};
  const feed=activateFeed(context,{key:'example',hosts:['example.test'],load,...source});
  const dispose=()=>disposers.splice(0).reverse().forEach(fn=>fn());t.after(dispose);
  return {feed,handlers,events,stateDirectory,dispose};
}
test("initial RPC and repeated refresh return immediately while a single query runs",async t=>{
  let release,calls=0;const gate=new Promise(resolve=>release=resolve);
  const host=await setup(t,async()=>{calls++;await gate;return{items:[item],complete:true};});
  await host.feed.ready;
  const snapshot=await host.handlers.get('getFeed')();assert.equal(snapshot.refreshing,true);
  await host.handlers.get('refreshFeed')();await host.handlers.get('refreshFeed')();assert.equal(calls,1);
  release();await host.feed.settled();assert.equal(host.feed.snapshot().items.length,1);assert.equal(host.feed.snapshot().refreshing,false);
  const cache=JSON.parse(await readFile(join(host.stateDirectory,'feed.json'),'utf8'));
  assert.deepEqual(cache.items,[item]);assert.equal(cache.schemaVersion,1);
  assert.equal((await stat(join(host.stateDirectory,'feed.json'))).mode&0o777,0o600);
});
test("offline login failure preserves cache and successful empty refresh replaces it",async t=>{
  let fail=true;
  const host=await setup(t,async()=>{if(fail)throw new FeedFailure('auth');return{items:[],complete:true};},
    {schemaVersion:1,source:'example',updatedAt:1000,items:[item],complete:true});
  await host.feed.settled();assert.equal(host.feed.snapshot().error,'auth');assert.deepEqual(host.feed.snapshot().items,[item]);
  fail=false;await host.handlers.get('refreshFeed')();await host.feed.settled();
  assert.deepEqual(host.feed.snapshot().items,[]);assert.equal(host.feed.snapshot().error,null);
  assert.deepEqual(JSON.parse(await readFile(join(host.stateDirectory,'feed.json'),'utf8')).items,[]);
});
test("a cache from another scope is ignored and unload aborts without publishing",async t=>{
  let aborted=false;
  const host=await setup(t,signal=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(signal.reason);})),
    {schemaVersion:1,source:'other-account-scope',updatedAt:1000,items:[item],complete:true});
  await host.feed.ready;assert.deepEqual(host.feed.snapshot().items,[]);
  const count=host.events.length;host.dispose();await host.feed.settled();assert.equal(aborted,true);assert.equal(host.events.length,count);
});
test("malformed fresh results cannot erase a valid cache",async t=>{
  const host=await setup(t,async()=>({items:[{...item,url:'javascript:alert(1)'}],complete:true}),
    {schemaVersion:1,source:'example',updatedAt:1000,items:[item],complete:true});
  await host.feed.settled();assert.deepEqual(host.feed.snapshot().items,[item]);assert.equal(host.feed.snapshot().error,'data');
});
test("large Unicode lists fit the RPC reply limit and are visibly partial",async t=>{
  const items=Array.from({length:500},(_,index)=>({...item,id:String(index),title:'中'.repeat(512),details:['文'.repeat(200),'文'.repeat(200)]}));
  const host=await setup(t,async()=>({items,complete:true}));
  await host.feed.settled();
  const snapshot=host.feed.snapshot();
  assert.equal(snapshot.error,null);assert.equal(snapshot.complete,false);assert.ok(snapshot.items.length<500);
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot))<1024*1024);
});
test("managed installations use the plugin-owned data directory",async t=>{
  const dataDirectory=await mkdtemp(join(tmpdir(),'orbit-byted-owned-'));t.after(()=>rm(dataDirectory,{recursive:true,force:true}));
  const host=await setup(t,async()=>({items:[item],complete:true}),undefined,{dataDirectory});
  await host.feed.settled();
  assert.equal(JSON.parse(await readFile(join(dataDirectory,'feed.json'),'utf8')).items.length,1);
  await assert.rejects(readFile(join(host.stateDirectory,'feed.json')),{code:'ENOENT'});
});
test("dismissal survives refresh, offline restart and a fresh query without changing the source",async t=>{
  let calls=0;
  const other={...item,id:'2'},load=async()=>{calls++;return{items:[item,other],complete:true};};
  const host=await setup(t,load,undefined,{}, {dismissible:true});await host.feed.settled();
  const removed=await host.handlers.get('dismissFeedItem')({id:'1'});
  assert.deepEqual(removed.items,[other]);assert.equal(calls,1);assert.deepEqual(host.events.at(-1),removed);
  await host.handlers.get('refreshFeed')();await host.feed.settled();
  assert.deepEqual(host.feed.snapshot().items,[other]);assert.equal(calls,2);
  const cache=JSON.parse(await readFile(join(host.stateDirectory,'feed.json'),'utf8'));
  assert.deepEqual(cache.dismissedIds,['1']);host.dispose();
  const restarted=await setup(t,async()=>{throw new FeedFailure('network');},cache,{}, {dismissible:true});
  await restarted.feed.settled();assert.deepEqual(restarted.feed.snapshot().items,[other]);
  const fresh=await setup(t,load,cache,{}, {dismissible:true});await fresh.feed.settled();
  assert.deepEqual(fresh.feed.snapshot().items,[other]);
});
test("dismissals serialize with each other and an in-flight refresh",async t=>{
  const other={...item,id:'2'};let release;
  const host=await setup(t,async()=>({items:[item,other],complete:true}),undefined,{}, {dismissible:true});
  await host.feed.settled();
  await Promise.all([host.handlers.get('dismissFeedItem')({id:'1'}),host.handlers.get('dismissFeedItem')({id:'2'})]);
  assert.deepEqual(host.feed.snapshot().items,[]);
  assert.deepEqual(JSON.parse(await readFile(join(host.stateDirectory,'feed.json'),'utf8')).dismissedIds,['1','2']);
  const cached=JSON.parse(await readFile(join(host.stateDirectory,'feed.json'),'utf8'));
  const refreshing=await setup(t,()=>new Promise(resolve=>{release=resolve;}),{...cached,items:[item,other],dismissedIds:[]},{}, {dismissible:true});
  await refreshing.feed.ready;
  await refreshing.handlers.get('dismissFeedItem')({id:'1'});
  release({items:[item,other],complete:true});await refreshing.feed.settled();
  assert.deepEqual(refreshing.feed.snapshot().items,[other]);
});
test("failed dismissal keeps the row and can be retried; unknown IDs are rejected",async t=>{
  const host=await setup(t,async()=>({items:[item],complete:true}),undefined,{}, {dismissible:true});
  await host.feed.settled();
  const dismiss=host.handlers.get('dismissFeedItem'),cachePath=join(host.stateDirectory,'feed.json');
  for(const input of [null,{}, {id:7},{id:''},{id:'2'},{id:'1',extra:true}]) await assert.rejects(dismiss(input));
  await rm(cachePath);await mkdir(cachePath);
  await assert.rejects(dismiss({id:'1'}));assert.deepEqual(host.feed.snapshot().items,[item]);
  await rm(cachePath,{recursive:true});
  await dismiss({id:'1'});assert.deepEqual(host.feed.snapshot().items,[]);
  const revision=host.feed.snapshot().revision;
  await dismiss({id:'1'});assert.equal(host.feed.snapshot().revision,revision);
});
test("dismissal is opt-in and cache deletions stay within their source scope",async t=>{
  const cache={schemaVersion:1,source:'other',updatedAt:1000,items:[],complete:true,dismissedIds:['1']};
  const host=await setup(t,async()=>({items:[item],complete:true}),cache,{}, {dismissible:true});
  await host.feed.settled();assert.deepEqual(host.feed.snapshot().items,[item]);
  const readonly=await setup(t,async()=>({items:[item],complete:true}));
  await readonly.feed.settled();assert.equal(readonly.handlers.has('dismissFeedItem'),false);
});

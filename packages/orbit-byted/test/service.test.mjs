import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { activateFeed } from "../dist/service/feed-service.js";
import { FeedFailure } from "../dist/service/cli.js";

const item={id:'1',title:'Example issue',status:'OPEN',details:['Example'],url:'https://example.test/item/1'};
async function setup(t, load, cache, config={}) {
  const stateDirectory=await mkdtemp(join(tmpdir(),'orbit-byted-feed-')),handlers=new Map(),events=[],disposers=[];
  t.after(()=>rm(stateDirectory,{recursive:true,force:true}));
  if(cache)await writeFile(join(stateDirectory,'feed.json'),JSON.stringify(cache));
  const context={stateDirectory,id:'test',config,signal:new AbortController().signal,onDispose:fn=>disposers.push(fn),
    rpc:{handle:(method,fn)=>handlers.set(method,fn)},events:{publish:(topic,payload)=>events.push(structuredClone(payload))}};
  const feed=activateFeed(context,{key:'example',hosts:['example.test'],load});
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

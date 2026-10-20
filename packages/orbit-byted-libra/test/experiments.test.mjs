import assert from "node:assert/strict";
import test from "node:test";
import { experimentSource } from "../dist/service/experiments.js";

const row=id=>({id,name:`Example experiment ${id}`,status:1,app_name:'Example app',version_resource:.125,end_time:1800000000});
const signal=()=>new AbortController().signal;
test("Libra pages beyond a CLI total that only counts the current page",async()=>{
  const calls=[];
  const result=await experimentSource(async args=>{calls.push(args);return{experiments:calls.length===1?Array.from({length:50},(_,i)=>row(i+1)):[row(50),{...row(51),status:39}],total:50};},{}).load(signal());
  assert.equal(calls.length,2);assert.equal(calls[0][1],'i18n-tt');assert.ok(calls[0].includes('my'));assert.equal(calls[1].at(-3),'2');
  assert.equal(result.items.length,51);assert.equal(result.complete,true);assert.equal(result.items.at(-1).status,'已冻结');
  assert.ok(result.items[0].details.includes('流量 12.5%'));assert.match(result.items[0].url,/^https:\/\/libra-sg\.tiktok-row\.net\/libra\/flight\/1\/report\/main$/);
});
test("site and app configuration is validated and changes cache identity",async()=>{
  const query=async()=>({experiments:[]});
  assert.equal((await experimentSource(query,{site:'cn',appId:42}).load(signal())).complete,true);
  assert.notEqual(experimentSource(query,{}).key,experimentSource(query,{site:'cn'}).key);
  assert.throws(()=>experimentSource(query,{site:'unknown'}),/Unsupported/);
  assert.throws(()=>experimentSource(query,{appId:0}),/Invalid appId/);
  await assert.rejects(experimentSource(async()=>({}),{}).load(signal()),/Invalid experiment/);
});
test("item cap is explicit and unsafe numeric IDs are rejected",async()=>{
  let calls=0;
  const result=await experimentSource(async()=>({experiments:Array.from({length:50},(_,i)=>row(++calls))}),{}).load(signal());
  assert.equal(result.items.length,500);assert.equal(result.complete,false);
  await assert.rejects(experimentSource(async()=>({experiments:[row(Number.MAX_SAFE_INTEGER+1)]}),{}).load(signal()),/Invalid identifier/);
});

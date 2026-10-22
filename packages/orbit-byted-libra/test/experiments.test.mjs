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
  assert.deepEqual(result.items[0].meter,{label:'流量',value:12.5});assert.match(result.items[0].url,/^https:\/\/libra-sg\.tiktok-row\.net\/libra\/flight\/1\/report\/main$/);
});
test("ended-only pages do not hide unfinished experiments on later pages",async()=>{
  let calls=0;
  const result=await experimentSource(async()=>({experiments:++calls===1
    ?Array.from({length:50},(_,i)=>({...row(i+1),status:i%2===0?0:'0'}))
    :[{...row(51),status:'0'},row(52),{...row(53),status:5},{...row(54),status:999}]}),{}).load(signal());
  assert.equal(calls,2);assert.equal(result.complete,true);
  assert.deepEqual(result.items.map(item=>[item.id,item.status]),[['52','运行中'],['53','待结束'],['54','未知状态']]);
});
test("site and app configuration is validated and changes cache identity",async()=>{
  const query=async()=>({experiments:[]});
  assert.equal(experimentSource(query,{}).dismissible,true);
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
test("traffic percentages preserve zero, fractions and full allocation while invalid values stay unknown",async()=>{
  const values=[0,.125,.5,1,-.1,1.01,null,'0.5',NaN];
  const result=await experimentSource(async()=>({experiments:values.map((value,index)=>({...row(index+1),version_resource:value}))}),{}).load(signal());
  assert.deepEqual(result.items.map(item=>item.meter?.value),[0,12.5,50,100,undefined,undefined,undefined,undefined,undefined]);
  assert.ok(result.items.every(item=>!item.details.some(detail=>detail.startsWith('流量'))));
});

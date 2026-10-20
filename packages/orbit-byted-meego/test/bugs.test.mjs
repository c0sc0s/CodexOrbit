import assert from "node:assert/strict";
import test from "node:test";
import { bugSource } from "../dist/service/bugs.js";

const row=(id,type='issue',status='OPEN',project='example')=>({work_item_info:{work_item_id:id,work_item_type_key:type,work_item_name:`Example ${id}`},project_key:project,project_name:'Example project',state_info:{start_state_key_name:status}});
const signal=()=>new AbortController().signal;
test("cross-space personal work is fully paged before selecting open bugs",async()=>{
  const calls=[];
  const source=bugSource(async args=>{calls.push(args);return{list:calls.length===1?Array.from({length:50},(_,i)=>row(i+1,'story')):[row(51),row(51),row(52,'issue','CLOSED'),row(53,'issue','IN PROGRESS','other')]};},{});
  const result=await source.load(signal());
  assert.equal(calls.length,2);assert.ok(calls.every(args=>args.includes('all')));assert.equal(calls[1].at(-1),'2');
  assert.equal(result.complete,true);assert.deepEqual(result.items.map(item=>item.id),['other:53','example:51']);
  assert.equal(result.items[0].url,'https://meego.larkoffice.com/other/issue/detail/53');
});
test("space filters, empty lists and schema failures stay distinct",async()=>{
  const query=async()=>({list:[row(1),row(2,'issue','REJECT'),row(3,'issue','OPEN','other')]});
  assert.deepEqual((await bugSource(query,{projectKeys:['example']}).load(signal())).items.map(item=>item.id),['example:1']);
  assert.deepEqual(await bugSource(query,{projectKeys:[]}).load(signal()),{items:[],complete:true});
  await assert.rejects(bugSource(async()=>({}),{}).load(signal()),/Invalid todo/);
  assert.throws(()=>bugSource(query,{projectKeys:['../bad']}),/Invalid projectKeys/);
});
test("page cap is reported as partial even when every item is a story",async()=>{
  let calls=0;
  const result=await bugSource(async()=>{calls++;return{list:Array.from({length:50},(_,i)=>row(i+1,'story'))};},{}).load(signal());
  assert.equal(calls,20);assert.equal(result.complete,false);assert.equal(result.items.length,0);
});
test("only the two actionable statuses survive personal pending-work noise",async()=>{
  const statuses=['OPEN','IN PROGRESS','CLOSED','RESOLVED','REOPENED','REJECT','UNKNOWN','', ' open '];
  const result=await bugSource(async()=>({list:statuses.map((status,index)=>row(index+1,'issue',status))}),{}).load(signal());
  assert.deepEqual(result.items.map(item=>[item.workItemId,item.status]),[['2','IN PROGRESS'],['1','OPEN'],['9','OPEN']]);
  assert.equal(result.items[0].projectKey,'example');assert.equal(result.items[0].projectName,'Example project');
});
test("official MCP wrappers expose structured data or JSON text without tool metadata",async()=>{
  const payload={list:[row(42)]};
  for(const result of [
    {structuredContent:payload,content:[]},
    {content:[{type:'text',text:JSON.stringify(payload)},{type:'text',text:'log_id: example'}]},
  ]) {
    const source=bugSource(async()=>({endpoint:'https://example.test',tool:{name:'list_todo'},arguments:{},result}),{});
    const output=await source.load(signal());assert.equal(output.items.length,1);assert.equal(output.items[0].id,'example:42');
    assert.equal(JSON.stringify(output).includes('list_todo'),false);
  }
  await assert.rejects(bugSource(async()=>({result:{isError:true,content:[{type:'text',text:'unauthenticated secret'}]}}),{}).load(signal()),error=>error.code==='auth'&&!error.message.includes('secret'));
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nativeConfig } from '../dist/service/mentions.js';

test('native mention protocol advertises read-only search, resolves only personal Bugs and attaches full content',async t=>{
  const root=await mkdtemp(join(tmpdir(),'meego-mentions-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const cli=join(root,'bytedcli'),directory=join(root,'data');await mkdir(directory);
  await writeFile(cli,`#!${process.execPath}
const args=process.argv.slice(2);if(!args.includes('--no-auto-upgrade'))process.exit(1);
const row=(id,project,status)=>({work_item_info:{work_item_id:id,work_item_type_key:'issue',work_item_name:'Bug '+id},project_key:project,project_name:project,state_info:{start_state_key_name:status}});
const data=args.includes('workitem')?{work_item_attribute:{work_item_name:'Bug 42',work_item_status:{name:'OPEN'}},work_item_fields:[{key:'description',name:'Description',value:'Steps: click save. Expected: saved.'}]}:{list:[row(42,'example','OPEN'),row(43,'other','IN PROGRESS'),row(44,'example','CLOSED')]};setTimeout(()=>console.log(JSON.stringify({status:'success',data})),200);
`,{mode:0o700});
  await writeFile(join(root,'loader.json'),JSON.stringify({plugins:[{id:'orbit-byted-meego',enabled:true,config:{cliPath:cli,dataDirectory:directory}}]}));
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,ORBIT_HOME:root,ORBIT_ROOT:join(root,'unused')},stdio:['pipe','pipe','pipe']});
  const pending=new Map();let next=0;const lines=createInterface({input:child.stdout});lines.on('line',line=>{const value=JSON.parse(line);if(value.id!==undefined){pending.get(value.id)?.(value);pending.delete(value.id);}});
  t.after(()=>{lines.close();child.kill();});
  const request=(method,params={})=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>reject(new Error(`Timeout: ${method}`)),7000);pending.set(id,value=>{clearTimeout(timer);resolve(value);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
  const init=await request('initialize',{protocolVersion:'2025-11-25',clientInfo:{name:'fixture',version:'1'},capabilities:{}});
  assert.equal(init.result.capabilities.experimental['openai/mentions'].searchTool,'search_mentions');
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  const tools=await request('tools/list');assert.equal(tools.result.tools.length,1);assert.equal(tools.result.tools[0].annotations.readOnlyHint,true);assert.deepEqual(tools.result.tools[0]._meta.ui.visibility,['app']);
  const cancelledId=++next;child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:cancelledId,method:'tools/call',params:{name:'search_mentions',arguments:{query:'4'}}})+'\n');
  const following=request('tools/call',{name:'search_mentions',arguments:{query:'42'}});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/cancelled',params:{requestId:cancelledId,reason:'Search query changed'}})+'\n');
  assert.deepEqual((await following).result.structuredContent.items.map(item=>item.title),['Bug 42']);
  const search=await request('tools/call',{name:'search_mentions',arguments:{query:''}});assert.deepEqual(search.result.structuredContent.items.map(item=>item.title),['Bug 43','Bug 42']);
  await writeFile(join(directory,'preferences.json'),JSON.stringify({schemaVersion:1,projectKey:'example'}));
  const filtered=await request('tools/call',{name:'search_mentions',arguments:{query:'42'}});assert.equal(filtered.result.structuredContent.items.length,1);
  const item=filtered.result.structuredContent.items[0];assert.equal(item.type,'resource');
  const read=await request('resources/read',{uri:item.resourceUri});assert.match(read.result.contents[0].text,/Steps: click save/);assert.match(read.result.contents[0].text,/来源：https:\/\/meego/);
  const denied=await request('resources/read',{uri:'meego-bug://pending/example/999'});assert.ok(denied.error);assert.equal(JSON.stringify(read).includes('conversation'),false);
  assert.equal((await nativeConfig(root)).cliPath,cli);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadBugDetail } from '../dist/service/details.js';
import { BugPreferencesRepository } from '../dist/service/preferences.js';
import { formatReferences, isBugDetail } from '../dist/shared/model.js';
import { readableMarkdown } from '../dist/shared/readable.js';

const bug={id:'example:42',title:'Example',url:'https://meego.larkoffice.com/example/issue/detail/42',status:'OPEN',projectKey:'example',projectName:'Example',workItemId:'42',details:[]};
const signal=new AbortController().signal;
const payload={work_item_attribute:{work_item_name:'Example bug',work_item_status:{key:'OPEN',name:'OPEN'}},work_item_fields:[
  {key:'description',name:'描述',value:'Steps\n```example\nExpected behavior'},
  {key:'severity',name:'严重程度',value:{label:'S2'}},
]};
test('Meego style spans are removed while inline and fenced code retain their original content',()=>{
  assert.equal(readableMarkdown('Steps: <span style="color:gray">Click save</span>\n`<span>code</span>`\n```html\n<span>example</span>\n```'), 'Steps: Click save\n`<span>code</span>`\n```html\n<span>example</span>\n```');
});
test('detail reads explicit fields, preserves Markdown as text and does not fetch comments by default',async()=>{
  const calls=[];
  const detail=await loadBugDetail(async args=>{calls.push(args);return{result:{structuredContent:payload}};},bug,false,signal);
  assert.equal(calls.length,1);assert.ok(calls[0].includes('--fields'));assert.ok(!calls[0].includes('--fetch-all'));
  assert.equal(detail.description,payload.work_item_fields[0].value);assert.deepEqual(detail.attributes,[{name:'严重程度',value:'S2'}]);assert.ok(isBugDetail(detail));
  const quote=formatReferences([detail],false);assert.match(quote,/````text\nSteps\n```example/);assert.match(quote,/来源：https:\/\/meego/);assert.ok(!quote.includes('最近讨论'));
});
test('optional recent comments are paged, sorted and bounded, and truncation is explicit',async()=>{
  const calls=[];
  const detail=await loadBugDetail(async args=>{
    calls.push(args);
    if(args.includes('workitem'))return{...payload,work_item_fields:[{key:'description',name:'描述',value:'x'.repeat(18000)}]};
    const page=Number(args.at(-1));return{pagination:{total_pages:6},comments:[{content:`Comment ${page}`,create_by:{name:'Example user'},create_time:`2026-10-0${page}T00:00:00Z`}]};
  },bug,true,signal);
  assert.equal(calls.length,6);assert.equal(detail.description.length,16000);assert.match(detail.description,/已截断/);
  assert.deepEqual(detail.comments.map(comment=>comment.body),['Comment 3','Comment 4','Comment 5']);assert.equal(detail.commentsComplete,false);
  assert.match(formatReferences([detail],true),/讨论未全部读取/);
  await assert.rejects(loadBugDetail(async()=>({work_item_attribute:{}}),bug,false,signal),/Invalid bug details/);
});
test('project preferences serialize writes and persist only the confirmed scope with private permissions',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'orbit-meego-pref-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const repository=new BugPreferencesRepository(directory);
  assert.deepEqual(await repository.read(),{revision:0,projectKey:null});
  const results=await Promise.all([repository.update({projectKey:'one'}),repository.update({projectKey:'two'})]);
  assert.deepEqual(results.map(value=>value.revision),[1,2]);
  const restored=new BugPreferencesRepository(directory);assert.deepEqual(await restored.read(),{revision:2,projectKey:'two'});
  assert.deepEqual(await restored.update({projectKey:'three'}),{revision:3,projectKey:'three'});
  assert.equal((await stat(join(directory,'preferences.json'))).mode&0o777,0o600);
  assert.deepEqual(Object.keys(JSON.parse(await readFile(join(directory,'preferences.json'),'utf8'))).sort(),['projectKey','revision','schemaVersion']);
  assert.throws(()=>repository.update({projectKey:'../bad'}),/Invalid preferences/);assert.throws(()=>repository.update({projectKey:null,token:'secret'}),/Invalid preferences/);
});

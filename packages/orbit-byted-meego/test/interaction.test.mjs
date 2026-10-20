import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { BugStore } from '../dist/injected/store.js';
import { openBugPicker } from '../dist/injected/picker.js';

const bugs=Array.from({length:6},(_,index)=>({id:`example:${index+1}`,title:index===0?'<img src=x> First bug':`Bug ${index+1}`,url:`https://meego.larkoffice.com/example/issue/detail/${index+1}`,status:index===0?'IN PROGRESS':'OPEN',details:[],projectKey:'example',projectName:'Example',workItemId:String(index+1)}));
const snapshot={generation:'test',revision:1,items:bugs,complete:true,updatedAt:Date.now(),refreshing:false,error:null};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(t) {
  const window=new Window({url:'https://example.test/conversation/one'}),document=window.document,handlers=new Map(),disposers=[],calls=[];
  const controller=new AbortController();let revision=0;
  const store=new BugStore({signal:controller.signal,onDispose:fn=>disposers.push(fn),events:{subscribe:(topic,fn)=>{handlers.set(topic,fn);return()=>handlers.delete(topic);}},rpc:{call:async(method,input)=>{
    calls.push({method,input});
    if(method==='getFeed'||method==='refreshFeed')return structuredClone(snapshot);
    if(method==='getPreferences')return{revision,projectKey:null};
    if(method==='setPreferences')return{revision:++revision,...input};
    if(method==='getBug'){const bug=bugs.find(bug=>bug.id===input.id);return{...bug,description:'Steps\n<img src=private>\nExpected behavior',attributes:[{name:'严重程度',value:'S2'}],comments:[],commentsComplete:true,fetchedAt:'2026-10-20T01:00:00Z'};}
    throw new Error(method);
  }}});
  const textarea=document.createElement('textarea');textarea.value='An existing conversation draft';document.body.append(textarea);textarea.focus();
  await flush();
  t.after(async()=>{controller.abort();disposers.reverse().forEach(fn=>fn());await window.happyDOM.close();});
  return {window,document,textarea,store,calls,handlers,picker:()=>document.querySelector('[data-orbit-meego-picker]')?.shadowRoot};
}
test('picker searches safe previews, limits batch copies and leaves the conversation draft untouched',async t=>{
  const h=await setup(t);let closed=0;const dispose=openBugPicker(h.document,h.store,bugs[0],()=>closed++);await flush();
  const picker=h.picker();assert.equal(picker.querySelectorAll('.row').length,6);assert.equal(picker.querySelectorAll('img,a').length,0);assert.match(picker.querySelector('.preview').textContent,/Expected behavior/);
  assert.equal(picker.querySelector('.search').placeholder,'搜索 Bug');assert.deepEqual([...picker.querySelectorAll('.tab')].map(node=>node.textContent),['全部','处理中','待处理']);assert.equal(picker.querySelector('.foot').hidden,true);
  const search=picker.querySelector('.search');search.value='Bug 6';search.dispatchEvent(new h.window.Event('input'));assert.equal(picker.querySelectorAll('.row').length,1);
  search.value='';search.dispatchEvent(new h.window.Event('input'));
  for(let i=1;i<6;i++){const check=picker.querySelectorAll('.row input')[i];check.checked=true;check.dispatchEvent(new h.window.Event('change'));}
  assert.equal(picker.querySelectorAll('.row input:checked').length,5);assert.match(picker.querySelector('.message').textContent,/最多引用 5/);
  picker.querySelector('.primary').click();await flush();await flush();
  const reference=picker.querySelector('.reference').value;assert.equal((reference.match(/## Meego Bug：/g)||[]).length,5);assert.match(reference,/严重程度：S2/);
  assert.equal(h.textarea.value,'An existing conversation draft');dispose();assert.equal(closed,1);assert.equal(h.picker(),undefined);assert.equal(h.document.activeElement,h.textarea);
});
test('Escape closes the picker, restores focus and project scope stays shared across views',async t=>{
  const h=await setup(t);await h.store.project('other');
  openBugPicker(h.document,h.store,undefined,()=>{});assert.equal(h.picker().querySelectorAll('.row').length,0);assert.match(h.picker().querySelector('.empty').textContent,/筛选/);
  h.handlers.get('feed')({...snapshot,revision:0,items:[]});assert.equal(h.store.bugs.length,6);
  h.handlers.get('feed')({...snapshot,revision:2,items:[{...bugs[0],url:'javascript:alert(1)'}]});assert.equal(h.store.bugs.length,6);assert.match(h.store.error,/格式/);
  h.picker().querySelector('.search').dispatchEvent(new h.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,composed:true}));
  assert.equal(h.picker(),undefined);assert.equal(h.document.activeElement,h.textarea);
});

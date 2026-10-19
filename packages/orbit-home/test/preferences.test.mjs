import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HomePreferencesRepository } from "../dist/service/preferences.js";
import { activate } from "../dist/service/activate.js";

async function directory(t) { const path=await mkdtemp(join(tmpdir(),"orbit-home-preferences-"));t.after(()=>rm(path,{recursive:true,force:true}));return path; }
test("concurrent partial updates preserve peer fields and survive service replacement",async t=>{
  const path=await directory(t), repository=new HomePreferencesRepository(path);
  const initial=await repository.read();assert.equal(initial.clockVisible,true);
  await Promise.all([repository.update({displayName:"Ian"}),repository.update({module:{id:"orbit-todo",visible:false}}),repository.update({clockVisible:false})]);
  const saved=await new HomePreferencesRepository(path).read();
  assert.equal(saved.displayName,"Ian");assert.equal(saved.clockVisible,false);assert.equal(saved.moduleVisibility['orbit-todo'],false);assert.equal(saved.revision,3);
  assert.deepEqual(await readdir(path),["home.json"]);
  assert.throws(()=>repository.update({module:{id:"../escape",visible:true}}));
  assert.throws(()=>repository.update({unknown:true}));
});
test("an unreadable settings document is preserved instead of overwritten",async t=>{
  const path=await directory(t), repository=new HomePreferencesRepository(path), file=join(path,"home.json");
  await writeFile(file,"{ broken");await assert.rejects(repository.read());await assert.rejects(repository.update({displayName:"Ian"}));
  assert.equal(await readFile(file,"utf8"),"{ broken");
});
test("confirmed settings writes publish a full revisioned snapshot to every client",async t=>{
  const path=await directory(t), handlers=new Map(), events=[];
  activate({stateDirectory:path,rpc:{handle:(method,fn)=>handlers.set(method,fn)},events:{publish:(topic,value)=>events.push({topic,value})}});
  const written=await handlers.get("updatePreferences")({module:{id:"orbit-tags",visible:false}});
  assert.deepEqual(events,[{topic:"preferences",value:written}]);
  assert.deepEqual(await handlers.get("getPreferences")(),written);
});

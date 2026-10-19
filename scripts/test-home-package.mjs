import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
const run=promisify(execFile), temporary=await mkdtemp(join(tmpdir(),"orbit-home-package-"));
try {
  const pack=async name=>JSON.parse((await run("npm",["pack","--json","--pack-destination",temporary],{cwd:resolve("packages",name),maxBuffer:4*1024*1024})).stdout)[0];
  const orbit=await pack("orbit"),home=await pack("orbit-home");
  const files=home.files.map(file=>file.path);
  for(const file of ["orbit-plugin.json","runtime/injected.js","dist/service/activate.js","dist/shared/preferences.js","README.md"])assert.ok(files.includes(file),`Missing Home payload: ${file}`);
  assert.ok(!files.some(file=>/(?:^|\/)(?:node_modules|src|test|\.git)(?:\/|$)|\.(?:sqlite|log)$/u.test(file)));
  const consumer=join(temporary,"consumer");
  await run("npm",["install","--prefix",consumer,"--ignore-scripts","--no-audit","--no-fund",join(temporary,orbit.filename),join(temporary,home.filename)],{timeout:120000,maxBuffer:4*1024*1024});
  const {createInstallationManager}=await import(pathToFileURL(join(consumer,"node_modules/@c0sc0s/orbit/dist/installation/manager.js")));
  const platform=createInstallationManager({home:temporary,root:join(temporary,"orbit"),applicationsRoot:join(temporary,"Applications"),manageExtensions:false});
  await platform.install();await platform.addPlugin(join(consumer,"node_modules/@c0sc0s/orbit-home"));
  const config=await platform.read(),snapshot=join(platform.paths.root,config.orbit.packages['orbit-home'].path);
  assert.ok((await readFile(join(snapshot,"runtime/injected.js"),"utf8")).includes("Hello World"));
  assert.deepEqual(config.plugins.map(plugin=>plugin.id),["orbit-home"]);
  const {HomePreferencesRepository}=await import(pathToFileURL(join(snapshot,"dist/service/preferences.js")));
  const settings=new HomePreferencesRepository(join(temporary,"home-data"));
  assert.equal((await settings.update({module:{id:"example",visible:false}})).moduleVisibility.example,false);
  await platform.setEnabled("orbit-home",false);await platform.uninstallPlugin("orbit-home");assert.equal((await platform.read()).plugins.length,0);
  console.log("Home package smoke passed: independent Home, local preferences, shared UI and plugin lifecycle without Todo.");
} finally {await rm(temporary,{recursive:true,force:true});}

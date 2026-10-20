import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp,mkdir,writeFile,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { snapshotPackage } from '../../dist/installation/files.js';

test('package snapshots retain import-only dependencies whose exports hide package metadata',async t=>{
  const root=await mkdtemp(join(tmpdir(),'orbit-esm-snapshot-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const source=join(root,'source'),dependency=join(source,'node_modules/@fixture/esm-only'),destination=join(root,'snapshot');await mkdir(dependency,{recursive:true});
  await writeFile(join(source,'package.json'),JSON.stringify({name:'fixture',type:'module',files:['entry.js'],dependencies:{'@fixture/esm-only':'1.0.0'}}));
  await writeFile(join(source,'entry.js'),"export { value } from '@fixture/esm-only';\n");
  await writeFile(join(dependency,'package.json'),JSON.stringify({name:'@fixture/esm-only',type:'module',files:['entry.js'],exports:{'.':{import:'./entry.js'}}}));
  await writeFile(join(dependency,'entry.js'),'export const value=42;\n');
  await snapshotPackage(source,destination);await rm(source,{recursive:true,force:true});
  assert.equal((await import(pathToFileURL(join(destination,'entry.js')))).value,42);
});

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCliQuery, parseCliOutput } from "../dist/service/cli.js";

test("CLI accepts both official and bytedcli envelopes and sanitizes failures", () => {
  assert.deepEqual(parseCliOutput('{"data":{"list":[]},"meta":{},"error":null}'), {list:[]});
  assert.deepEqual(parseCliOutput('{"status":"success","data":{"experiments":[]},"error":null}'), {experiments:[]});
  for (const [raw,code] of [
    ['{"status":"error","error":{"code":"AUTH_REQUIRED","message":"no local token secret"}}','auth'],
    ['{"status":"error","error":{"message":"permission denied secret"}}','permission'],
    ['{"status":"error","error":{"message":"request timeout secret"}}','network'],
    ['not-json secret','data'], ['{"status":"success","data":null}','data'],
  ]) assert.throws(()=>parseCliOutput(raw), error=>error.code===code&&!error.message.includes('secret'));
});

test("CLI invokes an executable with literal args, no upgrades, and bounded cancellation", async t => {
  const directory=await mkdtemp(join(tmpdir(),'orbit-byted-cli-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const path=join(directory,'cli');
  await writeFile(path,`#!${process.execPath}\nconsole.log(JSON.stringify({status:'success',data:{args:process.argv.slice(2),auto:process.env.BYTEDCLI_NO_AUTO_UPGRADE}}));\n`,{mode:0o700});
  const query=createCliQuery({cliPath:path}),args=['meego','todo','list','literal; $(no-shell)'];
  assert.deepEqual(await query(args,new AbortController().signal),{args:['--no-auto-upgrade','--json',...args],auto:'1'});
  await assert.rejects(createCliQuery({cliPath:'relative'})([],new AbortController().signal),error=>error.code==='cli-missing');
  await writeFile(path,`#!${process.execPath}\nconsole.log(JSON.stringify({status:'success',data:{list:[]}}));process.exitCode=1;\n`,{mode:0o700});
  await assert.rejects(query([],new AbortController().signal),error=>error.code==='network');
  await writeFile(path,`#!${process.execPath}\nsetInterval(()=>{},1000);\n`,{mode:0o700});
  const controller=new AbortController(),pending=query([],controller.signal);
  const timer=setTimeout(()=>controller.abort(new Error('cancelled')),50);
  try { await assert.rejects(pending,/cancelled/); } finally { clearTimeout(timer); }
});

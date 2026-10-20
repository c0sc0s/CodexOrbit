import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const run=promisify(execFile),temporary=await mkdtemp(join(tmpdir(),'orbit-byted-package-'));
try {
  const tarballs=[];
  for(const name of ['orbit','orbit-byted','orbit-byted-meego','orbit-byted-libra']) {
    const packed=JSON.parse((await run('npm',['pack','--json','--pack-destination',temporary],{cwd:resolve('packages',name),maxBuffer:4*1024*1024})).stdout)[0];
    tarballs.push(join(temporary,packed.filename));
    assert.ok(!packed.files.some(file=>/(?:^|\/)(?:src|test|node_modules|\.git)(?:\/|$)|\.(?:sqlite|log)$/u.test(file.path)));
    if(name.includes('byted-'))for(const required of ['orbit-plugin.json','runtime/injected.js','dist/service/activate.js'])assert.ok(packed.files.some(file=>file.path===required),`${name}: missing ${required}`);
    if(name==='orbit-byted-meego')for(const required of ['.codex-plugin/plugin.json','.mcp.json','server.mjs','dist/service/mcp.js'])assert.ok(packed.files.some(file=>file.path===required),`${name}: missing ${required}`);
  }
  const consumer=join(temporary,'consumer');
  await run('npm',['install','--prefix',consumer,'--ignore-scripts','--no-audit','--no-fund',...tarballs],{timeout:120000,maxBuffer:4*1024*1024});
  const {createInstallationManager}=await import(pathToFileURL(join(consumer,'node_modules/@c0sc0s/orbit/dist/installation/manager.js')));
  const platform=createInstallationManager({home:temporary,root:join(temporary,'orbit'),applicationsRoot:join(temporary,'Applications'),manageExtensions:false});
  await platform.install();
  const cli=join(temporary,'bytedcli');
  await writeFile(cli,`#!${process.execPath}
const args=process.argv.slice(2);if(!args.includes('--no-auto-upgrade'))process.exit(1);
const data=args.includes('workitem')?{work_item_attribute:{work_item_name:'Example Bug',work_item_status:{name:'OPEN'}},work_item_fields:[{key:'description',name:'Description',value:'Example reproduction steps'}]}:args.includes('comment')?{comments:[],pagination:{total_pages:0}}:args.includes('meego')?{list:[{work_item_info:{work_item_id:42,work_item_type_key:'issue',work_item_name:'Example Bug'},project_key:'example',project_name:'Example',state_info:{start_state_key_name:'OPEN'}}]}:{experiments:[{id:43,name:'Example experiment',status:1}]};
console.log(JSON.stringify({status:'success',data}));
`,{mode:0o700});
  for(const name of ['orbit-byted-meego','orbit-byted-libra'])await platform.addPlugin(join(consumer,'node_modules/@c0sc0s',name));
  const config=await platform.read();assert.equal(config.plugins.length,2);
  for(const name of ['orbit-byted-meego','orbit-byted-libra']) {
    const root=join(platform.paths.root,config.orbit.packages[name].path),handlers=new Map(),disposers=[];
    const {activate}=await import(pathToFileURL(join(root,'dist/service/activate.js')));
    let finish;const done=new Promise(resolve=>finish=resolve),timer=setTimeout(()=>finish(null),10000);
    try {
      const signal=new AbortController().signal;
      activate({id:name,stateDirectory:join(temporary,name),config:{cliPath:cli},signal,
        onDispose:fn=>disposers.push(fn),rpc:{handle:(method,fn)=>handlers.set(method,fn)},events:{publish:(topic,value)=>{if(value.updatedAt&&!value.refreshing)finish(value);}}});
      const result=await done;assert.ok(result,`${name}: no service result`);assert.equal(result.error,null);assert.equal(result.items.length,1);
      assert.equal((await handlers.get('getFeed')()).complete,true);
      if(name==='orbit-byted-meego') {
        const {createMeegoMentions}=await import(pathToFileURL(join(root,'dist/service/mentions.js')));
        const native=createMeegoMentions(async()=>({list:[]}),{});await native.close();
        const detail=await handlers.get('getBug')({id:result.items[0].id,includeComments:true},{signal});
        assert.equal(detail.description,'Example reproduction steps');assert.deepEqual(detail.comments,[]);
        await assert.rejects(handlers.get('getBug')({id:'other:42',includeComments:false},{signal}),/personal pending/);
        assert.equal((await handlers.get('setPreferences')({projectKey:'example'})).projectKey,'example');
        assert.equal((await handlers.get('getPreferences')()).revision,1);
      }
    } finally {clearTimeout(timer);for(const dispose of disposers.reverse())dispose();}
  }
  await platform.setEnabled('orbit-byted-meego',false);
  assert.equal((await platform.read()).plugins.find(plugin=>plugin.id==='orbit-byted-libra').enabled,true);
  await platform.uninstallPlugin('orbit-byted-meego');await platform.uninstallPlugin('orbit-byted-libra');
  console.log('ByteDance package smoke passed: isolated tarball installation, both services, shared dependencies and independent lifecycle.');
} finally {await rm(temporary,{recursive:true,force:true});}

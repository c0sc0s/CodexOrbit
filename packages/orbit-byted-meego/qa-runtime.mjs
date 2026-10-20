import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CodexProcess, PluginTargetRegistry } from '@c0sc0s/orbit';

const {runtimeVersion}=JSON.parse(await readFile(new URL('orbit-plugin.json',import.meta.url),'utf8'));
const owner=new CodexProcess();
assert.ok(await owner.ownsCdpEndpoint(),'QA requires an already running owned endpoint.');
const registry=new PluginTargetRegistry({port:9341,ownsEndpoint:()=>owner.ownsCdpEndpoint()});
try {
  const targets=await registry.discover();let client;
  for(const target of targets) {
    const status=await registry.evaluate(target,"window.__codexPluginLoader?.inspect('orbit-byted-meego')");
    assert.equal(status?.version,runtimeVersion);assert.equal(status.error,null);assert.ok(status.count>0);client??=await registry.client(target);
  }
  assert.ok(client,'No active Meego renderer');
  const result=await client.evaluate(`(async()=>{
    if(document.querySelector('[data-orbit-meego-picker]'))throw new Error('Close the existing picker before QA.');
    if(document.querySelector('[data-orbit-meego-launcher]'))throw new Error('Unexpected floating composer button.');
    const descriptor=window[Symbol.for('@c0sc0s/orbit/ui/home-sections/v1')].sections.get('orbit-byted-meego.list');
    const previous=document.activeElement,fixture=document.createElement('section');fixture.dataset.orbitMeegoQa='true';
    fixture.style.cssText='position:fixed;top:40px;left:40px;z-index:9997;width:min(960px,90vw);padding:16px;background:Canvas;color:CanvasText';
    const body=document.createElement('div'),summary=document.createElement('span'),actions=document.createElement('div');fixture.append(summary,actions,body);document.body.append(fixture);
    const dispose=descriptor.mount(body,{summary,actions,setCompact(){}});
    const root=()=>document.querySelector('[data-orbit-meego-picker]')?.shadowRoot;
    try {
      await new Promise(resolve=>setTimeout(resolve,200));const list=body.firstElementChild.shadowRoot,rows=list.querySelectorAll('.row').length;
      if(!rows||actions.querySelector('a')||actions.textContent.includes('打开'))throw new Error('Home controls are invalid.');
      const main=list.querySelector('.row-main');main.focus();
      if(getComputedStyle(main).backgroundColor!=='rgba(0, 0, 0, 0)')throw new Error('Nested row surface.');
      const placements=[];
      for(const zoom of [0.8,1,1.25,1.5]) {
        fixture.style.zoom=String(zoom);const trigger=list.querySelector('.project');trigger.click();
        const popup=list.querySelector('[role="listbox"]'),anchor=trigger.getBoundingClientRect(),bounds=popup.getBoundingClientRect();
        const gap=popup.dataset.side==='bottom'?bounds.top-anchor.bottom:anchor.top-bounds.bottom;
        if(Math.abs(gap-4)>1||Math.abs(bounds.left-anchor.left)>1)throw new Error('Project popup is detached from its trigger.');
        placements.push({zoom,gap:Math.round(gap*100)/100});trigger.click();
      }
      fixture.style.zoom='1';
      list.querySelector('.row-main').click();
      for(let i=0;i<120;i++){const pre=root()?.querySelector('.preview pre');if(pre&&!pre.textContent.includes('正在读取'))break;await new Promise(resolve=>setTimeout(resolve,100));}
      const picker=root(),preview=picker?.querySelector('.preview pre');
      if(!preview||preview.textContent.includes('读取失败')||picker.querySelector('a'))throw new Error('Live preview failed.');
      const bounds=picker.querySelector('.dialog').getBoundingClientRect();
      if(bounds.width<300||bounds.right>innerWidth||bounds.bottom>innerHeight)throw new Error('Picker exceeds viewport.');
      picker.querySelector('.close').click();
      if(root())throw new Error('Picker cleanup failed.');
      return{rows,previewCharacters:preview.textContent.length,dialogWidth:Math.round(bounds.width),nestedSurface:false,floatingButton:false,placements};
    } finally {root()?.querySelector('.close')?.click();dispose();fixture.remove();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});}
  })()`);
  console.log(JSON.stringify({runtimeVersion,windows:targets.length,...result,scope:'Owned Home fixture and Meego reads only; no conversation attachment, clipboard change or sending.'},null,2));
} finally {registry.close();}

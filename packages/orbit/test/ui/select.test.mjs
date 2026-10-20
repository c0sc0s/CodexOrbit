import assert from "node:assert/strict";
import test from "node:test";
import { Window } from "happy-dom";
import { mountSelect } from "@c0sc0s/orbit/ui";

const choices = [{ value:"todo",label:"待办" },{ value:"doing",label:"进行中" },{ value:"done",label:"已完成" }];
function setup(t, values = choices) {
  const window = new Window(), document = window.document;
  t.after(() => window.happyDOM.close());
  const host = document.createElement("div"); document.body.append(host);
  const shadow = host.attachShadow({mode:"open"}), trigger = document.createElement("button");
  trigger.setAttribute("aria-label","任务状态"); shadow.append(trigger);
  const changed = [], control = mountSelect(trigger,{value:values[0].value,choices:values,onChange:value=>changed.push(value)});
  t.after(control.dispose);
  const key = (value, extra={}) => { const event = new window.KeyboardEvent("keydown",{key:value,bubbles:true,cancelable:true,composed:true,...extra}); trigger.dispatchEvent(event); return event; };
  return {window,document,host,shadow,trigger,changed,control,key};
}

test("select popup inherits the app palette even when native color-scheme is different", t => {
  const {window,host,shadow,trigger} = setup(t);
  for (const [scheme, background, foreground] of [["light","#2c2c2c","#ececec"],["dark","#f9f9f9","#202020"]]) {
    host.style.colorScheme=scheme;
    host.style.setProperty("--color-background-elevated-secondary-opaque",background);
    host.style.setProperty("--color-text-foreground",foreground);
    trigger.click();
    const popup=shadow.querySelector('[role="listbox"]');
    const computed=window.getComputedStyle(popup);
    assert.equal(computed.backgroundColor,background);
    assert.equal(computed.color,foreground);
    assert.equal(window.getComputedStyle(popup.firstElementChild).color,computed.color);
    assert.equal(popup.querySelector('[aria-selected="true"]').textContent,"待办");
    trigger.click();
  }
});

test("keyboard movement previews options; Escape cancels without closing an outer dialog", t => {
  const {shadow,trigger,changed,key} = setup(t);
  let escaped=0;shadow.addEventListener("keydown",event=>{if(event.key==="Escape")escaped++;});
  trigger.focus(); key("ArrowDown"); key("ArrowDown");
  assert.equal(shadow.activeElement,trigger);
  const active=shadow.getElementById(trigger.getAttribute("aria-activedescendant"));
  assert.equal(active.textContent,"进行中");
  assert.deepEqual(changed,[]);
  assert.equal(key("Escape").defaultPrevented,true);
  assert.equal(shadow.querySelector('[role="listbox"]'),null);
  assert.equal(trigger.value,"todo");assert.equal(escaped,0);
  key("Escape");assert.equal(escaped,1);
});

test("Enter and Tab commit once while skipped disabled options cannot be chosen", t => {
  const {shadow,trigger,changed,key}=setup(t,[choices[0],{...choices[1],disabled:true},choices[2]]);
  key("ArrowDown");key("ArrowDown");key("Enter");
  assert.deepEqual(changed,["done"]);assert.equal(trigger.value,"done");
  assert.equal(shadow.querySelector('[role="listbox"]'),null);
  key("Home");const tab=key("Tab");
  assert.deepEqual(changed,["done","todo"]);assert.equal(tab.defaultPrevented,false);
  trigger.click();shadow.querySelector('[aria-disabled="true"]').click();
  assert.deepEqual(changed,["done","todo"]);
});

test("mouse choice, outside click and outside focus have independent commit behavior", t => {
  const {window,document,shadow,trigger,changed}=setup(t);
  trigger.click();shadow.querySelectorAll('[role="option"]')[1].click();
  assert.deepEqual(changed,["doing"]);assert.equal(shadow.activeElement,trigger);
  trigger.click();document.body.dispatchEvent(new window.PointerEvent("pointerdown",{bubbles:true,composed:true}));
  assert.equal(shadow.querySelector('[role="listbox"]'),null);assert.deepEqual(changed,["doing"]);
  trigger.click();const outside=document.createElement("input");document.body.append(outside);outside.focus();
  assert.equal(shadow.querySelector('[role="listbox"]'),null);
});

test("typeahead matches labels and ignores IME composition", t => {
  const {trigger,changed,key}=setup(t,[{value:"a",label:"Alpha"},{value:"b",label:"Beta"},{value:"c",label:"Bravo"}]);
  key("ArrowDown",{isComposing:true});assert.equal(trigger.getAttribute("aria-expanded"),"false");
  key("b");key("r");key("Enter");assert.deepEqual(changed,["c"]);
});

test("updates close disabled controls, preserve a valid active choice and clean up owned resources", t => {
  const {shadow,trigger,control,changed,key}=setup(t);
  key("End");control.update({value:"doing",choices:[choices[1],choices[2]]});
  assert.equal(shadow.getElementById(trigger.getAttribute("aria-activedescendant")).textContent,"已完成");
  key("Enter");assert.deepEqual(changed,["done"]);
  trigger.click();trigger.disabled=true;control.update({value:"done",choices});
  assert.equal(shadow.querySelector('[role="listbox"]'),null);
  trigger.disabled=false;trigger.click();control.dispose();
  assert.equal(shadow.querySelector('[role="listbox"]'),null);assert.equal(shadow.querySelector("style"),null);
  assert.equal(trigger.getAttribute("role"),null);assert.equal(trigger.getAttribute("aria-label"),"任务状态");
  trigger.click();assert.equal(shadow.querySelector('[role="listbox"]'),null);
});

test("the popup stays outside scrolling containers and flips inside the viewport at window zoom", t => {
  const {window,shadow,trigger}=setup(t);
  const rect=(x,y,w,h)=>({x,y,left:x,top:y,right:x+w,bottom:y+h,width:w,height:h,toJSON(){}});
  const previous=window.HTMLElement.prototype.getBoundingClientRect;
  window.HTMLElement.prototype.getBoundingClientRect=function(){return this===trigger?rect(window.innerWidth-130,window.innerHeight-40,120,30):rect(0,0,180,100);};
  t.after(()=>{window.HTMLElement.prototype.getBoundingClientRect=previous;});
  const scroller=window.document.createElement("div");scroller.style.overflow="hidden";shadow.append(scroller);scroller.append(trigger);
  window.document.documentElement.style.setProperty("--codex-window-zoom","1.25");
  trigger.click();const popup=shadow.querySelector('[role="listbox"]');
  assert.equal(popup.parentNode,shadow);assert.equal(popup.dataset.side,"top");
  assert.equal(Number.parseFloat(popup.style.left)*1.25,window.innerWidth-188);
  assert.equal(Number.parseFloat(popup.style.top)*1.25,window.innerHeight-144);
});

test("popup coordinates compensate ancestor zoom as well as the control's own zoom", t => {
  const {window,shadow,trigger}=setup(t);
  const rect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
  trigger.getBoundingClientRect=()=>rect(420,100,160,32);
  const previous=window.HTMLElement.prototype.getBoundingClientRect;
  window.HTMLElement.prototype.getBoundingClientRect=function(){return rect(0,0,200,140);};
  t.after(()=>{window.HTMLElement.prototype.getBoundingClientRect=previous;});
  window.document.documentElement.style.setProperty("--codex-window-zoom","1.1");
  for(const ancestorZoom of [0.8,1,1.25,1.5]) {
    const totalZoom=1.1*ancestorZoom;
    Object.defineProperty(window.HTMLElement.prototype,"currentCSSZoom",{configurable:true,get(){return totalZoom;}});
    trigger.click();const popup=shadow.querySelector('[role="listbox"]');
    assert.ok(Math.abs(Number.parseFloat(popup.style.left)*totalZoom-420)<.001);
    assert.ok(Math.abs(Number.parseFloat(popup.style.top)*totalZoom-136)<.001);
    trigger.click();
  }
});

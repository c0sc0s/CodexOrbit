import assert from "node:assert/strict";
import test from "node:test";
import { Window } from "happy-dom";
import { getHomeSections, subscribeHomeSections, registerHomeSection } from "@c0sc0s/orbit/ui";

test("Home registrations are immutable, deterministic and independent of load order",t=>{
  const window=new Window(), document=window.document; t.after(()=>window.happyDOM.close());
  let updates=0;const unsubscribe=subscribeHomeSections(()=>updates++,document);t.after(unsubscribe);
  const section={id:"todo",title:"Todo",slot:"main",order:10,mount(){return()=>{};}};
  const one=registerHomeSection(section,document), two=registerHomeSection({id:"tags",title:"Tags",slot:"overview",order:100,mount(){return()=>{};}},document);
  t.after(one);t.after(two);section.title="Changed";
  assert.deepEqual(getHomeSections(document).map(({id,title})=>({id,title})),[{id:"tags",title:"Tags"},{id:"todo",title:"Todo"}]);
  assert.ok(Object.isFrozen(getHomeSections(document)[0]));
  assert.throws(()=>registerHomeSection({id:"todo",title:"Duplicate",mount(){return()=>{};}},document));
  assert.equal(updates,2);one();assert.deepEqual(getHomeSections(document).map(item=>item.id),["tags"]);
  unsubscribe();two();assert.equal(updates,3);assert.equal(getHomeSections(document).length,0);
});

test("invalid contracts fail before notification and registries belong to one renderer",t=>{
  const a=new Window(),b=new Window();t.after(()=>a.happyDOM.close());t.after(()=>b.happyDOM.close());
  for(const patch of [{id:"../bad"},{title:""},{slot:"other"},{order:NaN},{defaultVisible:1}]) assert.throws(()=>registerHomeSection({id:"valid",title:"Valid",mount(){return()=>{};},...patch},a.document));
  const stop=registerHomeSection({id:"valid",title:"Valid",mount(){return()=>{};}},a.document);t.after(stop);
  assert.equal(getHomeSections(a.document).length,1);assert.equal(getHomeSections(b.document).length,0);
});

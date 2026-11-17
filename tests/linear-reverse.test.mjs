import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateConfig, SerialClient } from '../host/assets/protocol.mjs';
import { linearDefaults, encodeLinear, decodeLinear, linearValue, mountLinear } from '../host/assets/device-linear.mjs';
import { commands, fields, status, presets, errors, capabilities } from '../host/assets/protocol-reference-data.mjs';
function config(version=6) {
  const c=Array(137).fill(0);c[0]=version;c[5]=20;
  c.splice(89,11,1,100,200,50,40,0,5,5,2,2,3);
  return encodeLinear(c,linearDefaults);
}
test('V6 reverse opt-in roundtrips independently of preset; legacy formats reject opt-in',()=>{
  for(let preset=0;preset<8;preset++) {
    const c=config();const s={...linearDefaults,preset,reverseOnDoubleClick:preset!==4};
    encodeLinear(c,s);validateConfig(c);assert.deepEqual(decodeLinear(c),s);
    assert.equal(c[124],preset|(preset===4?0:128));
  }
  for(const byte of [8,127,132,136,255]) {const c=config();c[124]=byte;assert.throws(()=>validateConfig(c));}
  for(const version of [4,5]) {
    assert.throws(()=>encodeLinear(config(version),{...linearDefaults,preset:2,reverseOnDoubleClick:true}));
    const c=config(version);c[124]=130;assert.throws(()=>validateConfig(c));
  }
});
test('runtime reversed preview matches volume and touch mapping; telemetry accepts 10/12/13 fields',async()=>{
  const c={...linearDefaults,preset:0};
  assert.equal(linearValue(c,0,3,true).volume,100);assert.equal(linearValue(c,100,3,true).volume,0);
  const touch={...c,preset:7};assert.equal(linearValue(touch,100,3,true).area,.01);assert.equal(linearValue(touch,100,3,true).pressure,1);
  const serial=new SerialClient({});
  for(const n of [10,12,13]) {
    const frame=Array(n).fill(0);frame[0]=1001;
    serial.request=async(k,v,match)=>{assert.equal(k,999);assert.equal(v,3);assert(match(frame));assert(!match(Array(14).fill(1001)));return frame;};
    assert.equal((await serial.status()).length,n);
  }
});
test('reverse checkbox is capability gated, cursor selection clears opt-in and runtime direction stays separate',async()=>{
  const html=await readFile(new URL('../host/index.html',import.meta.url),'utf8');
  const nodes=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(([,id])=>[id,{value:'',checked:false,hidden:false,style:{},events:{},addEventListener(t,f){this.events[t]=f;}}]));
  const $=id=>{assert(nodes.has(id),id);return nodes.get(id);};$('top').value=3;
  let allowed=false;const ui=mountLinear({getElementById:$},()=>false,()=>allowed);
  const c=config();encodeLinear(c,{...linearDefaults,preset:2,reverseOnDoubleClick:true});ui.render(c);assert($('linear-reverseOnDoubleClick').disabled);
  allowed=true;ui.refresh();assert(!$('linear-reverseOnDoubleClick').disabled && $('linear-reverseOnDoubleClick').checked);
  ui.sample([1001,200,200,100,1,1,1,0,100,0,0,0,1]);assert.equal($('linear-direction').textContent,'当前方向：反向');
  const saved=config();ui.write(saved);assert.equal(saved[124],130);
  $('linear-preset').value=4;$('linear-preset').events.input();assert(!$('linear-reverseOnDoubleClick').checked && $('linear-reverseOnDoubleClick').disabled);
  ui.write(saved);assert.equal(saved[124],4);
  ui.disconnected();assert.equal($('linear-direction').textContent,'等待设备');
});
test('serial reference covers every firmware command, every config byte, status and capability bit in both languages',async()=>{
  const source=await readFile(new URL('../firmware/firmware.ino',import.meta.url),'utf8');
  const handler=source.slice(source.indexOf('void handle_serial_input_kv(uint16_t key, uint16_t value) {'),source.indexOf('void hall_defaults() {'));
  const cases=[...handler.matchAll(/case (\d+):/g)].map(m=>Number(m[1])).sort((a,b)=>a-b);
  assert.deepEqual(commands.map(r=>r[0]).sort((a,b)=>a-b),cases);
  const covered=[];for(const row of fields)for(const range of row[0].split(' / ')){const [lo,end]=range.split('–').map(Number);for(let n=lo;n<=(end??lo);n++)covered.push(n);}
  assert.deepEqual(covered.sort((a,b)=>a-b),Array.from({length:137},(_,i)=>i));
  assert.equal(status.length,12);assert.equal(capabilities.length,8);assert.equal(presets.length,8);assert.equal(errors.length,6);
  for(const rows of [fields,status,capabilities,presets,errors])for(const row of rows){assert(row[1]&&row[2]);assert(!/[\u4e00-\u9fff]/u.test(row[2]));}
  for(const row of commands){assert(row[2]&&row[4]);assert(!/[\u4e00-\u9fff]/u.test(row[2]+row[4]));}
  const html=await readFile(new URL('../host/index.html',import.meta.url),'utf8');assert.match(html,/href="\.\/assets\/protocol.html"/);assert(!html.includes('线性模式 · 设备独立运行'));
  const app=await readFile(new URL('../host/assets/app.mjs',import.meta.url),'utf8');assert(app.includes('`V${release.version}`'));assert(!app.includes("${release.isp ?"));
});

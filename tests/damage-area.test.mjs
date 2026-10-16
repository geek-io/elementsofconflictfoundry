import test from 'node:test';
import assert from 'node:assert/strict';
import {techniqueArea,areaContains,placeTechniqueArea} from '../scripts/area.mjs';
import {damageStateAfter,lastDamageDie,executeDamageAction} from '../scripts/damage.mjs';
import {SYSTEM_ID} from '../scripts/config.mjs';
test('area defaults match book dimensions; overrides and shape boundaries work',()=>{
 for(const [shape,length,width] of [['Blast',3,5],['Burst',3,5],['Explosion',5,5],['Ray',10,2],['Cone',16,5]]){
  const a=techniqueArea({system:{template:shape}});assert.equal(a.length,length);assert.equal(a.width,width);
 }
 const origin={x:0,y:0},cone=techniqueArea({system:{template:'Cone'}}),ray=techniqueArea({system:{template:'Ray'}});
 assert.equal(areaContains(cone,origin,{x:16,y:2.5}),true);assert.equal(areaContains(cone,origin,{x:1,y:2}),false);
 assert.equal(areaContains(ray,origin,{x:-1,y:0}),false);assert.equal(areaContains(ray,origin,{x:0,y:10},Math.PI/2),true);
 const circle=techniqueArea({system:{template:'Blast',areaLength:7}});assert.equal(areaContains(circle,origin,{x:7,y:0}),true);assert.equal(areaContains(circle,origin,{x:7.01,y:0}),false);
 assert.equal(techniqueArea({system:{rangeText:'Explosion'}}).length,5);assert.equal(techniqueArea({system:{}}),null);
});
test('damage respects strict thresholds, cumulative wounds, sudden death and slain cap',()=>{
 assert.deepEqual([5,6,11,12,17,18,23,24].map(n=>damageStateAfter(n,5,0)),[0,1,1,2,2,3,3,5]);
 assert.equal(damageStateAfter(12,5,3),5);assert.equal(damageStateAfter(1,5,5),5);assert.throws(()=>damageStateAfter(NaN,5,0));
});
test('last damage die selects latest active explosion result and ignores discarded dice',()=>{
 const roll={dice:[{faces:6,results:[{result:6,active:true},{result:2,active:true}]},{faces:8,results:[{result:1,active:false}]}]};
 assert.equal(lastDamageDie(roll).result.result,2);assert.equal(lastDamageDie(roll).die.faces,6);assert.equal(lastDamageDie({dice:[]}),null);
});
test('GM damage transactions maximize once, transfer Fortune, deduplicate targets and rollback failed updates',async()=>{
 const pools={fortune:2,misfortune:1},gm={id:'gm',active:true,isGM:true,viewedScene:'scene'},player={id:'p',active:true,isGM:false,viewedScene:'scene'};
 const source={type:'character',testUserPermission:u=>u===player||u===gm};
 class FakeRoll{
  constructor(data){Object.assign(this,structuredClone(data));}
  get total(){return this._total;}toJSON(){return {dice:this.dice,_total:this.total,formula:'3 + 1d8'};}
  static fromData(data){return new FakeRoll(data);}_evaluateTotal(){return 3+this.dice[0].results.reduce((n,r)=>n+r.result,0);}getTooltip(){return '';}
 }
 globalThis.Roll=FakeRoll;
 const message={speakerActor:source,flags:{[SYSTEM_ID]:{card:{kind:'damage'},damage:{title:'Blade'}}},rolls:[new FakeRoll({dice:[{faces:8,results:[{result:2,active:true}]}],_total:5})],author:player,whisper:[],update:async changes=>{
  if(changes.rolls)message.rolls=changes.rolls.map(data=>new FakeRoll(typeof data==='string'?JSON.parse(data):data));
  for(const [key,value]of Object.entries(changes))if(key===`flags.${SYSTEM_ID}.damage`)message.flags[SYSTEM_ID].damage=value;else if(key===`flags.${SYSTEM_ID}.damage.applied`)message.flags[SYSTEM_ID].damage.applied=structuredClone(value);
 }};
 const target={uuid:'Actor.target',system:{damageState:0,secondary:{damage:5}},update:async changes=>{target.system.damageState=changes['system.damageState'];}};
 globalThis.foundry={applications:{handlebars:{renderTemplate:async()=>'<card>'}}};
 globalThis.game={user:gm,users:{activeGM:gm,get:id=>id==='p'?player:gm},messages:{get:()=>message},scenes:{get:()=>({id:'scene',tokens:{get:id=>({actor:target,hidden:id==='hidden'})}})},settings:{get:(id,key)=>pools[key],set:async(id,key,value)=>{pools[key]=value;}}};
 await executeDamageAction('m','p','maximize');assert.equal(message.rolls[0].total,11);assert.deepEqual(pools,{fortune:1,misfortune:2});
 await assert.rejects(executeDamageAction('m','p','maximize'),/already/);
 await executeDamageAction('m','p','apply',['t','t2'],'scene');assert.equal(target.system.damageState,1);
 await assert.rejects(executeDamageAction('m','p','apply',['t'],'scene'),/No new/);
 await assert.rejects(executeDamageAction('m','p','apply',['hidden'],'scene'),/No new/);
 message.flags[SYSTEM_ID].damage={};message.rolls=[new FakeRoll({dice:[{faces:8,results:[{result:1,active:true}]}],_total:4})];
 const update=message.update;message.update=async()=>{throw Error('save failed');};
 await assert.rejects(executeDamageAction('m','p','maximize'),/save failed/);assert.deepEqual(pools,{fortune:1,misfortune:2});message.update=update;
 player.viewedScene='other';await assert.rejects(executeDamageAction('m','p','apply',['t'],'scene'),/current Scene/);
});

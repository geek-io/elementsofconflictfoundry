import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {poolChange,applyPoolAction,savePools} from '../scripts/pools.mjs';
import {npcPreset,assignNpcAttribute,cycleNpcAttribute} from '../scripts/npc.mjs';
test('all EoC professions contain twenty named advances and linked EoC Talents',async()=>{
 const records=JSON.parse(await readFile('data/book-professions.json','utf8'));
 const professions=records.filter(r=>r.type==='profession');
 assert.deepEqual(professions.map(r=>r.name),['Deceiver','Demolition','Infiltrator','Saboteur','Support']);
 assert.equal(records.filter(r=>r.type==='talent').length,15);assert.equal(records.filter(r=>r.type==='trait').length,5);
 for(const record of professions){const advances=record.system.advances;assert.equal(Object.keys(advances.skills).length,10);assert.equal(Object.keys(advances.bonuses).length,7);assert.equal(Object.keys(advances.talents).length,3);for(const group of Object.values(advances))for(const slot of Object.values(group)){assert.ok(slot.name);assert.equal(slot.completed,false);}for(const slot of Object.values(advances.talents)){const id=slot.uuid.split('.').at(-1);assert.ok(records.some(r=>r._id===id&&r.name===slot.name));}}
 const support=records.find(r=>r.name==='Underneath the Underneath');assert.match(support.system.description,/Disadvantage/);assert.match(support.system.description,/servant/);
});
test('pool spends conserve coins and reject empty or fractional spending',()=>{
 assert.deepEqual(poolChange({fortune:3,misfortune:1},'fortune'),{fortune:2,misfortune:2});
 assert.deepEqual(poolChange({fortune:3,misfortune:2},'misfortune',2),{fortune:5,misfortune:0});
 assert.throws(()=>poolChange({fortune:0,misfortune:1},'fortune'),/Not enough/);
 assert.throws(()=>poolChange({fortune:1,misfortune:1},'misfortune',0.5),/whole/);
});
test('GM authority serializes concurrent player spends and rejects player Misfortune changes',async()=>{
 let state={fortune:1,misfortune:1};
 const users=[{id:'gm',active:true,isGM:true},{id:'player',active:true,isGM:false}];users.get=id=>users.find(u=>u.id===id);users.activeGM=users[0];users.players=[users[1]];
 globalThis.game={user:users[0],users,settings:{get:(id,key)=>state[key],set:async(id,key,value)=>{await Promise.resolve();state[key]=value;}}};
 const results=await Promise.allSettled([applyPoolAction('fortune','player'),applyPoolAction('fortune','player')]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.deepEqual(state,{fortune:0,misfortune:2});
 await assert.rejects(applyPoolAction('misfortune','player'),/Only the GM/);
 await applyPoolAction('misfortune','gm');assert.deepEqual(state,{fortune:1,misfortune:1});
 await applyPoolAction('reset','gm');assert.deepEqual(state,{fortune:3,misfortune:1});
 let fail=true;game.settings.set=async(id,key,value)=>{if(key==='misfortune'&&fail){fail=false;throw Error('Save failed');}state[key]=value;};
 await assert.rejects(savePools({fortune:10,misfortune:0}),/Save failed/);assert.deepEqual(state,{fortune:3,misfortune:1});
});
test('NPC assignments accept owned abilities, preserve other fields, and reject foreign Items',async()=>{
 let saved;
 const actor={type:'npc',isOwner:true,items:{get:id=>id==='tech'?{type:'technique'}:id==='gear'?{type:'weapon'}:null},update:async changes=>saved=changes};
 await assignNpcAttribute(actor,'combat',45,'tech');assert.deepEqual(saved,{'system.attributes.combat':45,'system.npcAbilities.combat':'tech'});
 await assert.rejects(assignNpcAttribute(actor,'combat',40,'foreign'),/owned/);
 await assert.rejects(assignNpcAttribute(actor,'combat',40,'gear'),/owned/);
 assert.equal(await assignNpcAttribute({...actor,isOwner:false},'combat',40,''),false);
 assert.equal(npcPreset(40),45);assert.equal(npcPreset(40,false,true),35);assert.equal(npcPreset(55,true),50);
});
test('NPC right-click cycles only attribute values, including reverse and elite options',async()=>{
 const values=[];const actor={type:'npc',isOwner:true,system:{npcElite:false,npcAbilities:{combat:'talent'}},_source:{system:{attributes:{combat:40}}},update:async data=>{values.push(data['system.attributes.combat']);actor._source.system.attributes.combat=values.at(-1);assert.deepEqual(Object.keys(data),['system.attributes.combat']);}};
 for(let i=0;i<4;i++)await cycleNpcAttribute(actor,'combat');assert.deepEqual(values,[45,50,35,40]);
 await cycleNpcAttribute(actor,'combat',true);assert.equal(values.at(-1),35);assert.equal(actor.system.npcAbilities.combat,'talent');
 actor.system.npcElite=true;actor._source.system.attributes.combat=50;await cycleNpcAttribute(actor,'combat');assert.equal(values.at(-1),55);
 assert.equal(await cycleNpcAttribute({...actor,isOwner:false},'combat'),false);
});

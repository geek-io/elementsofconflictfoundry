import test from 'node:test';
import assert from 'node:assert/strict';
import {changeEquipment,grantProfessionEquipment,onProfessionCreated} from '../scripts/profession-equipment.mjs';
import {SYSTEM_ID} from '../scripts/config.mjs';
let id=0;globalThis.foundry={utils:{randomID:()=>String(++id)}};
function fixture(){
 const actor={documentName:'Actor',isOwner:true,items:[],createEmbeddedDocuments:async(type,data)=>{actor.items.push(...structuredClone(data));return data;}};
 const profession={id:'profession',parent:actor,isOwner:true,type:'profession',system:{equipment:[]},update:async data=>{profession.system.equipment=data['system.equipment'];}};
 return {actor,profession};
}
test('custom and dropped profession equipment retain full rules, quantities, effects, and do not duplicate grants',async()=>{
 const {actor,profession}=fixture(),weapon={name:'Custom blade',type:'weapon',system:{quantity:2,damageFormula:'1d6x6',qualities:'Fast',encumbrance:0.5},effects:[{_id:'original',name:'Blessed',transfer:true,system:{changes:[]}}]};
 await changeEquipment(profession,{add:weapon});weapon.system.quantity=9;assert.equal(profession.system.equipment[0].system.quantity,2);
 await changeEquipment(profession,{index:0,field:'name',value:'Heirloom Blade'});
 await Promise.all([changeEquipment(profession,{index:0,field:'quantity',value:3}),changeEquipment(profession,{add:{name:'Bandages',type:'medicine',system:{quantity:4}}})]);
 const grants=await Promise.all([grantProfessionEquipment(profession),grantProfessionEquipment(profession)]);
 assert.equal(grants.flat().length,2);assert.equal(actor.items.length,2);assert.equal(actor.items[0].name,'Heirloom Blade');assert.equal(actor.items[0].system.quantity,3);
 assert.equal(actor.items[0].system.damageFormula,'1d6x6');assert.equal(actor.items[0].effects[0].transfer,true);assert.equal(actor.items[0].effects[0]._id,undefined);
 assert.ok(actor.items[0].flags[SYSTEM_ID].professionEquipment.startsWith('profession:'));
 await assert.rejects(changeEquipment(profession,{add:{name:'Technique',type:'technique'}}),/Inventory/);
 await assert.rejects(changeEquipment(profession,{index:0,field:'quantity',value:-1}),/valid/);
 await changeEquipment(profession,{remove:1});assert.equal(profession.system.equipment.length,1);
});
test('creation hook grants only on the creating client; a second profession grant remains independent',async()=>{
 const {actor,profession}=fixture();await changeEquipment(profession,{add:{name:'Travel Rations',type:'gear',system:{quantity:5}}});
 globalThis.game={user:{id:'creator'}};await onProfessionCreated(profession,{},'other');assert.equal(actor.items.length,0);
 await onProfessionCreated(profession,{},'creator');assert.equal(actor.items.length,1);
 await grantProfessionEquipment({...profession,id:'second'});assert.equal(actor.items.length,2);
 const denied={...profession,parent:{...actor,isOwner:false}};assert.deepEqual(await grantProfessionEquipment(denied),[]);
});

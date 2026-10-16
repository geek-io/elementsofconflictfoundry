import test from 'node:test';
import assert from 'node:assert/strict';
import {weaponAttack,creationTypes,damageFormulaFor} from '../scripts/action-flow.mjs';
import {spendTechnique} from '../scripts/techniques.mjs';
import {JUTSU_TYPES,PHYSICAL_TYPES} from '../scripts/config.mjs';
globalThis.game={combat:{started:true}};
function fixture(){
 const actor={isOwner:true,inCombat:true,system:{actions:2,chakra:{value:10,max:10}},update:async changes=>{for(const [key,value] of Object.entries(changes)){if(key==='system.actions')actor.system.actions=value;if(key==='system.chakra.value')actor.system.chakra.value=value;}}};
 return {actor,weapon:{type:'weapon',isOwner:true,parent:actor},technique:{type:'technique',isOwner:true,parent:actor,system:{chakraCost:3,actionCost:2}}};
}
test('weapon and Technique spending share a queue and refund failed posts',async()=>{
 const {actor,weapon,technique}=fixture();let rolls=0;
 const results=await Promise.allSettled([weaponAttack(actor,weapon,async()=>{rolls++;}),spendTechnique(actor,technique)]);
 assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');assert.equal(actor.system.actions,1);assert.equal(actor.system.chakra.value,10);assert.equal(rolls,1);
 await assert.rejects(weaponAttack(actor,weapon,async()=>{throw Error('Post failed');}),/Post failed/);assert.equal(actor.system.actions,1);
 actor.system.actions=3;await assert.rejects(spendTechnique(actor,technique,null,async()=>{throw Error('Post failed');}),/Post failed/);assert.equal(actor.system.actions,3);assert.equal(actor.system.chakra.value,10);
});
test('creation menus stay in their requested tab and simple Technique damage is recognized safely',()=>{
 assert.deepEqual(creationTypes('inventory'),PHYSICAL_TYPES);
 assert.ok(creationTypes('identity').includes('heritage'));assert.ok(creationTypes('identity').every(type=>!PHYSICAL_TYPES.includes(type)&&!JUTSU_TYPES.includes(type)&&type!=='skill'));
 assert.equal(damageFormulaFor({type:'technique',system:{description:'Suffer 1d6 Power Die worth of Damage.'}}),'1d6x6');
 assert.equal(damageFormulaFor({type:'technique',system:{description:'1d6 damage or 2d6 damage'}}),'');
 assert.equal(damageFormulaFor({type:'technique',system:{description:'Reduce damage by 5.'}}),'');
 assert.equal(damageFormulaFor({type:'technique',system:{description:'An additional 1d6 Power Die worth of Damage; instead deal 1d10 against metal armor.'}}),'');
 assert.equal(damageFormulaFor({type:'technique',system:{description:'1d6 damage plus your Brawn Bonus.'}}),'');
 assert.equal(damageFormulaFor({type:'weapon',system:{damageFormula:'1d6x6 + @bonuses.combat'}}),'1d6x6 + @bonuses.combat');
});

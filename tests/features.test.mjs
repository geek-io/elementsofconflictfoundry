import test from "node:test";
import assert from "node:assert/strict";
import { professionAdvances, professionProgress, skillChance } from "../scripts/rules.mjs";
import { triggerTrait } from "../scripts/traits.mjs";
import trappings from "../data/basic-trappings.mjs";
test("profession completion requires all twenty named advances",()=>{
  const advances=professionAdvances();
  assert.equal(professionProgress(advances).total,20);
  for(const group of Object.values(advances))for(const slot of Object.values(group)){slot.completed=true;}
  assert.equal(professionProgress(advances).complete,false);
  for(const group of Object.values(advances))for(const slot of Object.values(group))slot.name="Advance";
  assert.equal(professionProgress(advances).complete,true);
  advances.skills[9].completed=false;
  assert.equal(professionProgress(advances).completed,19);
});
test("Antagonist activation spends once, blocks insufficient funds, refunds failed updates",async()=>{
  let pool=3,fortune=2;
  globalThis.game={user:{isGM:true,id:"gm"},users:{activeGM:{id:"gm"}},settings:{get:(id,key)=>key==="misfortune"?pool:fortune,set:async(id,key,value)=>{if(key==="misfortune")pool=value;else fortune=value;}}};
  const item={type:"trait",isOwner:true,system:{audience:"antagonist",active:false,spendMisfortune:true,misfortuneCost:2},update:async()=>{item.system.active=true;}};
  assert.equal(await triggerTrait(item),true);assert.equal(pool,1);assert.equal(fortune,4);
  assert.equal(await triggerTrait(item),false);assert.equal(pool,1);
  item.system.active=false;await assert.rejects(triggerTrait(item),/Not enough/);assert.equal(pool,1);
  pool=3;item.update=async()=>{throw Error("Failed save");};await assert.rejects(triggerTrait(item),/Failed save/);assert.equal(pool,3);
  game.user.isGM=false;await assert.rejects(triggerTrait(item),/Only the GM/);
});
test('Antagonist Trait AP and Misfortune spending is atomic, refunded on failure, and AP-free outside combat',async()=>{
 let state={fortune:2,misfortune:4};globalThis.game={user:{isGM:true,id:'gm'},users:{activeGM:{id:'gm'}},combat:{started:true},settings:{get:(id,key)=>state[key],set:async(id,key,value)=>{state[key]=value;}}};
 const actor={documentName:'Actor',isOwner:true,inCombat:true,system:{actions:3},update:async data=>{actor.system.actions=data['system.actions'];}};
 const item={type:'trait',isOwner:true,parent:actor,system:{audience:'antagonist',spendMisfortune:true,misfortuneCost:2,actionCost:2,active:false},update:async data=>{item.system.active=data['system.active'];}};
 await triggerTrait(item);assert.equal(actor.system.actions,1);assert.deepEqual(state,{fortune:4,misfortune:2});
 item.system.active=false;await assert.rejects(triggerTrait(item),/AP/);assert.equal(state.misfortune,2);
 actor.inCombat=false;actor.system.actions=0;await triggerTrait(item);assert.equal(actor.system.actions,0);assert.equal(state.misfortune,0);
 actor.inCombat=true;actor.system.actions=3;state={fortune:2,misfortune:4};item.system.active=false;item.update=async()=>{throw Error('Save failed');};
 await assert.rejects(triggerTrait(item),/Save failed/);assert.equal(actor.system.actions,3);assert.deepEqual(state,{fortune:2,misfortune:4});
});
test("catalog covers every basic equipment table and preserves fractional encumbrance",()=>{
  assert.equal(trappings.length,113);
  assert.equal(new Set(trappings.map(i=>i.name)).size,trappings.length);
  for(const category of ["Survival","Illumination","Medicine","Poisons","Armor","Melee Weapons","Ranged Weapons","Shields"])assert.ok(trappings.some(i=>i.system.category===category));
  assert.equal(trappings.find(i=>i.name==="Kunai").system.encumbrance,0.25);
  assert.equal(trappings.find(i=>i.name==="Smoke Bomb").system.damageFormula,"");
});
globalThis.Actor=class {prepareDerivedData(){} getRollData(){return {};}};
globalThis.Item=class {};
globalThis.ActiveEffect=class {get isSuppressed(){return false;}};
const {EocActor,EocActiveEffect}=await import("../scripts/documents.mjs");
test("derived Chakra updates without changing current Chakra",()=>{
  const actor=new EocActor();actor.system={attributes:{combat:40,brawn:50,agility:40,perception:40,intelligence:40,willpower:40,fellowship:40},tier:2,chakra:{value:7,max:0}};actor.items={contents:[]};
  actor.prepareDerivedData();assert.equal(actor.system.chakra.max,18);assert.equal(actor.system.chakra.value,7);
  actor.system.attributes.willpower=60;actor.prepareDerivedData();assert.equal(actor.system.chakra.max,22);assert.equal(actor.system.chakra.value,7);
});
test("transferring effects follow equipment and Trait activation",()=>{
 const effect=new EocActiveEffect();effect.transfer=true;effect.parent={documentName:"Item",type:"trait",system:{active:false}};assert.equal(effect.isSuppressed,true);
 effect.parent.system.active=true;assert.equal(effect.isSuppressed,false);
 effect.parent={documentName:"Item",type:"armor",system:{equipped:false}};assert.equal(effect.isSuppressed,true);
 effect.parent.system.equipped=true;assert.equal(effect.isSuppressed,false);
 effect.parent={documentName:"Item",type:"talent",system:{}};assert.equal(effect.isSuppressed,false);
});
test("Heritage modifiers recalculate without accumulating or changing saved base values",()=>{
 const actor=new EocActor();actor.system={attributes:{combat:40,brawn:40,agility:40,perception:40,intelligence:40,willpower:40,fellowship:40},bonusAdjustments:{},skills:{athletics:0},tier:2,chakra:{value:7,max:0}};
 const first={id:"first",type:"heritage",system:{heritageEnabled:true,modifiers:[{attribute:"brawn",value:1},{attribute:"willpower",value:1}],attributeModifiers:{brawn:5},skillModifiers:{athletics:10},untrainedBonus:5}},second={id:"second",type:"heritage",system:{heritageEnabled:true,modifiers:[{attribute:"brawn",value:9}]}};
 actor.items={contents:[first,second]};
 actor.prepareDerivedData();assert.equal(actor.system.chakra.max,20);assert.equal(actor.system.attributes.brawn,40);assert.equal(actor.system.chakra.value,7);assert.deepEqual(actor.system.heritageSkills,{});assert.equal(actor.system.heritageUntrainedBonus,0);
 actor.prepareDerivedData();assert.equal(actor.system.chakra.max,20);
 first.system.heritageEnabled=false;second.system.heritageEnabled=false;actor.prepareDerivedData();assert.equal(actor.system.chakra.max,16);
});
test('Pure Lands Genin boon applies only to learned rank zero and the active Heritage',()=>{
 const actor=new EocActor();actor.system={attributes:{brawn:40},skills:{athletics:0},tier:1,chakra:{value:7},perilState:0};
 const heritage={id:'pure',name:'Child of the Pure Lands (No Heritage)',type:'heritage',system:{heritageEnabled:true,boons:[{tier:1,description:'When using a Skill you do not possess Skill Ranks in, add a +5 Base Chance.'}]}};
 actor.items={contents:[heritage]};actor.prepareDerivedData();assert.equal(skillChance(actor.system,'athletics').chance,45);
 actor.prepareDerivedData();assert.equal(skillChance(actor.system,'athletics').chance,45);
 actor.system.skills.athletics=1;actor.system.perilState=2;assert.equal(skillChance(actor.system,'athletics').chance,40);
 heritage.system.heritageEnabled=false;actor.system.skills.athletics=0;actor.prepareDerivedData();assert.equal(skillChance(actor.system,'athletics').chance,40);
 heritage.system.heritageEnabled=true;actor.system.tier=0;actor.prepareDerivedData();assert.equal(actor.system.heritageUntrainedBonus,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {CREATION_TABLES,tableResult,techniqueLearningCost} from '../scripts/creation-tables.mjs';
import {initializeCharacter,buyAdvance,xpBalances,purchaseBudget} from '../scripts/creation-service.mjs';
import {conditionalBonus,editConditionalBonus,conditionalDamageFormula} from '../scripts/conditional-bonuses.mjs';
import {skillChance,secondary} from '../scripts/rules.mjs';
import {actorTestChance} from '../scripts/npc-tests.mjs';
import {ATTRIBUTES,SKILLS,SYSTEM_ID} from '../scripts/config.mjs';
import {folderOptions} from '../scripts/folder-options.mjs';
import {cleanTechniqueDescription} from '../scripts/technique-description.mjs';
import {readFile} from 'node:fs/promises';
test('all creation table rolls resolve; printed Nature boundaries and alignment overlap are explicit',()=>{
 for(const id of Object.keys(CREATION_TABLES))for(let n=1;n<=100;n++)assert.ok(tableResult(id,n));
 assert.equal(tableResult('nature',49),'Lightning');assert.equal(tableResult('nature',50),'Earth');assert.equal(tableResult('nature',89),'Undiscovered');
 assert.equal(tableResult('war',69),'Pessimism');assert.equal(tableResult('war',96),'Yearning');assert.equal(tableResult('war',97),'Vainglorious');
 assert.deepEqual([1,21,41,61,81].map(n=>tableResult('profession',n)),['Deceiver','Demolition','Infiltrator','Saboteur','Support']);
 assert.deepEqual(techniqueLearningCost({system:{jutsuRank:'C',nature:'Fire'}},'Fire'),{base:300,cost:150,discounted:true});
 assert.deepEqual(techniqueLearningCost({system:{jutsuRank:'S',nature:'Fire'}},'Fire'),{base:600,cost:300,discounted:true});
 assert.equal(techniqueLearningCost({system:{jutsuRank:'B',nature:'Wind'}},'Fire').cost,400);
 assert.equal(techniqueLearningCost({system:{jutsuRank:'A',nature:'Wind'}},'Fire').cost,500);
 assert.equal(techniqueLearningCost({system:{jutsuRank:'',nature:'Fire'}},'Fire'),null);
 assert.equal(techniqueLearningCost({system:{jutsuRank:'E',nature:'Neutral'}},'Undiscovered').cost,100);
});
test('folder picker orders parents before children and excludes other document types',()=>{
 const rows=folderOptions([{id:'child',name:'Techniques',type:'Item',folder:{id:'root'}},{id:'root',name:'EoC',type:'Item'},{id:'deep',name:'Ninjutsu',type:'Item',folder:'child'},{id:'actor',name:'NPCs',type:'Actor'}],'Item');
 assert.deepEqual(rows.map(r=>r.id),['root','child','deep']);assert.deepEqual(rows.map(r=>r.depth),[0,1,2]);assert.equal(rows[2].path,'EoC / Techniques / Ninjutsu');
});
test('conditional bonuses toggle independently of Active Effects and respect skill/attribute scope and cap',async()=>{
 const system={attributes:{brawn:40,willpower:40},skills:{athletics:1,ninjutsu:0},conditionalBonuses:[{id:'rain',name:'Rain',target:'athletics',value:20,enabled:true},{id:'fear',name:'Fear',target:'attribute:brawn',value:-10,enabled:true},{id:'inactive',target:'all',value:50,enabled:false}]};
 assert.equal(conditionalBonus(system,'athletics'),10);assert.equal(conditionalBonus(system,'ninjutsu'),0);assert.equal(skillChance(system,'athletics').chance,60);
 assert.equal(actorTestChance({type:'npc',system},'athletics',0,0,{item:{system:{testChance:55}}}).chance,65);
 const actor={isOwner:true,system,update:async data=>{system.conditionalBonuses=data['system.conditionalBonuses'];}};
 await editConditionalBonus(actor,{id:'rain',field:'enabled',value:false});assert.equal(skillChance(system,'athletics').chance,40);
 await assert.rejects(editConditionalBonus(actor,{id:'fear',field:'value',value:1000}),/valid/);
});
test('Technique descriptions retain rules but remove populated metadata and outcome sections',()=>{
 const s={jutsuType:'Ninjutsu',jutsuRank:'E',chakraCost:1,actionCost:0,criticalSuccess:'Extra effect',description:'<h3>Type</h3><p>Ninjutsu</p><h3>Rank</h3><p>E</p><h3>Chakra Cost</h3><p>1</p><h3>Effect</h3><p>Create a clone.</p><h3>Critical Success</h3><p>Extra effect</p>'};
 assert.equal(cleanTechniqueDescription(s),'<p>Create a clone.</p>');assert.equal(cleanTechniqueDescription({...s,description:'<p>Move up to 10 paces.</p>'}),'<p>Move up to 10 paces.</p>');
});
test('conditional Bonus/stat/damage adjustments leave base percentages untouched',()=>{
 const s={attributes:Object.fromEntries(Object.keys(ATTRIBUTES).map(k=>[k,40])),skills:{athletics:0},tier:1,conditionalBonuses:[{target:'bonus:brawn',value:1,enabled:true},{target:'secondary:damage',value:2,enabled:true},{target:'damage',value:3,enabled:true}]};
 assert.equal(secondary(s).damage,7);assert.equal(secondary(s).chakra,9);assert.equal(skillChance(s,'athletics').chance,40);assert.equal(conditionalDamageFormula({system:s},'1d6 + 4'),'(1d6 + 4) + (3)');
});
function fixture(){
 const system={attributes:Object.fromEntries(Object.keys(ATTRIBUTES).map(k=>[k,40])),bonusAdjustments:Object.fromEntries(Object.keys(ATTRIBUTES).map(k=>[k,0])),skills:Object.fromEntries(SKILLS.map(s=>[s.key,0])),experience:0,spentExperience:0,creationState:{},tier:1,chakra:{value:0,max:8},secondary:{techniqueLimit:7},chakraNature:''};
 const items=[];items.get=id=>items.find(i=>i.id===id);items.contents=items;
 const actor={name:'New Shinobi',isOwner:true,type:'character',system,items,_source:{system:structuredClone(system)},update:async changes=>{
  if(actor.failSave){actor.failSave=false;throw Error('save failed');}
  if(changes.system){Object.assign(system,structuredClone(changes.system));actor._source.system=structuredClone(system);}
  for(const [key,value] of Object.entries(changes)){if(key==='name')actor.name=value;if(!key.startsWith('system.'))continue;const parts=key.split('.').slice(1);for(const target of [system,actor._source.system]){let node=target;for(const part of parts.slice(0,-1))node=node[part]??={};node[parts.at(-1)]=structuredClone(value);}}
  system.secondary=secondary(system,items);system.chakra.max=system.secondary.chakra;
 },createEmbeddedDocuments:async(type,data)=>data.map(d=>{const item={...structuredClone(d),id:'item'+items.length,parent:actor,update:async changes=>{if(changes['system.advances'])item.system.advances=structuredClone(changes['system.advances']);}};items.push(item);return item;}),deleteEmbeddedDocuments:async(type,ids)=>{for(const id of ids){const i=items.findIndex(i=>i.id===id);if(i>=0)items.splice(i,1);}}};
 return actor;
}
test('creation and purchasing track General/restricted XP, apply advances once, enforce limits, and rollback saves',async()=>{
 globalThis.foundry={utils:{randomID:()=>String(Math.random())}};
 const records=JSON.parse(await readFile('data/book-professions.json','utf8'));
 const catalogue=records.map(r=>({name:r.name,type:r.type,uuid:`Compendium.${SYSTEM_ID}.${r.type==='profession'?'eoc-professions':r.type==='talent'?'eoc-talents':'eoc-specialist-traits'}.Item.${r._id}`,system:r.system,document:{uuid:`Compendium.${SYSTEM_ID}.${r.type==='profession'?'eoc-professions':r.type==='talent'?'eoc-talents':'eoc-specialist-traits'}.Item.${r._id}`,toObject:()=>structuredClone(r)}}));
 const actor=fixture(),profession=catalogue.find(e=>e.name==='Support');
 await initializeCharacter(actor,{name:'Test Shinobi',values:[40,41,42,43,44,45,46],profession:profession.uuid,nature:'Undiscovered'},catalogue);
 assert.equal(actor.system.attributes.intelligence,49);assert.equal(actor.system.shonen,2);assert.equal(actor.items.filter(i=>i.type==='trait').length,1);
 assert.deepEqual(xpBalances(actor),{gained:1500,spent:100,total:1400,restricted:500,general:900});
 await assert.rejects(initializeCharacter(actor,{},catalogue),/already/);
 const owned=actor.items.find(i=>i.type==='profession');
 await Promise.allSettled([buyAdvance(actor,{professionId:owned.id,group:'skills',index:'0'},catalogue),buyAdvance(actor,{professionId:owned.id,group:'skills',index:'0'},catalogue)]);
 assert.equal(actor.system.skills.chakraControl,1);assert.equal(actor.system.spentExperience,200);assert.equal(owned.system.advances.skills[0].completed,true);
 await buyAdvance(actor,{professionId:owned.id,group:'bonuses',index:'0'},catalogue);assert.equal(actor.system.bonusAdjustments.agility,1);
 await buyAdvance(actor,{professionId:owned.id,group:'talents',index:'0'},catalogue);assert.ok(actor.items.some(i=>i.name==='Polymath'));
 const record={name:'Test Fire',type:'technique',system:{jutsuRank:'E',nature:'Fire'}},doc={uuid:'Item.tech',toObject:()=>structuredClone(record)};catalogue.push({...record,uuid:doc.uuid,document:doc});
 await buyAdvance(actor,{techniqueUuid:doc.uuid},catalogue);assert.equal(xpBalances(actor).restricted,400);assert.equal(xpBalances(actor).general,600);
 await assert.rejects(buyAdvance(actor,{techniqueUuid:doc.uuid},catalogue),/already knows/);
 const second={...record,name:'Second Fire'},secondDoc={uuid:'Item.second',toObject:()=>structuredClone(second)};catalogue.push({...second,uuid:secondDoc.uuid,document:secondDoc});actor.system.secondary.techniqueLimit=1;
 await assert.rejects(buyAdvance(actor,{techniqueUuid:secondDoc.uuid},catalogue),/limit reached/);actor.system.secondary.techniqueLimit=7;
 const spent=actor.system.spentExperience;actor.failSave=true;
 await assert.rejects(buyAdvance(actor,{professionId:owned.id,group:'skills',index:'1'},catalogue),/save failed/);
 assert.equal(actor.system.spentExperience,spent);assert.equal(owned.system.advances.skills[1].completed,false);
 actor.system.experience=actor.system.spentExperience+400;assert.throws(()=>purchaseBudget(actor,100),/eligible/);
});
test('draft Techniques cannot be learned until configured',async()=>{
 globalThis.foundry={utils:{randomID:()=>String(Math.random())}};
 const actor=fixture();actor.system.experience=1000;
 for(const [uuid,system] of [['Item.draftA',{jutsuRank:'E',nature:'Fire',configured:false}],['Item.draftB',{jutsuRank:'E',nature:'Fire',contentStatus:'draft'}]]){
  const record={name:uuid,type:'technique',system},doc={uuid,toObject:()=>structuredClone(record)};
  await assert.rejects(buyAdvance(actor,{techniqueUuid:uuid},[{...record,uuid,document:doc}]),/still a draft/);
 }
 assert.equal(actor.system.spentExperience,0);assert.equal(actor.items.filter(i=>i.type==='technique').length,0);
});
test('manifest opens the system socket used by pools, rerolls, damage, and clones',async()=>{
 const manifest=JSON.parse(await readFile('system.json','utf8'));
 for(const file of ['pools','rerolls','damage','clones'])assert.match(await readFile(`scripts/${file}.mjs`,'utf8'),/game\.socket\.emit\(`system\.\$\{SYSTEM_ID\}`/);
 assert.equal(manifest.socket,true);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spendTechnique, releaseTechnique, migrateTechniqueData,techniqueOutcome,TECHNIQUE_OUTCOMES } from "../scripts/techniques.mjs";
import { secondary } from "../scripts/rules.mjs";
globalThis.game={combat:{started:true}};
function fixture(){
 const actor={isOwner:true,inCombat:true,system:{chakra:{value:10},actions:3},update:async changes=>{await Promise.resolve();actor.system.chakra.value=changes["system.chakra.value"];actor.system.actions=changes["system.actions"];}};
 const item={isOwner:true,parent:actor,type:"technique",system:{configured:true,chakraCost:4,actionCost:2}};
 return {actor,item};
}
test("fixed Technique use deducts Chakra and AP together and blocks repeat overspending",async()=>{
 const {actor,item}=fixture();
 const outcomes=await Promise.allSettled([spendTechnique(actor,item),spendTechnique(actor,item)]);
 assert.equal(outcomes.filter(outcome=>outcome.status==="fulfilled").length,1);
 assert.match(outcomes[1].reason.message,/Not enough/);
 assert.equal(actor.system.chakra.value,6);assert.equal(actor.system.actions,1);
});
test("Technique use rejects invalid costs, drafts, and foreign or unowned Items without spending",async()=>{
 const {actor,item}=fixture();
 for(const costs of [{chakra:-1,actions:1},{chakra:1.5,actions:1},{chakra:1,actions:4},{chakra:1,actions:NaN}])await assert.rejects(spendTechnique(actor,item,costs),/whole numbers/);
 item.system.variableCost=true;await assert.rejects(spendTechnique(actor,item),/variant/);
 item.system.configured=false;await assert.rejects(spendTechnique(actor,item,{chakra:1,actions:1}),/draft/);
 item.system.configured=true;item.parent={};await assert.rejects(spendTechnique(actor,item,{chakra:1,actions:1}),/owned/);
 item.parent=actor;actor.isOwner=false;await assert.rejects(spendTechnique(actor,item,{chakra:1,actions:1}),/owned/);
 assert.equal(actor.system.chakra.value,10);assert.equal(actor.system.actions,3);
});
test("variable totals and zero-cost Techniques work; failed saves do not announce successful use",async()=>{
 const {actor,item}=fixture();item.system.variableCost=true;
 await spendTechnique(actor,item,{chakra:6,actions:1});assert.equal(actor.system.chakra.value,4);assert.equal(actor.system.actions,2);
 item.system.variableCost=false;item.system.chakraCost=0;item.system.actionCost=0;
 await spendTechnique(actor,item);assert.equal(actor.system.chakra.value,4);assert.equal(actor.system.actions,2);
 actor.update=async()=>{throw Error("Save failed");};await assert.rejects(spendTechnique(actor,item),/Save failed/);
});
test("Technique migration preserves rule text and partial updates do not overwrite dropdowns",()=>{
 const source={jutsuType:"Bukijutsu (Kenjutsu)",duration:"Maintained - 2 Chakra per Turn",range:"Medium (1-10 Paces) Cone",jutsuRank:"E / D",actionType:"Attack"};
 const migrated=migrateTechniqueData(source);
 assert.equal(migrated,source);assert.equal(source.jutsuType,"Bukijutsu");assert.equal(source.duration,"Maintained");assert.equal(source.durationText,"Maintained - 2 Chakra per Turn");assert.equal(source.template,"Cone");assert.equal(source.range,"Medium");assert.equal(source.jutsuRank,"E");assert.equal(source.jutsuRankText,"E / D");
 const partial={description:"Edited"};migrateTechniqueData(partial,{partial:true});assert.deepEqual(partial,{description:"Edited"});
 const choices={duration:"Maintained",range:"Long",jutsuRank:"S"};migrateTechniqueData(choices,{partial:true});assert.deepEqual(choices,{duration:"Maintained",range:"Long",jutsuRank:"S"});
});
test("Internalized costs reserve maximum Chakra once and End restores capacity without refilling",async()=>{
 const actor={isOwner:true,inCombat:true,system:{attributes:{combat:40,brawn:50,agility:40,perception:40,intelligence:40,willpower:40,fellowship:40},tier:1,actions:3,chakraReservations:{},chakra:{value:9,max:9}}};
 const item={id:"needles",isOwner:true,parent:actor,type:"technique",system:{configured:true,chakraCost:1,actionCost:1,chakraCostMode:"pool"}};
 actor.update=async changes=>{for(const [key,value] of Object.entries(changes)){
   if(key==="system.chakra.value")actor.system.chakra.value=value;else actor.system[key.split('.').at(-1)]=value;
 }actor.system.chakra.max=secondary(actor.system,[item]).chakra;};
 await spendTechnique(actor,item);assert.equal(actor.system.chakra.max,8);assert.equal(actor.system.chakra.value,8);assert.equal(actor.system.actions,2);
 await assert.rejects(spendTechnique(actor,item),/already internalized/);assert.equal(actor.system.actions,2);
 assert.equal(await releaseTechnique(actor,item),true);assert.equal(actor.system.chakra.max,9);assert.equal(actor.system.chakra.value,8);assert.equal(actor.system.actions,2);
 assert.equal(await releaseTechnique(actor,item),false);
 actor.system.chakraReservations={deletedItem:4};assert.equal(secondary(actor.system,[item]).chakra,9);
});
test("book import contains all 123 unique cards with source pages, ranks, and intact effects",async()=>{
 const records=JSON.parse(await readFile("data/book-techniques.json","utf8"));
 assert.equal(records.length,123);assert.equal(new Set(records.map(record=>record.name)).size,123);
 assert.deepEqual(Object.fromEntries(["Bukijutsu","Genjutsu","Ninjutsu","Taijutsu"].map(type=>[type,records.filter(record=>record.system.jutsuType===type).length])),{Bukijutsu:31,Genjutsu:28,Ninjutsu:43,Taijutsu:21});
 for(const record of records){assert.match(record.system.source,/PDF p\./);assert.match(record.system.description,/<h3>Effect<\/h3><p>.+/);assert.ok(["E","D","C","B","A","S"].includes(record.system.jutsuRank));}
 assert.ok(records.find(record=>record.name.startsWith("Suizou")).system.description.includes("10 Litres"));
 assert.equal(records.find(record=>record.name.startsWith("Agari-Uchi")).system.actionCost,3);
 assert.equal(records.find(record=>record.name.startsWith("Enma Ibuki")).system.configured,false);
});
test('Entou uses 6 of 9 Chakra with zero AP outside combat on either Actor type, but combat still requires AP',async()=>{
 const record=JSON.parse(await readFile('data/book-techniques.json','utf8')).find(r=>r.name==='Entou (Flame Sword)');
 for(const type of ['npc','character']){
  const {actor,item}=fixture();actor.type=type;actor.inCombat=false;actor.system.chakra.value=9;actor.system.actions=0;item.name=record.name;item.system=record.system;
  assert.deepEqual(await spendTechnique(actor,item),{chakra:6,actions:0});assert.equal(actor.system.chakra.value,3);assert.equal(actor.system.actions,0);
  actor.inCombat=true;actor.system.chakra.value=9;await assert.rejects(spendTechnique(actor,item),/Not enough AP/);assert.equal(actor.system.chakra.value,9);
  actor.system.actions=1;await spendTechnique(actor,item);assert.equal(actor.system.actions,0);assert.equal(actor.system.chakra.value,3);
 }
});
test('all Technique sources retain four outcome fields and map source Supreme headings to Sublime',async()=>{
 const book=JSON.parse(await readFile('data/book-techniques.json','utf8')),expansion=JSON.parse(await readFile('data/expansions/jutsu.json','utf8'));
 for(const record of [...book,...expansion])for(const key of Object.keys(TECHNIQUE_OUTCOMES))assert.equal(typeof record.system[key],'string',`${record.name}: ${key}`);
 const replacement=expansion.find(r=>r.name==='Body Replacement (Kawarimi)');assert.match(replacement.system.criticalSuccess,/waive the AP cost/);assert.match(replacement.system.sublimeSuccess,/full Movement/);assert.equal(replacement.system.sublimeFailure,'');
 const item={system:{criticalSuccess:'Critical rule',sublimeSuccess:'Sublime rule'}};
 assert.equal(techniqueOutcome(item,{total:11,critical:true,success:true}).text,'Critical rule');assert.equal(techniqueOutcome(item,{total:1,critical:true,success:true}).text,'Sublime rule');assert.equal(techniqueOutcome(item,{total:28,critical:false,success:true}),null);
 const legacy={description:'<h3>Supreme Failure</h3><p>Lose your footing.</p>'};migrateTechniqueData(legacy);assert.equal(legacy.sublimeFailure,'Lose your footing.');
});

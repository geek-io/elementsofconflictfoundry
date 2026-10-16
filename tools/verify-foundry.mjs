// Optional real-schema/pack validation using a locally installed Foundry distribution.
// Usage: node tools/verify-foundry.mjs "C:/Program Files/Foundry Virtual Tabletop/resources/app"
import { readFile, readdir, mkdir, mkdtemp } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { extractPack } from "@foundryvtt/foundryvtt-cli";
if (!process.argv[2]) throw Error("Provide the local Foundry app directory");
await import(pathToFileURL(resolve(process.argv[2], "common/server.mjs")).href);
const { EocActorModel, EocItemModel, EocRecordModel, EocTraitModel, EocProfessionModel, EocJutsuModel, EocHeritageModel } = await import("../scripts/models.mjs");
const { SKILLS, PHYSICAL_TYPES,ITEM_TYPES } = await import("../scripts/config.mjs");
globalThis.CONFIG={Actor:{dataModels:{character:EocActorModel}}};
const {systemEffectKeys}=await import('../scripts/effect-keys.mjs');
assert.equal(systemEffectKeys().flatMap(group=>group.keys).length,57);
const itemModel = type => ({trait:EocTraitModel,profession:EocProfessionModel,jutsu:EocJutsuModel,technique:EocJutsuModel,spell:EocJutsuModel,ritual:EocJutsuModel,heritage:EocHeritageModel})[type] ?? (PHYSICAL_TYPES.includes(type) ? EocItemModel : EocRecordModel);
CONFIG.Actor.dataModels.npc=EocActorModel;CONFIG.Item={dataModels:Object.fromEntries(ITEM_TYPES.map(type=>[type,itemModel(type)]))};
const {parseNPCText}=await import('../scripts/import-data.mjs');const {validateImport,resolveNPCTechniques}=await import('../scripts/import-service.mjs');
const npcGuide=parseNPCText(await readFile('tests/fixtures/npc-guide.txt','utf8')),techniqueSources=JSON.parse(await readFile('data/book-techniques.json','utf8'));
await resolveNPCTechniques(npcGuide,techniqueSources.map(record=>({name:record.name,load:async()=>({uuid:'test',toObject:()=>record})})));validateImport(npcGuide,'npc');
assert.equal(npcGuide[0].data.system.npcDefenses.parry,55);assert.equal(npcGuide[0].data.items.find(i=>i.name==='Maul').system.actionType,'Combat');
const traitCosts=new EocTraitModel({audience:'antagonist',active:true,actionCost:2,misfortuneCost:3,actionType:'Non-Combat'});traitCosts.updateSource({audience:'antagonist',actionCost:1});assert.equal(traitCosts.active,true);assert.equal(traitCosts.actionCost,1);assert.equal(traitCosts.actionType,'Non-Combat');
const nullableChance=new EocItemModel({testChance:55});nullableChance.updateSource({testChance:''});assert.equal(nullableChance.testChance,null);
const profession = new EocProfessionModel({upstream:{talents:[{name:"Test Talent",purchased:true}]}});
assert.equal(Object.keys(profession.advances.talents).length,3);
assert.equal(Object.keys(profession.advances.skills).length,10);
assert.equal(Object.keys(profession.advances.bonuses).length,7);
assert.equal(profession.advances.talents[0].name,"Test Talent");
assert.equal(profession.advances.talents[0].completed,true);
profession.updateSource({equipment:[{id:'custom',name:'Custom blade',type:'weapon',system:{quantity:2,damageFormula:'1d6x6'}}]});
assert.equal(profession.equipment[0].system.quantity,2);assert.equal(profession.advances.talents[0].completed,true);
for(const key of ['criticalSuccess','criticalFailure','sublimeSuccess','sublimeFailure'])assert.equal(new EocJutsuModel({})[key],'');
const migratedOutcome=new EocJutsuModel({description:'<h3>Supreme Success</h3><p>Source outcome.</p>'});assert.equal(migratedOutcome.sublimeSuccess,'Source outcome.');
migratedOutcome.updateSource({criticalSuccess:'Edited outcome.'});assert.equal(migratedOutcome.sublimeSuccess,'Source outcome.');
for(const Model of [EocProfessionModel,EocTraitModel,EocRecordModel])for(const field of ["quantity","price","encumbrance"])assert.equal(field in Model.schema.fields,false);
assert.equal(new EocItemModel({encumbrance:0.25}).encumbrance,0.25);
const jutsuModel=new EocJutsuModel({jutsuRank:"C",nature:"Ice",duration:"Maintained (1/round)",chakraCostText:"3/clone",chakraCost:3});
assert.equal(jutsuModel.jutsuRank,"C");assert.equal(jutsuModel.chakraCostText,"3/clone");assert.equal(jutsuModel.configured,true);
assert.equal(jutsuModel.duration,"Maintained");assert.equal(jutsuModel.durationText,"Maintained (1/round)");
jutsuModel.updateSource({description:"Edited"});assert.equal(jutsuModel.duration,"Maintained");
jutsuModel.updateSource({duration:"Instantaneous"});assert.equal(jutsuModel.durationText,"Maintained (1/round)");
const newTechnique=new EocJutsuModel({jutsuType:"Fuinjutsu",jutsuRank:"S",duration:"Internalized",actionType:"Reaction",range:"Super Long",template:"Explosion"});
for(const [key,value] of Object.entries({jutsuType:"Fuinjutsu",jutsuRank:"S",duration:"Internalized",actionType:"Reaction",range:"Super Long",template:"Explosion"}))assert.equal(newTechnique[key],value);
const heritageModel=new EocHeritageModel({bonusModifiers:{brawn:1,agility:-1},tiers:{chunin:{boon:"Known tier rule",bane:"Known restriction"}}});
assert.deepEqual(Array.from(heritageModel.modifiers,row=>({...row})),[{attribute:"brawn",value:1},{attribute:"agility",value:-1}]);assert.equal(heritageModel.boons[0].description,"Known tier rule");
assert.equal(heritageModel.banes[0].tier,2);
heritageModel.updateSource({description:"Edited description"});assert.equal(heritageModel._source.modifiers.length,2);assert.equal(heritageModel._source.boons.length,1);
heritageModel.updateSource({modifiers:[],boons:[]});heritageModel.updateSource({description:"Edited again"});assert.equal(heritageModel._source.modifiers.length,0);assert.equal(heritageModel._source.boons.length,0);
for(const field of ["bonusChoices","attributeModifiers","skillModifiers","untrainedBonus"])assert.equal(field in EocHeritageModel.schema.fields,false);
const removed=new EocHeritageModel({bonusModifiers:{brawn:1},tiers:{genin:{boon:"Old rule"}},modifiers:[],boons:[],banes:[]});
assert.equal(removed.modifiers.length,0);assert.equal(removed.boons.length,0);
const preserved = new EocActorModel({ attributes: { combat: 45, brawn: 56 }, profession: "Existing Shinobi", notes: "Existing notes", chakra: { value: 7, max: 10 }, shonen: 2 });
assert.equal(preserved.attributes.combat, 45); assert.equal(preserved.profession, "Existing Shinobi"); assert.equal(preserved.chakra.value, 7); assert.equal(preserved.shonen, 2); assert.equal(preserved.notes, "Existing notes"); assert.equal(Object.keys(preserved.skills).length, SKILLS.length);
assert.equal(new EocActorModel({ skills: { ninjutsu: 4 } }).skills.ninjutsu, 3);
const manifest = JSON.parse(await readFile("system.json", "utf8"));
globalThis.release = { version: "14.367", generation: 14, maxStableGeneration: 14, maxGeneration: 14 };
globalThis.getDocumentClass = name => foundry.documents[`Base${name}`];
globalThis.CONFIG={Folder:{dataModels:{}}};
globalThis.game={release:globalThis.release,system:manifest,user:{id:null},model:{Folder:{Item:{}}}};
assert.equal(new foundry.packages.BaseSystem(manifest).validate(), true);
assert.equal(foundry.packages.BaseSystem.testAvailability(manifest), CONST.PACKAGE_AVAILABILITY_CODES.VERIFIED);
let items=0, actors=0, tables=0, folderCount=0;
const packTypes=new Set();
const verification=await mkdtemp(resolve("tmp/pack-verification-"));
for (const pack of manifest.packs) {
  const output = resolve(verification, pack.name);
  await mkdir(output, { recursive: true });
  await extractPack(resolve(pack.path), output, { yaml: false });
  const docs=[];
  for (const file of await readdir(output)) {
    if (!file.endsWith(".json")) continue;
    const doc=JSON.parse(await readFile(resolve(output,file),"utf8"));
    docs.push(doc);
    if(doc._key.startsWith("!folders!")){assert.equal(new foundry.documents.BaseFolder(structuredClone(doc)).validate(),true);folderCount++;continue;}
    if (pack.type === "Item") { const model=new (itemModel(doc.type))(doc.system); assert.ok(manifest.documentTypes.Item[doc.type]); assert.ok(doc.img.startsWith(`systems/${manifest.id}/icons/`)); await readFile(doc.img.replace(`systems/${manifest.id}/`,""));packTypes.add(doc.type); items++;
      if(["technique","jutsu"].includes(doc.type))for(const key of ["jutsuType","jutsuRank","duration","actionType","range","template"])assert.equal(model[key],doc.system[key],`${doc.name}: ${key} changed by schema validation`);
    }
    if (pack.type === "Actor") {
      new EocActorModel(doc.system); assert.ok(doc.items.every(i=>typeof i==="object"));
      for (const item of doc.items) new (itemModel(item.type))(item.system);
      actors++;
    }
    if (pack.type === "RollTable") { assert.ok(Array.isArray(doc.results)); tables++; }
  }
  const folders=new Map(docs.filter(doc=>doc._key.startsWith("!folders!")).map(doc=>[doc._id,doc]));
  for(const doc of docs)if(doc.folder)assert.ok(folders.has(doc.folder),`${doc.name} has a missing folder`);
  if(pack.name==="eoc-book-techniques"){
    assert.equal(docs.filter(doc=>doc.type==="technique").length,157);
    assert.deepEqual([...folders.values()].filter(doc=>!doc.folder).map(doc=>doc.name).sort(),["Bukijutsu","Fuinjutsu","Genjutsu","Ninjutsu","Taijutsu"]);
    for(const doc of docs.filter(doc=>doc.type==="technique")){
      const rank=folders.get(doc.folder),element=folders.get(rank.folder),type=folders.get(element.folder);
      assert.equal(rank.name,`${doc.system.jutsuRank}-Rank`);assert.equal(element.name,doc.system.nature);assert.equal(type.name,doc.system.jutsuType);
    }
  }
  if(pack.name==="eoc-heritages"){
    const entries=docs.filter(doc=>doc.type==="heritage");assert.equal(entries.length,21);
    for(const doc of entries)for(const side of ["boons","banes"])assert.deepEqual(doc.system[side].map(row=>row.tier),[1,2,3]);
  }
}
assert.equal(items,349); assert.equal(actors,0); assert.equal(tables,0);
assert.deepEqual([...packTypes].sort(),["armor","gear","heritage","medicine","profession","skill","talent","technique","tool","trait","weapon"]);
assert.deepEqual((await readdir("packs")).sort(), manifest.packs.map(pack=>pack.name).sort());
assert.ok(manifest.packs.every(pack=>pack.name.startsWith("eoc-")));
console.log(`Real Foundry schemas and availability passed; ${items} Items and ${folderCount} folders extracted and checked. Book Type/Element/Rank hierarchy and Heritage tiers verified. Existing Actor fields preserved.`);

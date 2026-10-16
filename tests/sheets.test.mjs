import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SKILLS, ATTRIBUTES, JUTSU_TYPES } from "../scripts/config.mjs";
import { secondary } from "../scripts/rules.mjs";
let spend={chakra:4,actions:2},prompts=0,warnings=[],posted=[];
class BaseSheet {async _prepareContext(){return {editable:true};} async _onDropItem(event,item){return item;} }
globalThis.foundry={applications:{handlebars:{renderTemplate:async()=>'<article></article>'},api:{ApplicationV2:BaseSheet,HandlebarsApplicationMixin:Base=>Base,DialogV2:{prompt:async()=>{prompts++;return spend&&{modifier:0,difficulty:0,mode:'normal',messageMode:'public',...spend};}}},sheets:{ActorSheetV2:BaseSheet,ItemSheetV2:BaseSheet},ux:{TextEditor:{implementation:{enrichHTML:async text=>text}}}},utils:{escapeHTML:String}};
globalThis.CONFIG={ChatMessage:{modes:{public:{label:'Public'}}}};
globalThis.ChatMessage={getSpeaker:()=>({actor:'actor'}),create:async data=>{posted.push(data);return data;}};
globalThis.Roll=class {async evaluate(){this.total=28;return this;}getTooltip(){return '';}async toMessage(data){posted.push(data);return data;}};
globalThis.game={combat:{started:true},i18n:{localize:key=>key},settings:{get:()=>3},packs:[]};
globalThis.ui={notifications:{warn:message=>warnings.push(message),info:()=>{}}};
const {EocActorSheet,EocItemSheet}=await import("../scripts/sheets.mjs");
const {EocLibrary}=await import("../scripts/library.mjs");
function fixture(){
 const items=[{id:"weapon",type:"weapon",name:"Kunai",system:{}},{id:"skill",type:"skill",name:"Athletics",system:{}},...JUTSU_TYPES.map(type=>({id:type,type,name:type,system:{configured:true,chakraCost:4,actionCost:2}})),{id:"heritage",type:"heritage",name:"Iburi",system:{heritageEnabled:true}}];
 items.contents=items;items.get=id=>items.find(item=>item.id===id);
 const system={attributes:Object.fromEntries(Object.keys(ATTRIBUTES).map(key=>[key,40])),bonusAdjustments:{},skills:Object.fromEntries(SKILLS.map(skill=>[skill.key,0])),dodgeSkill:"coordination",parrySkill:"bukijutsu",tier:1,chakra:{value:10,max:8},actions:3,damageState:0,perilState:0};system.secondary=secondary(system,items);
 const actor={documentName:"Actor",isOwner:true,inCombat:true,system,items,_source:{system:structuredClone(system)},allApplicableEffects:()=>[],update:async changes=>{for(const [key,value] of Object.entries(changes)){if(key==="system.chakra.value")system.chakra.value=value;else if(key==="system.actions")system.actions=value;else system[key.split('.').at(-1)]=value;}}};
 for(const item of items){item.parent=actor;item.isOwner=true;}
 return actor;
}
test("sheet routing keeps skill and every jutsu type out of Inventory",async()=>{
 const sheet=Object.create(EocActorSheet.prototype);sheet.actor=fixture();
 const context=await sheet._prepareContext({});
 assert.deepEqual(context.groups.map(group=>group.type),["weapon"]);
 assert.deepEqual(context.jutsuGroups.map(group=>group.type),JUTSU_TYPES);
 assert.equal(context.skillRecords[0].id,"skill");
 assert.equal(context.identityGroups[0].type,"heritage");
 assert.equal(context.identityGroups[0].items[0].selectedHeritage,true);
 assert.equal(context.dodge.skill.attribute,"agility");
 sheet.actor.items.push({id:'talent',type:'talent',name:'Polymath',system:{}});
 sheet.actor.type='npc';
 const npc=await sheet._prepareContext({});
 assert.equal(npc.npc,true);assert.equal(npc.weapons[0].id,'weapon');
 assert.ok(npc.identityGroups.some(group=>group.type==='talent'));
 assert.ok(!npc.groups.some(group=>group.type==='talent'));

});
test("Jutsu use handles drafts, cancellation, insufficient funds, and actual variable totals",async()=>{
 const sheet={actor:fixture()},item=sheet.actor.items.get("technique"),target={dataset:{id:"technique"}};
 item.system.configured=false;prompts=0;
 await EocActorSheet.useTechnique.call(sheet,null,target);assert.equal(prompts,0);assert.equal(sheet.actor.system.chakra.value,10);
 item.system.configured=true;item.system.variableCost=true;spend=null;await EocActorSheet.useTechnique.call(sheet,null,target);assert.equal(sheet.actor.system.chakra.value,10);
 spend={chakra:11,actions:2};await EocActorSheet.useTechnique.call(sheet,null,target);assert.equal(sheet.actor.system.chakra.value,10);
 spend={chakra:6,actions:2};await EocActorSheet.useTechnique.call(sheet,null,target);assert.equal(sheet.actor.system.chakra.value,4);assert.equal(sheet.actor.system.actions,1);
});
test("adding an inactive Heritage leaves the selected identity intact",async()=>{
 const sheet=Object.create(EocActorSheet.prototype);sheet.actor=fixture();sheet.actor.system.heritage="Iburi";
 await sheet._onDropItem(null,{id:"new",name:"Uchiha",type:"heritage",system:{heritageEnabled:false}});
 assert.equal(sheet.actor.system.heritage,"Iburi");
});
test("one confirmed Technique Use spends costs and posts its test; cancel spends nothing",async()=>{
 const sheet={actor:fixture()},target={dataset:{id:"technique"}};prompts=0;posted=[];spend=null;
 await EocActorSheet.useTechnique.call(sheet,null,target);
 assert.equal(sheet.actor.system.actions,3);assert.equal(posted.length,0);
 spend={chakra:4,actions:2};
 await EocActorSheet.useTechnique.call(sheet,null,target);
 assert.equal(prompts,2);assert.equal(sheet.actor.system.chakra.value,6);assert.equal(sheet.actor.system.actions,1);
 assert.equal(posted.length,1);assert.equal(posted[0].flags.elementsofconflictfoundry.test.itemId,'technique');
});
test("Compendium Browser opens without an Actor",async()=>{
 const context=await new EocLibrary()._prepareContext({});
 assert.equal(context.editable,false);assert.equal(context.actorName,undefined);assert.equal(context.total,0);
});
test("expansion snapshots include named entries and retain draft costs",async()=>{
 const jutsu=JSON.parse(await readFile("data/expansions/jutsu.json","utf8"));
 const heritage=JSON.parse(await readFile("data/expansions/heritages.json","utf8"));
 assert.equal(jutsu.length,34);assert.equal(jutsu.filter(record=>record.system.configured).length,22);
 assert.equal(jutsu.find(record=>record.name==="Ice Sword").system.configured,false);
 assert.equal(jutsu.find(record=>record.name==="Transformation (Henge)").system.chakraCostText,"3 (Simple Illusion) or 10 (Complex Shell)");
 assert.equal(heritage.length,21);assert.equal(heritage.find(record=>record.name==="Kurama").system.modifiers.filter(row=>row.attribute==="fellowship").reduce((sum,row)=>sum+row.value,0),2);
 assert.equal(heritage.find(record=>record.name.startsWith("Iburi")).system.modifiers.find(row=>row.attribute==="agility").value,1);
 assert.ok(heritage.find(record=>record.name.startsWith("Yuki")).system.banes.find(row=>row.tier===3).description.includes("???"));
 assert.ok(jutsu.every(record=>!record.name.startsWith("Name of Technique")));
});

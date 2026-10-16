import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseNPCText,npcFromFields,parseItemText,itemFromFields,damageFormula,parseTrait} from '../scripts/import-data.mjs';
import {resolveNPCTechniques,validateImport,prepareImport,createImport,resolveProfessionTalents} from '../scripts/import-service.mjs';
import {secondary} from '../scripts/rules.mjs';
import {actorTestChance} from '../scripts/npc-tests.mjs';
const guide=await readFile('tests/fixtures/npc-guide.txt','utf8');
test('Google Docs guide tables import only the two populated NPCs, preserving printed stats and owned Items',()=>{
 const result=parseNPCText(guide);assert.deepEqual(result.map(r=>r.data.name),['Bear','Genin (Rime)']);
 const bear=result[0].data,genin=result[1].data;
 assert.equal(bear.system.bonusAdjustments.combat,1);assert.equal(bear.system.bonusAdjustments.brawn,1);assert.equal(bear.system.skills.athletics,1);
 const stats=secondary(bear.system,bear.items);assert.equal(stats.damage,10);assert.equal(stats.peril,7);assert.equal(stats.movement,8);assert.equal(stats.initiative,7);
 assert.equal(bear.system.npcSize,'Large');assert.equal(bear.system.npcDefenses.parry,55);assert.equal(bear.system.npcDefenses.dodge,50);
 const bite=bear.items.find(i=>i.name==='Bite');assert.equal(bite.system.damageFormula,'2d6x6+5');assert.equal(bite.system.testChance,55);assert.equal(bite.system.qualities,'Punishing, Vicious');
 const maul=bear.items.find(i=>i.name==='Maul');assert.equal(maul.system.actionCost,3);assert.equal(maul.system.misfortuneCost,3);assert.equal(maul.system.actionType,'Combat');
 assert.equal(genin.system.chakra.value,10);assert.equal(secondary(genin.system,genin.items).chakra,10);assert.equal(genin.system.skills.ninjutsu,1);assert.equal(genin.system.skills.genjutsu,undefined);assert.match(result[1].warnings[0],/Skill choice/);
 assert.equal(genin.items.filter(i=>i.type==='technique').length,3);assert.equal(genin.items.find(i=>i.name==='Desperate Assault').system.actionCost,1);
});
test('labelled NPC fields and sections work, and incomplete tables cannot silently create Actors',()=>{
 const text='Name: Test NPC\nCombat: 45 [5]\nBrawn: 40\nAgility: 50\nPerception: 40\nIntelligence: 35\nWillpower: 45\nFellowship: 40\nChakra Pool: 9\nTraits\n* Surprise (2 Misfortune, 1 AP, Special Action): A trick.\n';
 const [result]=parseNPCText(text);assert.equal(result.data.name,'Test NPC');assert.equal(result.data.system.chakra.value,9);assert.equal(result.data.items[0].system.actionType,'Special');
 assert.throws(()=>parseNPCText('Name\nCombat\nBrawn\nAgility\nPerception\nIntelligence\nWillpower\nFellowship'),/Combat|name/i);
 assert.throws(()=>npcFromFields({name:'Missing Attributes'}),/Combat/);
});
test('Technique references resolve to book types and skills; unresolved or ambiguous names remain visible drafts',async()=>{
 const book=JSON.parse(await readFile('data/book-techniques.json','utf8')),index=book.map(record=>({name:record.name,load:async()=>({uuid:'Compendium.test',toObject:()=>structuredClone(record)})}));
 const result=await resolveNPCTechniques(parseNPCText(guide),index),techniques=result[1].data.items.filter(i=>i.type==='technique');
 assert.deepEqual(techniques.map(i=>i.system.skill),['taijutsu','bukijutsu','ninjutsu']);assert.ok(techniques.every(i=>i.system.configured));assert.deepEqual(techniques.map(i=>i.system.actionCost),[1,1,3]);
 const drafts=await resolveNPCTechniques(parseNPCText(guide),[]);assert.ok(drafts[1].data.items.filter(i=>i.type==='technique').every(i=>!i.system.configured));assert.match(drafts[1].warnings.at(-1),/no matching Technique/);
});
test('a world copy of the same Technique does not become an ambiguous compendium match',async()=>{
 const book=JSON.parse(await readFile('data/book-techniques.json','utf8')),worldRecord=book.find(r=>r.name.includes('Blade Rush'));
 globalThis.game={user:{isGM:true},items:{contents:[{...worldRecord,visible:true,toObject:()=>structuredClone(worldRecord)}]},packs:[{metadata:{packageName:'elementsofconflictfoundry',name:'eoc-book-techniques'},documentName:'Item',visible:true,getIndex:async()=>book.map((record,index)=>({...record,_id:index})),getDocument:async id=>({toObject:()=>structuredClone(book[id])})}]};
 const results=await resolveNPCTechniques(parseNPCText(guide));assert.equal(results[1].data.items.find(i=>i.name==='Blade Rush').system.configured,true);
});
test('Item text, multi-record separators, JSON, and Antagonist cost metadata retain their values',()=>{
 const items=parseItemText('Name: Custom Kunai\nType: weapon\nQuantity: 2\nEncumbrance: 0.25\nDamage: 1d6+4\nSkill: Bukijutsu\n---\nName: Trick\nType: Antagonist Trait\nAction Cost: 2\nMisfortune Cost: 3\nAction Type: Non-Combat\nDescription: Misdirect the target.');
 assert.equal(items[0].data.system.encumbrance,0.25);assert.equal(items[0].data.system.damageFormula,'1d6x6+4');assert.equal(items[1].data.type,'trait');assert.equal(items[1].data.system.actionType,'Non-Combat');assert.equal(items[1].data.system.spendMisfortune,true);
 const json=parseItemText(JSON.stringify({_id:'old-id',name:'Medicine',type:'medicine',ownership:{default:3},system:{quantity:4}}))[0].data;assert.equal(json._id,undefined);assert.equal(json.ownership,undefined);assert.equal(json.system.quantity,4);
 assert.equal(damageFormula('1d6x6 + @bonuses.brawn'),'1d6x6 + @bonuses.brawn');assert.equal(damageFormula('1d6 + [BB]'),'1d6x6 + @bonuses.brawn');
 assert.equal(parseTrait('Trick (1 Misfortune, 0 AP, Non-Combat Action): Distract.').system.actionType,'Non-Combat');
 assert.throws(()=>parseItemText('Name: No Type'),/Type/);assert.throws(()=>parseItemText('{bad'),/JSON/);assert.throws(()=>itemFromFields({name:'Bad',type:'weapon',quantity:'-1'}),/number/);
});
test('fixed NPC defense and attack chances apply to their rolls and dialog modifiers without affecting PCs',()=>{
 const system={attributes:{combat:40,agility:40},skills:{bukijutsu:1,coordination:1},npcDefenses:{parry:60},perilState:0},actor={type:'npc',system};
 assert.equal(actorTestChance(actor,'bukijutsu',5,-10,{label:'Parry'}).chance,55);
 assert.equal(actorTestChance(actor,'bukijutsu',0,0,{item:{system:{testChance:65}}}).chance,65);
 system.perilState=2;assert.equal(actorTestChance(actor,'bukijutsu',0,0,{label:'Parry'}).chance,50);
 assert.equal(actorTestChance({...actor,type:'character'},'bukijutsu',0,0,{label:'Parry'}).chance,40);
});
test('preview rejects schema failures and creation rechecks permissions before making a document',async()=>{
 let creates=0;class Model{constructor(source){if(source.quantity<0)throw Error('Invalid quantity');this.source=source;}toObject(){return this.source;}}
 globalThis.CONFIG={Actor:{dataModels:{npc:Model}},Item:{dataModels:{gear:Model}}};globalThis.game={user:{isGM:true},folders:{get:()=>null}};
 globalThis.Item={implementation:{createDocuments:async data=>{creates++;return data;}}};
 const plan=await prepareImport({kind:'item',mode:'text',text:'Name: Rations\nType: gear\nQuantity: 2'});assert.equal(creates,0);await createImport(plan,'item');assert.equal(creates,1);
 assert.throws(()=>validateImport([{data:{name:'Bad',type:'gear',system:{quantity:-1}}}],'item'),/quantity/);
 game.user={isGM:false,can:()=>false};await assert.rejects(createImport(plan,'item'),/permission/);assert.equal(creates,1);
});
test('profession import accepts ten Skills, seven Bonus Advances, and three Talents in fields or text',async()=>{
 const fields={name:'Custom Profession',type:'profession'};
 const skills=['Athletics','Awareness','Bargain','Coordination','Intimidate','Resolve','Stealth','Survival','Taijutsu','Toughness'];skills.forEach((name,i)=>fields['skill'+i]=name);
 const bonuses=['Combat','Brawn','Agility','Perception','Intelligence','Willpower','Fellowship'];bonuses.forEach((name,i)=>fields['bonus'+i]=name);
 ['Polymath','New Talent','Another Talent'].forEach((name,i)=>fields['talent'+i]=name);
 const result=itemFromFields(fields),a=result.data.system.advances;assert.deepEqual(Object.values(a.skills).map(slot=>slot.name),skills);assert.deepEqual(Object.values(a.bonuses).map(slot=>slot.name),bonuses);assert.equal(Object.values(a.talents).length,3);assert.ok(Object.values(a.skills).every(slot=>!slot.completed));
 const text=parseItemText(`Name: Text Profession\nType: profession\nSkill Ranks:\n${skills.map(name=>'* '+name+' +10').join('\n')}\nBonus Advances: ${bonuses.join(', ')}\nTalents: Polymath, New Talent, Another Talent`)[0];assert.deepEqual(text.data.system.advances,a);
 globalThis.game={user:{isGM:true},items:{contents:[{name:'Polymath',uuid:'Item.polymath',type:'talent',visible:true}]},packs:[]};await resolveProfessionTalents([result]);assert.equal(a.talents[0].uuid,'Item.polymath');assert.equal(a.talents[1].name,'New Talent');assert.match(result.warnings[0],/no matching Item/);
 assert.throws(()=>itemFromFields({name:'Too many',type:'profession',skillranks:Array(11).fill('Athletics').join('\n')}),/at most 10/);
});

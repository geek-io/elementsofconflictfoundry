import test from 'node:test';
import assert from 'node:assert/strict';
import {itemFromFields,parseItemText} from '../scripts/import-data.mjs';
import {migrateItemSource,persistItemMigrations,RETIRED_ITEM_TYPES} from '../scripts/item-migration.mjs';
import {ITEM_TYPES,JUTSU_TYPES,SYSTEM_ID} from '../scripts/config.mjs';
test('Heritage Fields and labelled expansion text preserve signed bonuses and all three tiers',()=>{
 const fields=itemFromFields({type:'heritage',name:'Test Clan',heritagebrawn:'1',heritageintelligence:'-1',boon1name:'Clan Gift',boon1description:'Genin gift',boon2name:'Clan Gift',boon2description:'Chunin gift',boon3name:'Clan Gift',boon3description:'Jonin gift',bane1name:'Clan Burden',bane1description:'Genin burden'});
 const [pasted]=parseItemText('Test Clan\nModifiers:\n+1 Brawn\n-1 Intelligence\nBoons:\nClan Gift\nGenin Tier - Genin gift\nChunin Tier - Chunin gift\nJonin Tier - Jonin gift\nBanes:\nClan Burden\nGenin Tier - Genin burden',{defaultType:'heritage'});
 for(const key of ['modifiers','boons','banes'])assert.deepEqual(pasted.data.system[key],fields.data.system[key]);
 const [ambiguous]=parseItemText('Name: Pure Lands\nType: heritage\nModifiers:\n+1 to three Primary Attribute Bonuses');assert.equal(ambiguous.warnings.length,1);assert.deepEqual(ambiguous.data.system.modifiers,[]);
 assert.throws(()=>itemFromFields({name:'Clan',type:'heritage',heritagebrawn:0.5}),/whole number/);
});
test('retired Item types migrate without losing ids, effects, costs or old compendium provenance',()=>{
 for(const [previous,type] of Object.entries(RETIRED_ITEM_TYPES)){
  assert.ok(!ITEM_TYPES.includes(previous));
  const source={_id:'abc',name:'Old Record',type:previous,system:{chakraCost:4,description:'Rules'},effects:[{name:'Bonus'}],flags:{core:{sourceId:`Compendium.${SYSTEM_ID}.eoc-jutsu.Item.oldid`}}};
  migrateItemSource(source);assert.equal(source.type,type);assert.equal(source._id,'abc');assert.equal(source.effects[0].name,'Bonus');assert.equal(source.system.chakraCost,4);
  assert.equal(source.flags.core.sourceId,`Compendium.${SYSTEM_ID}.eoc-book-techniques.Item.oldid`);assert.equal(source.flags[SYSTEM_ID].previousItemType,previous);
  migrateItemSource(source);assert.equal(source.flags[SYSTEM_ID].previousItemType,previous);
 }
 assert.deepEqual(JUTSU_TYPES,['technique']);
 const [json]=parseItemText(JSON.stringify({name:'Legacy',type:'ritual',system:{chakraCost:3,actionCost:1}}));assert.equal(json.data.type,'technique');
});
test('active GM persists converted world and embedded records without recreating documents',async()=>{
 const saved=[],make=(type,previous)=>({type,flags:{[SYSTEM_ID]:{previousItemType:previous}},update:async(data,options)=>{saved.push({data,options});}});
 const item=make('technique','jutsu'),owned=make('talent','uniqueAdvance');
 globalThis.game={user:{id:'gm'},users:{activeGM:{id:'gm'}},items:{contents:[item]},actors:{contents:[{items:{contents:[owned]}}]},scenes:{contents:[]}};
 await persistItemMigrations();assert.equal(saved.length,2);assert.ok(saved.every(s=>s.options.diff===false));assert.deepEqual(saved.map(s=>s.data.type),['technique','talent']);
});

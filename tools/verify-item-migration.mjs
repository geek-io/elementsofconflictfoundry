import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
await import(pathToFileURL(resolve(process.argv[2],'common/server.mjs')));
globalThis.Actor=foundry.documents.BaseActor;globalThis.Item=foundry.documents.BaseItem;globalThis.ActiveEffect=foundry.documents.BaseActiveEffect;
const {EocItem}=await import('../scripts/documents.mjs');
const {EocItemModel,EocRecordModel,EocJutsuModel}=await import('../scripts/models.mjs');
const {ITEM_TYPES,PHYSICAL_TYPES,SYSTEM_ID}=await import('../scripts/config.mjs');
const {RETIRED_ITEM_TYPES}=await import('../scripts/item-migration.mjs');
const manifest=JSON.parse(await readFile('system.json','utf8'));
globalThis.CONFIG={Item:{documentClass:EocItem,dataModels:Object.fromEntries(ITEM_TYPES.map(t=>[t,t==='technique'?EocJutsuModel:PHYSICAL_TYPES.includes(t)?EocItemModel:EocRecordModel]))},ActiveEffect:{documentClass:ActiveEffect,dataModels:{}},Actor:{documentClass:Actor,dataModels:{}}};
globalThis.game={model:{Item:Object.fromEntries(ITEM_TYPES.map(t=>[t,new CONFIG.Item.dataModels[t]({}).toObject()])),Actor:{character:{}},ActiveEffect:{base:{}}},system:{...manifest,documentTypes:{Item:ITEM_TYPES}},collections:new Map(),modules:new Map(),release:{generation:14,version:'14.367'}};
globalThis.getDocumentClass=name=>CONFIG[name]?.documentClass??foundry.documents['Base'+name];
for(const [old,type] of Object.entries(RETIRED_ITEM_TYPES)){
 const item=new EocItem({_id:'abcdefghijklmnop',name:'Legacy test',type:old,system:{description:'Rules',chakraCost:4,actionCost:1}});
 assert.equal(item.type,type);assert.equal(item.flags[SYSTEM_ID].previousItemType,old);assert.equal(item._id,'abcdefghijklmnop');assert.equal(item.system.description,'Rules');assert.equal(item.validate(),true);
 if(type==='technique')assert.equal(item.system.chakraCost,4);
}
console.log('Native v14 Item construction migrated every retired type before type validation, preserving IDs and Technique costs.');


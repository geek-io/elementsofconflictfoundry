import {SYSTEM_ID,JUTSU_TYPES} from './config.mjs?v=0.3.15';
import {npcFromFields,itemFromFields,parseNPCText,parseItemText,techniqueAliases} from './import-data.mjs?v=0.3.15';
export function canImport(kind){return Boolean(game.user?.isGM||game.user?.can?.(kind==='npc'?'ACTOR_CREATE':'ITEM_CREATE'));}
export async function talentOptions(){
 const records=(game.items?.contents??[]).filter(item=>item.type==='talent'&&(item.visible||game.user.isGM)).map(item=>({name:item.name,uuid:item.uuid}));
 for(const pack of game.packs??[])if(pack.metadata.packageName===SYSTEM_ID&&pack.metadata.name==='eoc-talents'&&pack.visible){
  for(const item of await pack.getIndex())if(item.type==='talent'&&!records.some(record=>record.name.toLowerCase()===item.name.toLowerCase()))records.push({name:item.name,uuid:`Compendium.${pack.collection}.Item.${item._id}`});
 }
 return records.sort((a,b)=>a.name.localeCompare(b.name));
}
export async function resolveProfessionTalents(results){
 const professions=results.filter(result=>result.data.type==='profession');if(!professions.length)return results;
 const choices=await talentOptions();
 for(const result of professions)for(const slot of Object.values(result.data.system.advances?.talents??{}))if(slot.name&&!slot.uuid){
  const matches=choices.filter(choice=>choice.name.toLowerCase()===slot.name.toLowerCase());
  if(matches.length===1)slot.uuid=matches[0].uuid;else result.warnings.push(`Talent ${slot.name}: ${matches.length?'multiple matching Items':'no matching Item'}. Name retained; link the Talent on the Profession sheet if needed.`);
 }
 return results;
}
async function techniqueIndex(){
 const index=[];
 for(const item of game.items?.contents??[])if(JUTSU_TYPES.includes(item.type)&&(item.visible||game.user.isGM))index.push({name:item.name,load:async()=>item});
 for(const pack of game.packs??[]){
  if(pack.metadata.packageName!==SYSTEM_ID||pack.documentName!=='Item'||!pack.visible)continue;
  if(!['eoc-book-techniques'].includes(pack.metadata.name))continue;
  for(const entry of await pack.getIndex())if(JUTSU_TYPES.includes(entry.type)&&!index.some(known=>known.name.toLowerCase()===entry.name.toLowerCase()))index.push({name:entry.name,load:()=>pack.getDocument(entry._id)});
 }
 return index;
}
export async function resolveNPCTechniques(results,index=null){
 const needed=results.flatMap(result=>result.data.items??[]).some(item=>item.system.upstream?.npcImportReference);if(!needed)return results;
 index??=await techniqueIndex();
 for(const result of results)for(const item of result.data.items??[]){
  if(!item.system.upstream?.npcImportReference)continue;
  const names=techniqueAliases(item.name),matches=index.filter(entry=>techniqueAliases(entry.name).some(alias=>names.some(name=>alias===name||name.length>=6&&alias.endsWith(name))));
  if(matches.length!==1){item.system.configured=false;result.warnings.push(`${item.name}: ${matches.length?'multiple matching Techniques':'no matching Technique'}. Kept as a draft; choose its Technique Type and Skill before use.`);continue;}
  const document=await matches[0].load();if(!document)throw Error(`Cannot read Technique: ${item.name}`);
  const original=item.system,known=document.toObject();
  item.img=known.img;item.effects=known.effects??[];
  item.system={...known.system,testChance:original.testChance,chakraCost:original.chakraCost,actionCost:original.actionCost,chakraCostText:String(original.chakraCost),actionCostText:String(original.actionCost),duration:original.duration,durationText:original.durationText,...(original.template?{template:original.template}:{}),variableCost:false,configured:true,description:original.description||known.system.description,source:'NPC import',upstream:{...known.system.upstream,npcImportReference:false,matchedTechnique:document.uuid}};
 }
 return results;
}
export function validateImport(results,kind){
 if(!results.length||results.length>50)throw Error('Import between 1 and 50 documents at a time.');
 for(const result of results){
  const data=result.data;if(!String(data.name??'').trim())throw Error('Every document needs a name.');
  const Model=kind==='npc'?CONFIG.Actor.dataModels.npc:CONFIG.Item.dataModels[data.type];if(!Model)throw Error(`Unsupported document type: ${data.type}`);
  data.system=new Model(data.system,{strict:true}).toObject();
  if(kind==='npc')for(const item of data.items??[]){const ItemModel=CONFIG.Item.dataModels[item.type];if(!ItemModel)throw Error(`Unsupported Item type: ${item.type}`);item.system=new ItemModel(item.system,{strict:true}).toObject();delete item._id;for(const effect of item.effects??[])delete effect._id;}
 }
 return results;
}
export async function prepareImport({kind,mode,fields={},text=''}){
 if(!canImport(kind))throw Error(`You do not have permission to create ${kind==='npc'?'Actors':'Items'}.`);
 if(String(text).length>250000)throw Error('Paste up to 250,000 characters at a time.');
 let results=mode==='fields'?[kind==='npc'?npcFromFields(fields):itemFromFields(fields)]:kind==='npc'?parseNPCText(text):parseItemText(text,{defaultType:fields.type});
 if(kind==='npc')results=await resolveNPCTechniques(results);
 else results=await resolveProfessionTalents(results);
 return validateImport(results,kind);
}
export async function createImport(results,kind,folder=''){
 if(!canImport(kind))throw Error('You no longer have permission to create these documents.');
 validateImport(results,kind);
 if(folder&&game.folders.get(folder)?.type!==(kind==='npc'?'Actor':'Item'))throw Error('Choose a folder of the matching document type.');
 const data=results.map(result=>({...result.data,...(folder?{folder}:{})}));
 return (kind==='npc'?Actor.implementation:Item.implementation).createDocuments(data);
}

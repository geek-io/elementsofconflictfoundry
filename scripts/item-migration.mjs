import {SYSTEM_ID} from './config.mjs?v=0.3.15';
export const RETIRED_ITEM_TYPES={jutsu:'technique',ritual:'technique',spell:'technique',taint:'condition',uniqueAdvance:'talent'};
export function migrateItemSource(source){
 const previous=source.type;
 if(RETIRED_ITEM_TYPES[previous]){
  source.type=RETIRED_ITEM_TYPES[previous];
  source.flags??={};source.flags[SYSTEM_ID]??={};source.flags[SYSTEM_ID].previousItemType??=previous;
 }
 for(const key of ['_stats','flags'])if(source[key]){
  const replace=value=>typeof value==='string'?value.replaceAll(`${SYSTEM_ID}.eoc-jutsu.`,`${SYSTEM_ID}.eoc-book-techniques.`):Array.isArray(value)?value.map(replace):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replace(v)])):value;
  source[key]=replace(source[key]);
 }
 return source;
}
export async function persistItemMigrations(){
 if(game.users.activeGM?.id!==game.user.id)return;
 const save=async item=>{
  const flags=item.flags?.[SYSTEM_ID];if(!flags?.previousItemType||flags.itemTypesMigrated)return;
  await item.update({type:item.type,[`flags.${SYSTEM_ID}.itemTypesMigrated`]:true},{diff:false});
 };
 for(const item of game.items.contents)await save(item);
 for(const actor of game.actors.contents)for(const item of actor.items.contents)await save(item);
 for(const scene of game.scenes.contents)for(const token of scene.tokens.contents)if(!token.actorLink&&token.actor)for(const item of token.actor.items.contents)await save(item);
}

import {JUTSU_TYPES,PHYSICAL_TYPES,ITEM_TYPES} from './config.mjs?v=0.3.15';
const queues=new WeakMap();
export function usesCombatAP(actor){return Boolean(actor.inCombat && globalThis.game?.combat?.started);}
export function actorAction(actor,task){const next=(queues.get(actor)??Promise.resolve()).catch(()=>{}).then(task);queues.set(actor,next);return next;}
export function creationTypes(section){return section==='inventory'?PHYSICAL_TYPES:section==='identity'?ITEM_TYPES.filter(type=>!PHYSICAL_TYPES.includes(type)&&!JUTSU_TYPES.includes(type)&&type!=='skill'):section==='jutsu'?JUTSU_TYPES:ITEM_TYPES;}
export async function weaponAttack(actor,item,task){
 return actorAction(actor,async()=>{
  if(!actor.isOwner || !item?.isOwner || item.parent!==actor || item.type!=='weapon')throw Error('Attack with a Weapon owned by this Actor.');
  const ap=usesCombatAP(actor)?1:0;
  if(actor.system.actions<ap)throw Error('Not enough AP to attack.');
  const before=actor.system.actions;if(ap)await actor.update({'system.actions':before-ap});
  try{return await task(ap);}catch(error){if(ap)await actor.update({'system.actions':before});throw error;}
 });
}
export function damageFormulaFor(item){
 if(item?.system.damageFormula)return item.system.damageFormula;
 if(!JUTSU_TYPES.includes(item?.type))return '';
 const text=String(item.system.description).replace(/<[^>]*>/g,' ');
 // Additional/conditional dice are not a complete damage formula. Keep those manual.
 if(/\b(?:additional|instead|plus|bonus|reduce|reduced)\b|\+|\d+d(?:4|8|10|12|20|100)\b/i.test(text))return '';
 const matches=[...text.matchAll(/(\d+d6)\s+(?:Power (?:Die|Dice)\s+)?(?:(?:worth )?of\s+)?(?:physical\s+)?damage/gi)].map(match=>match[1]+'x6');
 return new Set(matches).size===1?matches[0]:'';
}

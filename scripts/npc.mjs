import {ATTRIBUTES,JUTSU_TYPES} from './config.mjs?v=0.3.15';
export const abilityTypes=[...JUTSU_TYPES,'talent','trait'];
export function npcPreset(value,elite=false,reverse=false){
 const values=elite?[50,55]:[40,45,50,35];
 const index=values.indexOf(value);
 return values[((index+(reverse?-1:1))%values.length+values.length)%values.length];
}
export async function cycleNpcAttribute(actor,key,reverse=false){
 if(!actor?.isOwner||actor.type!=='npc'||!Object.hasOwn(ATTRIBUTES,key))return false;
 await actor.update({[`system.attributes.${key}`]:npcPreset(actor._source.system.attributes[key],actor.system.npcElite,reverse)});return true;
}
export async function assignNpcAttribute(actor,key,value,itemId){
 if(!actor.isOwner || actor.type!=='npc' || !Object.hasOwn(ATTRIBUTES,key))return false;
 if(!Number.isInteger(value) || value<0 || value>100)throw Error('Attribute must be a whole number from 0 to 100.');
 if(itemId && !abilityTypes.includes(actor.items.get(itemId)?.type))throw Error('Choose an owned Technique, Talent, or Trait.');
 await actor.update({[`system.attributes.${key}`]:value,[`system.npcAbilities.${key}`]:itemId});
 return true;
}

import {plainRules} from './tooltips.mjs?v=0.3.15';
export const TECHNIQUE_TYPES = ["Bukijutsu", "Genjutsu", "Ninjutsu", "Taijutsu", "Fuinjutsu"];
export const TECHNIQUE_OUTCOMES={criticalSuccess:'Critical Success',criticalFailure:'Critical Failure',sublimeSuccess:'Sublime Success',sublimeFailure:'Sublime Failure'};
export function techniqueOutcome(item,result){
 if(!item || !result.critical)return null;
 const sublime=result.total===1 || result.total===100;
 const key=`${sublime?'sublime':'critical'}${result.success?'Success':'Failure'}`;
 return item.system[key]?{label:TECHNIQUE_OUTCOMES[key],text:item.system[key]}:null;
}
export const TECHNIQUE_RANKS = ["E", "D", "C", "B", "A", "S"];
export const TECHNIQUE_DURATIONS = ["Instantaneous", "Maintained", "Passive", "Internalized"];
export const TECHNIQUE_ACTIONS = ["Attack", "Movement", "Special", "Reaction"];
export const TECHNIQUE_RANGES = { Self:"Self", Touch:"Touch", Short:"Short (1–5 Paces)", Medium:"Medium (6–10 Paces)", Long:"Long (11–20 Paces)", "Super Long":"Super Long (21–50 Paces)", Custom:"Other / variable (see range rule)" };
export const TECHNIQUE_TEMPLATES = { "":"None", Burst:"Burst", Blast:"Blast", Ray:"Ray", Cone:"Cone", Explosion:"Explosion" };
const select = (value, choices, fallback) => choices.find(choice => String(value ?? "").toLowerCase().startsWith(choice.toLowerCase())) ?? fallback;

// Mutate in place: Foundry's embedded TypeDataModel migration ignores return values.
export function migrateTechniqueData(source, {partial=false}={}) {
 for(const [key,label] of Object.entries(TECHNIQUE_OUTCOMES))if(!partial && source[key]===undefined){
  const oldLabel=label.replace('Sublime','Supreme'),heading=new RegExp(`<h[1-6][^>]*>\\s*(?:${label}|${oldLabel})\\s*</h[1-6]>([\\s\\S]*?)(?=<h[1-6]|$)`,'i');
  source[key]=source[key.replace('sublime','supreme')]??plainRules(String(source.description??'').match(heading)?.[1]??'');
 }
  if (!partial || Object.hasOwn(source,"jutsuType")) {
    const old=source.jutsuType;
    source.jutsuType=TECHNIQUE_TYPES.find(type=>String(old ?? "").toLowerCase().includes(type.toLowerCase().slice(0,6))) ?? "Ninjutsu";
    if(!partial && !source.skill)source.skill=source.jutsuType.toLowerCase();
  }
  for(const [field,choices,fallback,notes] of [["duration",TECHNIQUE_DURATIONS,"Instantaneous","durationText"],["actionType",TECHNIQUE_ACTIONS,"Special","actionTypeText"],["range",Object.keys(TECHNIQUE_RANGES).sort((a,b)=>b.length-a.length),"Custom","rangeText"]]) {
    if(partial && !Object.hasOwn(source,field))continue;
    const original=String(source[field] ?? "");
    const chosen=select(original,choices,fallback);
    if(original && !source[notes] && (!partial || original!==chosen))source[notes]=original;
    source[field]=chosen;
  }
  if(!partial || Object.hasOwn(source,"jutsuRank")) {
    const rank=String(source.jutsuRank ?? "E");
    if(!source.jutsuRankText && (!partial || !TECHNIQUE_RANKS.includes(rank)))source.jutsuRankText=rank;
    source.jutsuRank=TECHNIQUE_RANKS.find(value=>rank.startsWith(value)) ?? "E";
  }
  if(!partial && !source.template)source.template=Object.keys(TECHNIQUE_TEMPLATES).filter(Boolean).find(shape=>String(source.rangeText ?? "").toLowerCase().includes(shape.toLowerCase())) ?? "";
  return source;
}

import {actorAction,usesCombatAP} from './action-flow.mjs?v=0.3.15';
export function spendTechnique(actor,item,costs=null,execute=null) {
  return actorAction(actor,async()=>{
    if(!actor?.isOwner || !item?.isOwner || item.parent!==actor)throw Error("Use a Technique owned by this character.");
    if(!["technique"].includes(item.type))throw Error("This Item is not a Technique.");
    if(item.system.configured===false)throw Error("Configure this draft Technique's rules and costs before use.");
    if(item.system.variableCost && !costs)throw Error("Choose the total cost for this Technique's variant first.");
    const chakra=costs?.chakra ?? item.system.chakraCost, requestedActions=costs?.actions ?? item.system.actionCost;
    if(!Number.isInteger(chakra) || chakra<0 || !Number.isInteger(requestedActions) || requestedActions<0 || requestedActions>3)throw Error("Technique costs must be whole numbers: Chakra 0 or more, AP 0–3.");
    const actions=usesCombatAP(actor)?requestedActions:0;
    const pool=item.system.chakraCostMode==="pool";
    if(pool && actor.system.chakraReservations?.[item.id])throw Error("This Technique is already internalized. End it before using it again.");
    const available=pool?actor.system.chakra.max:actor.system.chakra.value;
    if(available<chakra)throw Error(`Not enough ${pool?'maximum ':'current '}Chakra: ${item.name} needs ${chakra}, ${available} available.`);
    if(actor.system.actions<actions)throw Error(`Not enough AP: ${item.name} needs ${actions}, ${actor.system.actions} remaining. Start a new turn to refresh AP.`);
    const changes={"system.chakra.value":pool?Math.min(actor.system.chakra.value,actor.system.chakra.max-chakra):actor.system.chakra.value-chakra,"system.actions":actor.system.actions-actions};
    if(pool)changes["system.chakraReservations"]={...(actor.system.chakraReservations ?? {}),[item.id]:chakra};
    const before={'system.chakra.value':actor.system.chakra.value,'system.actions':actor.system.actions,...(pool?{'system.chakraReservations':{...(actor.system.chakraReservations??{})}}:{})};
    await actor.update(changes);
    try{return execute?await execute({chakra,actions}):{chakra,actions};}
    catch(error){await actor.update(before);throw error;}
  });
}
export function releaseTechnique(actor,item) {
  return actorAction(actor,async()=>{
    if(!actor?.isOwner || !item?.isOwner || item.parent!==actor)throw Error("End a Technique owned by this character.");
    const reservations={...(actor.system.chakraReservations ?? {})};
    if(!reservations[item.id])return false;
    delete reservations[item.id];
    await actor.update({"system.chakraReservations":reservations});
    return true;
  });
}

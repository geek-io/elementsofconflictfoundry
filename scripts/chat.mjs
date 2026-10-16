// Layout adapted from Zweihander's chat-skill/chat-weapon and dice/roll templates.
// Copyright 2022 Saveliy Ivanov and Kevin Dreßler. MIT: licenses/zweihander-MIT.txt.
import { SYSTEM_ID, ATTRIBUTES } from "./config.mjs?v=0.3.15";
import { qualityTags } from "./qualities.mjs?v=0.3.15";
const signed=value=>`${value>=0?"+":""}${value}`;
export function testCardContext({current,result,mode,modifier=0,difficulty=0,item=null}) {
  const badges=[{label:{normal:"Normal",advantage:"Advantage",disadvantage:"Disadvantage"}[mode] ?? "Normal",kind:mode},{label:`Difficulty ${signed(difficulty)}`,kind:"difficulty"}];
  if(modifier)badges.push({label:`Modifier ${signed(modifier)}`,kind:"modifier"});
  if(result.raw!==result.total)badges.push({label:`Flipped ${result.raw} → ${result.total}`,kind:"flip"});
  return {kind:"test",title:item?.name || `${current.skill.label} Test`,subtitle:`${current.skill.label} · ${ATTRIBUTES[current.skill.attribute]}`,img:item?.img,
    outcome:result.label,outcomeClass:`${result.success?"success":"failure"}${result.critical?" critical":""}`,total:result.total,chance:current.chance,percent:true,isTest:true,badges,
    qualities:item?.type==="weapon"?qualityTags(item.system.qualities):[],details:[{label:"Original roll",value:result.raw},{label:"Skill ranks",value:`${current.effectiveRank} effective / ${current.rank} learned`},{label:"Base chance",value:`${current.base}%`},{label:"Talent / trait modifier",value:signed(modifier)},{label:"Difficulty modifier",value:signed(difficulty)}]};
}
export function totalCardContext({roll,title,kind,item=null}) {
  const exploded=roll.dice?.flatMap(die=>die.results ?? []).filter(result=>result.exploded).length ?? 0;
  return {kind,title,subtitle:kind==="damage"?"Damage Roll":"Initiative Roll",img:item?.img,total:roll.total,formula:roll.formula,outcomeClass:kind,
    qualities:item?.type==="weapon"?qualityTags(item.system.qualities):[],badges:exploded?[{label:`Exploding dice ×${exploded}`,kind:"explosion"}]:[],details:[]};
}
export async function postRollCard(roll,actor,context,flags={},delivery={}) {
  const content=await foundry.applications.handlebars.renderTemplate(`systems/${SYSTEM_ID}/templates/chat-roll.hbs`,{...context,tooltip:await roll.getTooltip()});
  const data={speaker:ChatMessage.getSpeaker({actor}),content,flags:{[SYSTEM_ID]:{...flags,...(context.kind==='damage'?{damage:{title:context.title,...flags.damage}}:{}),card:{version:1,kind:context.kind}}},...delivery.data};
  return delivery.messageMode?roll.toMessage(data,{messageMode:delivery.messageMode}):roll.toMessage(data);
}
export function decorateChatMessage(message,html) {
  // Core replaces custom content for viewers who cannot see a private/blind Roll.
  if(message.flags?.[SYSTEM_ID]?.card && message.isContentVisible && html.querySelector(".eoc-roll-card"))html.classList.add("eoc-chat-message");
}

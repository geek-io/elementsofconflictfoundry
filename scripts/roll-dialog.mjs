// Configuration/modifier layout adapted from Zweihander skill-test-dialog (MIT).
import {SYSTEM_ID,ATTRIBUTES} from './config.mjs?v=0.3.15';
import {plainRules} from './tooltips.mjs?v=0.3.15';
import {usesCombatAP} from './action-flow.mjs?v=0.3.15';
import {actorTestChance} from './npc-tests.mjs?v=0.3.15';
export const DIFFICULTIES=[[-30,'Arduous (−30%)'],[-20,'Hard (−20%)'],[-10,'Challenging (−10%)'],[0,'Standard (+0%)'],[10,'Routine (+10%)'],[20,'Easy (+20%)'],[30,'Trivial (+30%)']].map(([value,label])=>({value,label}));
export async function promptTest(actor,key,options={}){
 const testOptions={item:options.item??options.technique??options.weapon,label:options.label};
 const start=actorTestChance(actor,key,0,0,testOptions);
 const combatAP=usesCombatAP(actor);
 const abilities=actor.items.filter(item=>['talent','trait'].includes(item.type));
 const effects=[...(actor.allApplicableEffects?.()??[])].map(effect=>({uuid:effect.uuid,name:effect.name,enabled:!effect.disabled,suppressed:effect.isSuppressed,readonly:!effect.isOwner || effect.isSuppressed,changes:(effect.system?.changes??effect.changes??[]).map(change=>`${change.key}: ${change.value}`).join(' · ')}));
 const content=await foundry.applications.handlebars.renderTemplate(`systems/${SYSTEM_ID}/templates/roll-dialog.hbs`,{start,combatAP,resources:{chakra:actor.system.chakra.value,max:actor.system.chakra.max,actions:actor.system.actions},attribute:ATTRIBUTES[start.skill.attribute],difficulties:DIFFICULTIES,abilities:abilities.map(item=>({name:item.name,description:plainRules(item.system.description)})),effects,technique:options.technique,passive:options.passive,weapon:options.weapon,visibility:Object.entries(CONFIG.ChatMessage.modes).map(([id,mode])=>({id,label:game.i18n.localize(mode.label)})),currentVisibility:game.settings.get('core','messageMode')});
 const pending=[];
 return foundry.applications.api.DialogV2.prompt({classes:['eoc','eoc-test-dialog'],position:{width:700},window:{title:options.technique?`Use ${options.technique.name}`:`${start.skill.label} Test`},content,render:(event,dialog)=>{
  const form=dialog.element.querySelector('form');
  const update=()=>{const f=form.elements;const result=actorTestChance(actor,key,Number(f.modifier.value),Number(f.difficulty.value),testOptions);form.querySelector('[data-test-chance]').textContent=`${result.chance}%`;};
  form.elements.modifier.addEventListener('input',update);form.elements.difficulty.addEventListener('change',update);
  for(const checkbox of form.querySelectorAll('[data-effect-uuid]'))checkbox.addEventListener('change',()=>{
   const task=(async()=>{checkbox.disabled=true;try{const effect=await fromUuid(checkbox.dataset.effectUuid);if(!effect?.isOwner)throw Error('You cannot change this effect.');await effect.update({disabled:!checkbox.checked});update();}catch(error){checkbox.checked=!checkbox.checked;ui.notifications.warn(error.message);}finally{checkbox.disabled=false;}})();pending.push(task);
  });
 },ok:{label:options.technique?'Use Technique':options.weapon?`Attack${combatAP?' · 1 AP':''}`:'Roll Test',callback:async(event,button)=>{
  await Promise.all(pending);const f=button.form.elements;
  return {modifier:Number(f.modifier.value),difficulty:Number(f.difficulty.value),mode:f.mode.value,messageMode:f.visibility.value,...(options.technique?{chakra:Number(f.chakra.value),actions:Number(f.actions.value)}:{})};
 }}});
}

import {SYSTEM_ID,DAMAGE_STATES} from './config.mjs?v=0.3.15';
import {poolTransaction,poolValues,poolChange,savePools} from './pools.mjs?v=0.3.15';
import {totalCardContext} from './chat.mjs?v=0.3.15';
export function damageStateAfter(total,threshold,state){
 if(!Number.isFinite(total)||total<0||!Number.isFinite(threshold))throw Error('Invalid damage or threshold.');
 if(total<=threshold)return state;
 if(total>threshold+18)return 5;
 return Math.min(5,state+(total>threshold+12?3:total>threshold+6?2:1));
}
export function lastDamageDie(roll){
 // Result order includes explosion dice; discarded results cannot be purchased.
 for(const die of [...(roll?.dice??[])].reverse())for(const result of [...die.results].reverse())if(result.active!==false&&!result.discarded&&result.count===undefined&&Number.isFinite(result.result)&&die.faces>0)return {die,result};
 return null;
}
function visibleTo(message,user){return !message.blind||user.isGM ? !message.whisper?.length||user.isGM||message.whisper.includes(user.id)||message.author?.id===user.id : false;}
function refreshTotals(roll){
 for(const term of roll.terms??[]){
  if(term.roll&&typeof term.roll==='object'&&typeof term.roll._evaluateTotal==='function')refreshTotals(term.roll);
  if(term.rolls){term.rolls.forEach(refreshTotals);term.results?.forEach((r,i)=>{if(term.rolls[i])r.result=term.rolls[i].total;});}
 }
 roll._total=roll._evaluateTotal();
}
export function maximizeDamageRoll(roll){
 // Native toJSON returns references to die results. Round-trip through JSON before
 // editing so the displayed Roll and ChatMessage source remain untouched until save.
 const boosted=Roll.fromData(JSON.parse(JSON.stringify(roll.toJSON()))),last=lastDamageDie(boosted);
 if(!last||last.result.result>=last.die.faces)throw Error('The final die is already at its maximum, or no die is available.');
 last.result.result=last.die.faces;
 refreshTotals(boosted);
 if(boosted.total===roll.total)throw Error('This formula does not expose an editable final damage die. No Fortune was spent.');
 return {boosted,faces:last.die.faces};
}
export async function executeDamageAction(messageId,userId,action,targetIds=[],sceneId=null){
 if(game.users.activeGM?.id!==game.user.id)throw Error('The active GM must process damage actions.');
 return poolTransaction(async()=>{
  const message=game.messages.get(messageId),user=game.users.get(userId),actor=message?.speakerActor;
  if(!user?.active||!actor?.testUserPermission(user,'OWNER')||!visibleTo(message,user)||message.flags?.[SYSTEM_ID]?.card?.kind!=='damage')throw Error('You must own the source character and be able to see this damage roll.');
  const roll=message.rolls?.[0],state=message.flags[SYSTEM_ID].damage??{};
  if(!roll||!Number.isFinite(roll.total))throw Error('This message has no damage roll.');
  if(action==='maximize'){
   if(actor.type==='npc'&&!user.isGM)throw Error('Only the GM can modify NPC damage.');
   if(state.maximized||Object.keys(state.applied??{}).length)throw Error('This roll was already boosted or applied.');
   const {boosted,faces}=maximizeDamageRoll(roll);
   const before=poolValues(),after=poolChange(before,'fortune');
   const context=totalCardContext({roll:boosted,title:state.title||'Damage',kind:'damage'});
   context.badges.push({label:`1 Fortune · final d${faces} maximized`,kind:'fortune'});
   const content=await foundry.applications.handlebars.renderTemplate(`systems/${SYSTEM_ID}/templates/chat-roll.hbs`,{...context,tooltip:await boosted.getTooltip()});
   await savePools(after);
   try{await message.update({rolls:[JSON.stringify(boosted.toJSON())],content,[`flags.${SYSTEM_ID}.damage`]:{...state,maximized:true,originalTotal:roll.total}},{diff:false});}
   catch(error){await savePools(before);throw error;}
   return;
  }
  if(action!=='apply')throw Error('Unknown damage action.');
  const scene=game.scenes.get(sceneId);
  if(!scene||!user.isGM&&user.viewedScene!==scene.id)throw Error('Use targets on your current Scene.');
  if(!Array.isArray(targetIds)||!targetIds.length||targetIds.length>100)throw Error('Target one or more characters first.');
  const applied={...state.applied},seen=new Set();let count=0;
  for(const id of new Set(targetIds)){
   const token=scene.tokens.get(id),target=token?.actor;
   if(!target||token.hidden&&!user.isGM)continue;
   const key=target.uuid;if(seen.has(key)||applied[key])continue;seen.add(key);
   const old=target.system.damageState,next=damageStateAfter(roll.total,target.system.secondary.damage,old);
   await target.update({'system.damageState':next});
   applied[key]={before:old,after:next};
   try{await message.update({[`flags.${SYSTEM_ID}.damage.applied`]:applied});}
   catch(error){await target.update({'system.damageState':old});throw error;}
   count++;
  }
  if(!count)throw Error('No new eligible targets; this roll can be applied only once per character.');
 });
}
const pending=new Map();
export function requestDamageAction(messageId,action,targetIds=[],sceneId=null){
 if(!game.users.activeGM)return Promise.reject(Error('A GM must be connected to process damage.'));
 if(game.users.activeGM.id===game.user.id)return executeDamageAction(messageId,game.user.id,action,targetIds,sceneId);
 const requestId=foundry.utils.randomID();
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('The GM did not respond. Check the roll before retrying.'));},15000);pending.set(requestId,{resolve,reject,timer});game.socket.emit(`system.${SYSTEM_ID}`,{kind:'damageRequest',requestId,userId:game.user.id,messageId,action,targetIds,sceneId});});
}
export function registerDamageSocket(){
 game.socket.on(`system.${SYSTEM_ID}`,async p=>{
  if(p?.kind==='damageResponse'&&p.userId===game.user.id){const task=pending.get(p.requestId);if(!task)return;clearTimeout(task.timer);pending.delete(p.requestId);p.error?task.reject(Error(p.error)):task.resolve();}
  if(p?.kind!=='damageRequest'||game.users.activeGM?.id!==game.user.id)return;
  let error;try{await executeDamageAction(p.messageId,p.userId,p.action,p.targetIds,p.sceneId);}catch(e){error=e.message;}
  game.socket.emit(`system.${SYSTEM_ID}`,{kind:'damageResponse',requestId:p.requestId,userId:p.userId,error});
 });
}
export function addDamageControls(message,html){
 if(!message.isContentVisible||!message.speakerActor?.isOwner||message.flags?.[SYSTEM_ID]?.card?.kind!=='damage')return;
 const card=html.querySelector('.eoc-roll-card');if(!card||card.querySelector('.eoc-damage-actions'))return;
 const actions=document.createElement('div');actions.className='eoc-damage-actions eoc-chat-actions';
 const state=message.flags[SYSTEM_ID].damage??{},last=lastDamageDie(message.rolls?.[0]);
 if(Object.keys(state.applied??{}).length){const summary=document.createElement('span');summary.textContent=`Applied to ${Object.keys(state.applied).length} character(s)`;actions.append(summary);}
 const button=(label,task)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',async()=>{b.disabled=true;try{await task();}catch(e){ui.notifications.warn(e.message);}finally{b.disabled=false;}});actions.append(b);};
 if(!state.maximized&&!Object.keys(state.applied??{}).length&&last&&last.result.result<last.die.faces)button(`Maximize final d${last.die.faces} · 1 Fortune`,()=>requestDamageAction(message.id,'maximize'));
 button('Apply Damage to Targets',async()=>{
  const tokens=[...game.user.targets].filter(t=>t.actor),roll=message.rolls[0],esc=foundry.utils.escapeHTML;
  if(!tokens.length)throw Error('Target one or more characters first.');
  const content=tokens.map(t=>`<p>${esc(t.name)}: ${esc(DAMAGE_STATES[t.actor.system.damageState])} → ${esc(DAMAGE_STATES[damageStateAfter(roll.total,t.actor.system.secondary.damage,t.actor.system.damageState)])}</p>`).join('');
  if(await foundry.applications.api.DialogV2.confirm({window:{title:`Apply ${roll.total} Damage`},content})){await requestDamageAction(message.id,'apply',tokens.map(t=>t.id),canvas.scene.id);ui.notifications.info('Damage applied to eligible targets.');}
 });
 card.append(actions);
}

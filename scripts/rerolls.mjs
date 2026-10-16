import {SYSTEM_ID,SKILLS} from './config.mjs?v=0.3.15';
import {testResult} from './rules.mjs?v=0.3.15';
import {poolTransaction,poolValues,poolChange,savePools} from './pools.mjs?v=0.3.15';
import {postRollCard,testCardContext} from './chat.mjs?v=0.3.15';
import {techniqueRules} from './tooltips.mjs?v=0.3.15';
import {JUTSU_TYPES} from './config.mjs?v=0.3.15';
import {techniqueOutcome} from './techniques.mjs?v=0.3.15';
export function rerollEligible(test){
 return Boolean(test?.snapshot && !test.rerollUsed && Number.isInteger(test.raw) && test.raw>=1 && test.raw<=100 && !testResult(test.raw,test.chance,test.mode).critical);
}
export async function executeReroll(messageId,userId){
 if(game.users.activeGM?.id!==game.user.id)throw Error('The active GM must process coin rerolls.');
 return poolTransaction(async()=>{
  const message=game.messages.get(messageId),user=game.users.get(userId),actor=message?.speakerActor;
  const test=message?.flags?.[SYSTEM_ID]?.test;
  if(!user?.active || !actor || !actor.testUserPermission(user,'OWNER'))throw Error('You must own this Actor to reroll its test.');
  if(actor.type==='npc' && !user.isGM || message.blind && !user.isGM)throw Error('Only the GM can reroll this test.');
  if(message.whisper?.length && !user.isGM && !message.whisper.includes(user.id) && message.author?.id!==user.id)throw Error('This test is private.');
  if(!rerollEligible(test))throw Error('Critical, Supreme, or already rerolled tests cannot be rerolled.');
  const skill=SKILLS.find(skill=>skill.key===test.skill);if(!skill)throw Error('Unknown test skill.');
  const pool=actor.type==='npc'?'misfortune':'fortune',before=poolValues();
  const after=poolChange(before,pool);
  // Mark the original before rolling; the shared GM queue prevents double spending.
  await message.update({[`flags.${SYSTEM_ID}.test.rerollUsed`]:true});
  try{
   await savePools(after);
   const roll=await new Roll('1d100').evaluate();
   const result=testResult(roll.total,test.chance,test.mode);
   const current={...test.snapshot,skill,chance:test.chance};
   const item=actor.items.get(test.itemId);
   const context=testCardContext({current,result,mode:test.mode,modifier:test.modifier,difficulty:test.difficulty,item});
   if(JUTSU_TYPES.includes(item?.type)){context.rules=techniqueRules(item);context.techniqueOutcome=techniqueOutcome(item,result);}
   context.title=test.title;context.badges.push({label:`Reroll · 1 ${pool==='fortune'?'Fortune':'Misfortune'}`,kind:pool});
   const data={author:message.author.id,speaker:message.speaker,whisper:[...(message.whisper??[])],blind:message.blind};
   // 'gm' keeps explicit whisper recipients, including self-only recipients; public removes none accidentally.
   const messageMode=message.blind?'blind':data.whisper.length?'gm':'public';
   return await postRollCard(roll,actor,context,{test:{...test,...result,rerollUsed:false,rerolledFrom:message.id}},{data,messageMode});
  }catch(error){await savePools(before);await message.update({[`flags.${SYSTEM_ID}.test.rerollUsed`]:false});throw error;}
 });
}
const pending=new Map();
export function requestReroll(messageId){
 if(!game.users.activeGM)return Promise.reject(Error('A GM must be connected to reroll with shared coins.'));
 if(game.users.activeGM.id===game.user.id)return executeReroll(messageId,game.user.id);
 const requestId=foundry.utils.randomID();
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('The GM did not respond. Check chat and the pool before trying again.'));},10000);pending.set(requestId,{resolve,reject,timer});game.socket.emit(`system.${SYSTEM_ID}`,{kind:'rerollRequest',requestId,messageId,userId:game.user.id});});
}
export function registerRerollSocket(){
 game.socket.on(`system.${SYSTEM_ID}`,async payload=>{
  if(payload?.kind==='rerollResponse' && payload.userId===game.user.id){const task=pending.get(payload.requestId);if(!task)return;clearTimeout(task.timer);pending.delete(payload.requestId);payload.error?task.reject(Error(payload.error)):task.resolve();}
  if(payload?.kind!=='rerollRequest' || game.users.activeGM?.id!==game.user.id)return;
  // Remote requests never authorize NPC/Misfortune operations; those stay on the active GM client.
  let error;try{if(game.users.get(payload.userId)?.isGM || game.messages.get(payload.messageId)?.speakerActor?.type==='npc')throw Error('The active GM must reroll GM or NPC tests.');await executeReroll(payload.messageId,payload.userId);}catch(e){error=e.message;}
  game.socket.emit(`system.${SYSTEM_ID}`,{kind:'rerollResponse',requestId:payload.requestId,userId:payload.userId,error});
 });
}
export function addRerollControl(message,html){
 const test=message.flags?.[SYSTEM_ID]?.test;
 if(!message.isContentVisible || !rerollEligible(test) || !message.speakerActor?.isOwner || message.speakerActor.type==='npc'&&!game.user.isGM)return;
 const card=html.querySelector('.eoc-roll-card');if(!card || card.querySelector('.eoc-reroll'))return;
 const button=document.createElement('button');button.type='button';button.className='eoc-reroll';button.textContent=`Reroll · 1 ${message.speakerActor.type==='npc'?'Misfortune':'Fortune'}`;
 button.addEventListener('click',async()=>{button.disabled=true;try{await requestReroll(message.id);button.remove();}catch(error){button.disabled=false;ui.notifications.warn(error.message);}});card.append(button);
}

import {SYSTEM_ID} from './config.mjs?v=0.3.15';
import {bonuses} from './rules.mjs?v=0.3.15';
import {postRollCard,totalCardContext} from './chat.mjs?v=0.3.15';
import {damageFormulaFor} from './action-flow.mjs?v=0.3.15';
import {openPools} from './pool-window.mjs?v=0.3.15';
export async function rollChatDamage(message){
 const actor=message.speakerActor,test=message.flags?.[SYSTEM_ID]?.test;
 if(!message.isContentVisible || !actor?.isOwner || !test?.success)throw Error('Only the Actor owner can roll damage for a visible successful attack.');
 const item=actor.items.get(test.itemId),formula=damageFormulaFor(item);
 if(!formula)throw Error('Enter a damage formula on this Item first.');
 const roll=await new Roll(formula,{bonuses:bonuses(actor.system),system:actor.system}).evaluate();
 const data={speaker:message.speaker,whisper:[...(message.whisper??[])],blind:message.blind};
 return postRollCard(roll,actor,totalCardContext({roll,title:item.name,kind:'damage',item}),{}, {data,messageMode:message.blind?'blind':data.whisper.length?'gm':'public'});
}
export function addChatActions(message,html){
 const actor=message.speakerActor,test=message.flags?.[SYSTEM_ID]?.test;
 if(!message.isContentVisible || !test || !actor?.isOwner)return;
 const card=html.querySelector('.eoc-roll-card');if(!card || card.querySelector('.eoc-chat-actions'))return;
 const actions=document.createElement('div');actions.className='eoc-chat-actions';
 if(test.success && damageFormulaFor(actor.items.get(test.itemId))){const damage=document.createElement('button');damage.type='button';damage.textContent='Roll Damage';damage.addEventListener('click',async()=>{damage.disabled=true;try{await rollChatDamage(message);}catch(error){ui.notifications.warn(error.message);}finally{damage.disabled=false;}});actions.append(damage);}
 const pools=document.createElement('button');pools.type='button';pools.textContent='Fortune / Misfortune';pools.addEventListener('click',openPools);actions.append(pools);card.append(actions);
}

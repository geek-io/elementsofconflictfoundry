import {SYSTEM_ID} from './config.mjs?v=0.3.15';
let queue=Promise.resolve();
export function poolTransaction(task){const result=queue.then(task);queue=result.catch(()=>{});return result;}
export function poolValues(){return {fortune:game.settings.get(SYSTEM_ID,'fortune'),misfortune:game.settings.get(SYSTEM_ID,'misfortune')};}
export function poolChange(state,action,amount=1){
 if(!Number.isInteger(amount) || amount<0)throw Error('Use a non-negative whole number of coins.');
 const next={...state};
 if(action==='fortune'){if(state.fortune<amount)throw Error('Not enough Fortune Points.');next.fortune-=amount;next.misfortune+=amount;}
 else if(action==='misfortune'){if(state.misfortune<amount)throw Error('Not enough Misfortune Points.');next.misfortune-=amount;next.fortune+=amount;}
 else throw Error('Unknown pool action.');
 return next;
}
export async function savePools(next){
 const before=poolValues();
 try{await game.settings.set(SYSTEM_ID,'fortune',next.fortune);await game.settings.set(SYSTEM_ID,'misfortune',next.misfortune);}
 catch(error){await game.settings.set(SYSTEM_ID,'fortune',before.fortune);await game.settings.set(SYSTEM_ID,'misfortune',before.misfortune);throw error;}
}
export async function applyPoolAction(action,userId){
 if(game.users.activeGM?.id!==game.user.id)throw Error('The active GM must update the shared pools.');
 const user=game.users.get(userId);
 if(!user?.active || action!=='fortune' && !user.isGM)throw Error('Only the GM can change this pool.');
 return poolTransaction(async()=>{
  const state=poolValues();
  if(['fortune','misfortune'].includes(action))await savePools(poolChange(state,action));
  else if(action==='reset'){
   const count=game.users.players.filter(user=>user.active).length;
   await savePools({fortune:2*(count+1)-1,misfortune:1});
  }else if(action==='add')await savePools({...state,fortune:state.fortune+1});
  else if(action==='remove'){if(!state.fortune)throw Error('No Fortune coins to remove.');await savePools({...state,fortune:state.fortune-1});}
  else throw Error('Unknown pool action.');
 });
}
const pending=new Map();
export function requestPoolAction(action){
 if(!game.users.activeGM) return Promise.reject(Error('A GM must be connected to spend shared coins.'));
 if(game.users.activeGM.id===game.user.id)return applyPoolAction(action,game.user.id);
 if(action!=='fortune')return Promise.reject(Error('The active GM must manage Misfortune and session coins.'));
 const requestId=foundry.utils.randomID();
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('The GM did not respond; check the pool before trying again.'));},10000);
  pending.set(requestId,{resolve,reject,timer});
  game.socket.emit(`system.${SYSTEM_ID}`,{kind:'poolRequest',requestId,userId:game.user.id,action});
 });
}
export function registerPoolSocket(){
 game.socket.on(`system.${SYSTEM_ID}`,async message=>{
  if(message?.kind==='poolResponse' && message.userId===game.user.id){const task=pending.get(message.requestId);if(!task)return;clearTimeout(task.timer);pending.delete(message.requestId);message.error?task.reject(Error(message.error)):task.resolve();}
  if(message?.kind!=='poolRequest' || game.users.activeGM?.id!==game.user.id)return;
  // Player socket requests can only spend Fortune. Privileged operations stay on the active GM client.
  let error;try{if(message.action!=='fortune')throw Error('The active GM must manage Misfortune and session coins.');await applyPoolAction('fortune',message.userId);}catch(e){error=e.message;}
  game.socket.emit(`system.${SYSTEM_ID}`,{kind:'poolResponse',requestId:message.requestId,userId:message.userId,error});
 });
}

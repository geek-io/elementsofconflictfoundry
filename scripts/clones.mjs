import {SYSTEM_ID} from './config.mjs?v=0.3.15';
export function isCloneTechnique(item){return item?.system.cloneMode==='on'||item?.system.createClone||item?.system.cloneMode!=='off'&&/\bclones?\b/i.test(item?.name??'')&&!/destroy|detonat|explosion/i.test(item.name);}
export async function chooseCloneLocation(actor){
 if(!canvas.ready)throw Error('Open a Scene to place a clone.');
 if(!game.users.activeGM)throw Error('A GM must be connected to create the clone.');
 const source=actor.getActiveTokens().find(t=>t.controlled)||actor.getActiveTokens()[0];if(!source)throw Error('Place the character’s token on the Scene first.');
 const g=new PIXI.Graphics();canvas.stage.addChild(g);const view=canvas.app.view;
 let position={x:source.x,y:source.y};
 const draw=()=>g.clear().lineStyle(2,0xf0c76a).beginFill(0xf0c76a,0.25).drawRect(position.x,position.y,source.w,source.h).endFill();draw();
 ui.notifications.info('Choose the clone’s location. Left-click to place; Escape or right-click to cancel.');
 return new Promise(resolve=>{
  const finish=value=>{view.removeEventListener('pointermove',move,true);view.removeEventListener('pointerdown',click,true);document.removeEventListener('keydown',key,true);view.removeEventListener('contextmenu',context,true);g.destroy();resolve(value);};
  const move=e=>{e.stopImmediatePropagation();const p=new PIXI.Point();canvas.app.renderer.events.mapPositionToPoint(p,e.clientX,e.clientY);const local=canvas.stage.toLocal(p);position=canvas.tokens.getSnappedPoint({x:local.x-source.w/2,y:local.y-source.h/2});draw();};
  const click=e=>{e.preventDefault();e.stopImmediatePropagation();if(e.button===0)finish({sourceId:source.id,sceneId:canvas.scene.id,...position});else if(e.button===2){view.addEventListener('contextmenu',event=>event.preventDefault(),{once:true,capture:true});finish(null);}};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(null);}};
  const context=e=>{e.preventDefault();finish(null);};
  view.addEventListener('pointermove',move,true);view.addEventListener('pointerdown',click,true);document.addEventListener('keydown',key,true);view.addEventListener('contextmenu',context,true);
 });
}
const completed=new Set();let queue=Promise.resolve();
export function executeClone(messageId,userId,position){const result=queue.then(()=>createClone(messageId,userId,position));queue=result.catch(()=>{});return result;}
async function createClone(messageId,userId,position){
 if(game.users.activeGM?.id!==game.user.id)throw Error('The active GM must create clone tokens.');
 const user=game.users.get(userId),message=game.messages.get(messageId),actor=message?.speakerActor;
 if(!user?.active||!actor?.testUserPermission(user,'OWNER'))throw Error('You must own the character creating this clone.');
 if(message.blind&&!user.isGM||message.whisper?.length&&!user.isGM&&!message.whisper.includes(user.id)&&message.author?.id!==user.id)throw Error('This Technique roll is private.');
 const test=message.flags?.[SYSTEM_ID]?.test,item=actor.items.get(test?.itemId??message.flags?.[SYSTEM_ID]?.cloneItemId);
 if(!isCloneTechnique(item)||test&&!test.success)throw Error('A successful Clone Technique is required.');
 if(completed.has(message.id)||message.flags[SYSTEM_ID].cloneToken)throw Error('This use already created a clone.');
 const scene=game.scenes.get(position?.sceneId),source=scene?.tokens.get(position?.sourceId);
 if(!source?.actor||source.actor.uuid!==actor.uuid||!user.isGM&&user.viewedScene!==scene.id||!Number.isFinite(position.x)||!Number.isFinite(position.y))throw Error('Choose a valid source token and location on your Scene.');
 const data=source.toObject(),snapshot=actor.toObject();delete data._id;
 Object.assign(data,{x:position.x,y:position.y,name:`${actor.name} · Clone`,actorLink:false,delta:{name:`${actor.name} · Clone`,type:snapshot.type,img:snapshot.img,system:{...snapshot.system,damageState:0,perilState:0},items:snapshot.items,effects:snapshot.effects,ownership:snapshot.ownership},flags:{...data.flags,[SYSTEM_ID]:{cloneOf:source.uuid,technique:item.name,creator:user.id}}});
 const [clone]=await scene.createEmbeddedDocuments('Token',[data]);
 try{await message.update({[`flags.${SYSTEM_ID}.cloneToken`]:clone.uuid});}catch(error){await clone.delete();throw error;}completed.add(message.id);
 try{
  if(game.modules.get('sequencer')?.active&&globalThis.Sequence){
   const path=item.system.cloneEffect||['jb2a.smoke.puff.centered.grey','jb2a.smoke.puff.centered.white'].find(key=>globalThis.Sequencer?.Database?.getEntry(key));
   if(path)await new Sequence().effect().file(path).atLocation({x:clone.x+clone.width*scene.grid.size/2,y:clone.y+clone.height*scene.grid.size/2}).play();
  }
 }catch(error){console.warn(`${SYSTEM_ID} | Clone created; optional animation failed`,error);}
 return clone.uuid;
}
const pending=new Map();
export function requestClone(messageId,position){
 if(!game.users.activeGM)return Promise.reject(Error('A GM must be connected to create the clone.'));
 if(game.users.activeGM.id===game.user.id)return executeClone(messageId,game.user.id,position);
 const requestId=foundry.utils.randomID();
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('The GM did not respond. Check the Scene before retrying.'));},15000);pending.set(requestId,{resolve,reject,timer});game.socket.emit(`system.${SYSTEM_ID}`,{kind:'cloneRequest',requestId,messageId,position,userId:game.user.id});});
}
export function registerCloneSocket(){game.socket.on(`system.${SYSTEM_ID}`,async p=>{
 if(p?.kind==='cloneResponse'&&p.userId===game.user.id){const task=pending.get(p.requestId);if(!task)return;clearTimeout(task.timer);pending.delete(p.requestId);p.error?task.reject(Error(p.error)):task.resolve(p.uuid);}
 if(p?.kind!=='cloneRequest'||game.users.activeGM?.id!==game.user.id)return;
 let error,uuid;try{uuid=await executeClone(p.messageId,p.userId,p.position);}catch(e){error=e.message;}
 game.socket.emit(`system.${SYSTEM_ID}`,{kind:'cloneResponse',requestId:p.requestId,userId:p.userId,error,uuid});
});}

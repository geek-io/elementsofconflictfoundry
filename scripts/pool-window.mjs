// Two coin bowls adapted from Zweihander FortuneTracker (MIT; licenses/zweihander-MIT.txt).
import {SYSTEM_ID} from './config.mjs?v=0.3.15';
import {poolValues,requestPoolAction,registerPoolSocket} from './pools.mjs?v=0.3.15';
const {ApplicationV2,HandlebarsApplicationMixin,DialogV2}=foundry.applications.api;
export class EocPoolWindow extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={id:'eoc-fortune-pools',classes:['eoc','eoc-pools'],window:{title:'Fortune & Misfortune',resizable:true},position:{width:550,height:400},actions:{spend:EocPoolWindow.spend,manage:EocPoolWindow.manage}};
 static PARTS={main:{template:`systems/${SYSTEM_ID}/templates/pools.hbs`}};
 async _prepareContext(options){
  const state=poolValues();
  return {...await super._prepareContext(options),gm:game.user.isGM,connected:Boolean(game.users.activeGM),total:state.fortune+state.misfortune,pools:['fortune','misfortune'].map(key=>({key,label:key==='fortune'?'Fortune':'Misfortune',value:state[key],disabled:!game.users.activeGM || !state[key] || key==='misfortune'&&!game.user.isGM,coins:Array.from({length:Math.min(40,state[key])},(_,index)=>({index})),image:`systems/${SYSTEM_ID}/assets/fortune-${key==='fortune'?'life':'death'}.webp`}))};
 }
 static async spend(event,target){try{await requestPoolAction(target.dataset.pool);}catch(error){ui.notifications.warn(error.message);}}
 static async manage(event,target){
  if(!game.user.isGM)return;
  if(target.dataset.operation==='reset' && !await DialogV2.confirm({window:{title:'Reset session coins'},content:'<p>Create two coins per active player plus the GM, with one in Misfortune. Players can then move rolled sixes to Misfortune by spending Fortune.</p>'}))return;
  try{await requestPoolAction(target.dataset.operation);}catch(error){ui.notifications.warn(error.message);}
 }
}
let window;
export function openPools(){window??=new EocPoolWindow();window.render(true);}
export function refreshPools(setting){if(setting?.key===`${SYSTEM_ID}.fortune` || setting?.key===`${SYSTEM_ID}.misfortune`)if(window?.rendered)window.render();}
export function addPoolButton(app,html){
 const root=html instanceof HTMLElement?html:app.element;
 if(!root || root.querySelector('.eoc-pool-button'))return;
 const button=document.createElement('button');button.type='button';button.className='eoc-pool-button';button.textContent='Fortune & Misfortune';button.addEventListener('click',openPools);
 (root.querySelector('.directory-header')??root.querySelector('header')??root).prepend(button);
}
export function initializePools(){registerPoolSocket();}

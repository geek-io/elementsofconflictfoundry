import test from 'node:test';
import assert from 'node:assert/strict';
import {animateItemUse,registerAnimationIntegration} from '../scripts/animations.mjs';
const id='elementsofconflictfoundry';
function setup(){
 const calls=[],source={id:'source',controlled:true},target={id:'target'};
 globalThis.game={modules:new Map([['autoanimations',{active:true}]]),user:{targets:new Set([target])}};
 globalThis.canvas={ready:true};
 globalThis.AutomatedAnimations={playAnimation:async(...args)=>calls.push(args)};
 return {calls,source,target,actor:{getActiveTokens:()=>[source]},item:{type:'technique',flags:{autoanimations:{custom:true}}}};
}
test('AA receives real item flags, source and snapshotted targets with hit state',async()=>{
 const {calls,actor,item,source,target}=setup();
 await animateItemUse(actor,item,{flags:{[id]:{test:{success:true}}}},{targets:[target]});
 assert.equal(calls.length,1);assert.equal(calls[0][0],source);assert.equal(calls[0][1],item);
 assert.deepEqual(calls[0][2].hitTargets,[target]);
 await animateItemUse(actor,item,{flags:{[id]:{test:{success:false}}}});
 assert.deepEqual(calls[1][2].hitTargets,[]);
});
test('AA is optional and cancelled uses, damage and missing tokens never animate',async()=>{
 const {calls,actor,item}=setup();
 await animateItemUse(actor,item,null);
 await animateItemUse(actor,{type:'gear'},{});
 game.modules.clear();await animateItemUse(actor,item,{});
 game.modules.set('autoanimations',{active:true});canvas.ready=false;await animateItemUse(actor,item,{});
 canvas.ready=true;await animateItemUse({getActiveTokens:()=>[]},item,{});
 assert.equal(calls.length,0);
});
test('AA failures do not reject completed gameplay',async()=>{
 const {actor,item}=setup();AutomatedAnimations.playAnimation=async()=>{throw Error('missing asset');};
 const warn=console.warn;console.warn=()=>{};
 try{assert.equal(await animateItemUse(actor,item,{}),false);}finally{console.warn=warn;}
});
test('generic chat scanner cannot duplicate EoC cards or rerolls',()=>{
 let listener;globalThis.Hooks={on:(name,fn)=>{assert.equal(name,'AutomatedAnimations-WorkflowStart');listener=fn;}};
 registerAnimationIntegration();
 const data={workflow:{flags:{[id]:{test:{itemId:'item'}}}}};listener(data);assert.equal(data.stopWorkflow,true);
 const direct={eocUse:true};listener(direct);assert.equal(direct.stopWorkflow,undefined);
});


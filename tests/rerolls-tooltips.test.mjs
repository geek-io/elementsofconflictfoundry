import test from 'node:test';
import assert from 'node:assert/strict';
import {rerollEligible,executeReroll} from '../scripts/rerolls.mjs';
import {abilityTooltip,abilityTooltipHtml,plainRules} from '../scripts/tooltips.mjs';
import {SYSTEM_ID} from '../scripts/config.mjs';
function fixture(type='character'){
 const state={fortune:2,misfortune:2},user={id:'gm',isGM:true,active:true};
 const test={skill:'athletics',raw:38,total:38,chance:55,mode:'normal',modifier:5,difficulty:10,title:'Athletics Test',snapshot:{rank:1,effectiveRank:1,base:45,chance:55}};
 const actor={id:'actor',type,isOwner:true,testUserPermission:()=>true,items:{get:()=>null}};
 const message={id:'original',speakerActor:actor,author:{id:'player'},speaker:{actor:'actor'},whisper:['player'],blind:false,flags:{[SYSTEM_ID]:{test}},update:async changes=>{test.rerollUsed=changes[`flags.${SYSTEM_ID}.test.rerollUsed`];}};
 globalThis.game={user,users:{activeGM:user,get:()=>user},messages:{get:()=>message},settings:{get:(id,key)=>state[key],set:async(id,key,value)=>{state[key]=value;}}};
 globalThis.foundry={applications:{handlebars:{renderTemplate:async(path,context)=>JSON.stringify(context)}}};
 globalThis.ChatMessage={getSpeaker:()=>message.speaker};
 let posted;
 globalThis.Roll=class {async evaluate(){this.total=62;return this;}getTooltip(){return '';}async toMessage(data,options){posted={data,options};return posted;}};
 return {state,test,message,actor,getPosted:()=>posted};
}
test('rerolls reject all Critical and Supreme outcomes, and completed rerolls',()=>{
 for(const raw of [1,100,11,22,33,44,55,66,77,88,99])assert.equal(rerollEligible({snapshot:{},raw,chance:50,mode:'normal'}),false);
 assert.equal(rerollEligible({snapshot:{},raw:83,chance:50,mode:'advantage'}),true);
 assert.equal(rerollEligible({snapshot:{},raw:38,chance:50,rerolledFrom:'old'}),true);
 assert.equal(rerollEligible({snapshot:{},raw:38,chance:50,rerollUsed:true}),false);
});
test('concurrent rerolls spend once, keep the original chance, and preserve private recipients',async()=>{
 const f=fixture();
 const results=await Promise.allSettled([executeReroll('original','gm'),executeReroll('original','gm')]);
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.deepEqual(f.state,{fortune:1,misfortune:3});
 const {data,options}=f.getPosted();assert.deepEqual(data.whisper,['player']);assert.equal(options.messageMode,'gm');assert.equal(data.author,'player');
 const next=data.flags[SYSTEM_ID].test;assert.equal(next.chance,55);assert.equal(next.total,62);assert.equal(next.rerolledFrom,'original');assert.equal(rerollEligible(next),true);
});
test('NPC rerolls spend Misfortune, block unauthorized owners and refund failed rolls',async()=>{
 let f=fixture('npc');await executeReroll('original','gm');assert.deepEqual(f.state,{fortune:3,misfortune:1});
 f=fixture();f.actor.testUserPermission=()=>false;await assert.rejects(executeReroll('original','gm'),/own this Actor/);assert.deepEqual(f.state,{fortune:2,misfortune:2});
 f=fixture();globalThis.Roll=class {async evaluate(){throw Error('Dice failed');}};
 await assert.rejects(executeReroll('original','gm'),/Dice failed/);assert.deepEqual(f.state,{fortune:2,misfortune:2});assert.equal(f.test.rerollUsed,false);
 f=fixture();f.state.fortune=0;await assert.rejects(executeReroll('original','gm'),/Not enough/);assert.equal(f.test.rerollUsed,undefined);
 f=fixture();f.message.blind=true;await executeReroll('original','gm');assert.equal(f.getPosted().options.messageMode,'blind');assert.equal(f.getPosted().data.blind,true);assert.deepEqual(f.getPosted().data.whisper,['player']);
});
test('a non-critical reroll can be rerolled again until coins run out; a critical result stops the chain',async()=>{
 for(const type of ['character','npc']){
  const f=fixture(type);await executeReroll('original','gm');
  const data=f.getPosted().data,next={...f.message,id:'next',flags:data.flags,update:async changes=>{data.flags[SYSTEM_ID].test.rerollUsed=changes[`flags.${SYSTEM_ID}.test.rerollUsed`];}};
  game.messages.get=id=>id==='original'?f.message:next;
  await executeReroll('next','gm');assert.equal(f.state[type==='npc'?'misfortune':'fortune'],0);
  const last=f.getPosted().data;next.flags=last.flags;
  await assert.rejects(executeReroll('next','gm'),/Not enough/);
 }
 const f=fixture();globalThis.Roll=class {async evaluate(){this.total=11;return this;}getTooltip(){return '';}toMessage(data){return data;}};
 const rolled=await executeReroll('original','gm');assert.equal(rerollEligible(rolled.flags[SYSTEM_ID].test),false);assert.equal(f.state.fortune,1);
});
test('ability tooltips contain decoded rules and Technique costs without executable HTML',()=>{
 const technique={type:'technique',name:'Flame',system:{jutsuType:'Ninjutsu',jutsuRank:'C',chakraCost:4,actionCost:1,description:'<p>Burn &amp; blind.</p><p>@UUID[Item.x]{Target}</p>',source:'Book'}};
 const tip=abilityTooltip(technique);assert.match(tip,/4 Chakra/);assert.match(tip,/Burn & blind/);assert.match(tip,/Target/);assert.ok(!tip.includes('<p>'));
 assert.match(abilityTooltip({type:'talent',name:'Polymath',system:{description:'Count quickly'}}),/Count quickly/);
 assert.equal(abilityTooltip({type:'gear',system:{}}),'');assert.equal(plainRules('<b>Safe</b>'),'Safe');
});
test('NPC Trait tooltips use escaped rules and show action and coin costs',()=>{
 const item={name:'Maul <script>',type:'trait',system:{audience:'antagonist',actionType:'Combat',actionCost:3,misfortuneCost:3,spendMisfortune:true,description:'<p>Make three attacks.</p>'}};
 const tip=abilityTooltipHtml(item);assert.match(tip,/3 AP/);assert.match(tip,/3 Misfortune/);assert.match(tip,/Make three attacks/);assert.match(tip,/&lt;script&gt;/);assert.ok(!tip.includes('<script>'));
});

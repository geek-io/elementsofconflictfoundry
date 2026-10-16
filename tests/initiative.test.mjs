import test from 'node:test';
import assert from 'node:assert/strict';
import {configureInitiative,rollActorInitiative,INITIATIVE_FORMULA} from '../scripts/initiative.mjs';
test('Combat Encounters receives the formula for the Actor roll data, not an undefined default',()=>{
 globalThis.CONFIG={Combat:{initiative:{}}};configureInitiative();assert.equal(CONFIG.Combat.initiative.formula,'1d10 + @secondary.initiative');assert.equal(CONFIG.Combat.initiative.decimals,0);
});
test('sheet initiative rerolls existing combatants without creating duplicates and adds missing combatants',async()=>{
 const calls=[];const actor={isOwner:true,rollInitiative:async options=>{calls.push(options);return 'combat';}};
 globalThis.game={combat:{getCombatantsByActor:()=>[{id:'existing'}]}};assert.equal(await rollActorInitiative(actor),'combat');assert.deepEqual(calls[0],{createCombatants:false,rerollInitiative:true});
 game.combat.getCombatantsByActor=()=>[];await rollActorInitiative(actor);assert.deepEqual(calls[1],{createCombatants:true,rerollInitiative:true});
 actor.isOwner=false;await rollActorInitiative(actor);assert.equal(calls.length,2);
});
test('without an encounter sheet initiative posts a real roll using the same initiative stat',async()=>{
 let posted;globalThis.game={combat:null};globalThis.foundry={applications:{handlebars:{renderTemplate:async()=>'<article>Initiative</article>'}}};globalThis.ChatMessage={getSpeaker:()=>({actor:'pc'})};
 globalThis.Roll=class{constructor(formula,data){assert.equal(formula,INITIATIVE_FORMULA);assert.equal(data.secondary.initiative,7);this.total=14;this.formula=formula;}evaluate(){return this;}getTooltip(){return '';}toMessage(data){posted=data;return data;}};
 const actor={isOwner:true,getRollData:()=>({secondary:{initiative:7}})};await rollActorInitiative(actor);assert.match(posted.content,/Initiative/);assert.equal(posted.flags.elementsofconflictfoundry.card.kind,'initiative');
});

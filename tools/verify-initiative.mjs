// Exercise the installed v14 client methods without booting a licensed world.
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {configureInitiative,rollActorInitiative,INITIATIVE_FORMULA} from '../scripts/initiative.mjs';
const root=process.argv[2];if(!root)throw Error('Provide the installed Foundry app directory.');
const sources=Object.fromEntries(await Promise.all(['combat','combatant','actor'].map(async name=>[name,await readFile(`${root}/client/documents/${name}.mjs`,'utf8')])));
globalThis.CONFIG={Combat:{initiative:{}}};configureInitiative();
const messages=[],context=vm.createContext({CONFIG,game:{system:{}},_loc:()=> 'Initiative',foundry:{utils:{mergeObject:(a,b)=>Object.assign(a,b),escapeHTML:String},dice:{Roll:{create:(formula,data)=>{
 assert.equal(formula,INITIATIVE_FORMULA);assert.equal(typeof data.secondary.initiative,'number');
 return {evaluate(){this.total=6+data.secondary.initiative;return this;},toMessage:async(data,options)=>({...data,options})};
 }}},documents:{ChatMessage:{implementation:{getSpeaker:({actor})=>({actor:actor.id}),create:async data=>messages.push(...data)}}}}});
function method(source,pattern){const match=source.match(pattern);if(!match)throw Error('Installed Foundry method shape changed; inspect before testing.');return vm.runInContext(`({${match[0].trim()}})`,context);}
const coreCombat=method(sources.combat,/  async rollInitiative\(ids,[\s\S]*?\n  \}/).rollInitiative;
const coreActor=method(sources.actor,/  async rollInitiative\(\{[\s\S]*?\n  \}/).rollInitiative;
const coreGetRoll=method(sources.combatant,/  getInitiativeRoll\(formula\) \{[\s\S]*?\n  \}/).getInitiativeRoll;
const coreFormula=method(sources.combatant,/  _getInitiativeFormula\(\) \{[\s\S]*?\n  \}/)._getInitiativeFormula;
const combatants=[];combatants.get=id=>combatants.find(c=>c.id===id);
const makeActor=(id,initiative)=>({id,isOwner:true,isToken:false,getActiveTokens:()=>[],getRollData:()=>({secondary:{initiative}}),rollInitiative:coreActor});
function add(actor){const combatant={id:'c'+combatants.length,name:actor.id,actor,isOwner:true,initiative:null,hidden:actor.id==='npc',getInitiativeRoll:coreGetRoll,_getInitiativeFormula:coreFormula};combatants.push(combatant);return combatant;}
const pc=makeActor('pc',7),npc=makeActor('npc',9);add(pc);add(npc);
const combat={combatants,getCombatantsByActor:actor=>combatants.filter(c=>c.actor===actor),rollInitiative:coreCombat,updateEmbeddedDocuments:async(type,updates)=>{assert.equal(type,'Combatant');for(const update of updates)combatants.get(update._id).initiative=update.initiative;},createEmbeddedDocuments:async(type,docs)=>{assert.equal(type,'Combatant');for(const doc of docs){assert.equal(doc.actorId,'new');add(newActor);}}};
context.game.combat=combat;globalThis.game=context.game;
await combat.rollInitiative(combatants.map(c=>c.id));assert.equal(combatants[0].initiative,13);assert.equal(combatants[1].initiative,15);assert.equal(messages[1].options.messageMode,'gm');assert.equal(messages[0].flags['core.initiativeRoll'],true);
await rollActorInitiative(pc);assert.equal(combatants.length,2);assert.equal(combatants[0].initiative,13);
const newActor=makeActor('new',10);await rollActorInitiative(newActor);assert.equal(combatants.length,3);assert.equal(combatants[2].initiative,16);await rollActorInitiative(newActor);assert.equal(combatants.length,3);
console.log('Installed v14 Combatant/Combat/Actor initiative methods updated tracker values, kept hidden NPC rolls private, and prevented duplicate sheet combatants.');

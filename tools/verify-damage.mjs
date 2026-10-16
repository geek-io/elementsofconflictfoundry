// Validate damage edits using installed v14 Roll serialization and Die totals.
import {readFile,mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {lastDamageDie,maximizeDamageRoll,executeDamageAction} from '../scripts/damage.mjs';
import {SYSTEM_ID} from '../scripts/config.mjs';
const root=process.argv[2];if(!root)throw Error('Provide the installed Foundry app directory.');
const dir=await mkdtemp(resolve('tmp/native-damage-'));await mkdir(resolve(dir,'terms'));
for(const name of ['roll','terms/term','terms/dice','terms/die','terms/operator','terms/numeric']){
 let text=await readFile(`${root}/client/dice/${name}.mjs`,'utf8');
 text=text.replace('import {deepClone} from "@common/utils/_module.mjs";','const deepClone=structuredClone;');
 await writeFile(resolve(dir,`${name}.mjs`),text);
}
const NativeRoll=(await import(pathToFileURL(resolve(dir,'roll.mjs')))).default;
const entries=await Promise.all(['term','dice','die','operator','numeric'].map(async n=>(await import(pathToFileURL(resolve(dir,`terms/${n}.mjs`)))).default));
const [RollTerm,DiceTerm,Die,OperatorTerm,NumericTerm]=entries;
// Formula parsing is unrelated to modifying a saved, evaluated roll.
class SavedRoll extends NativeRoll{static parse(){return [];}constructor(formula,...args){super(formula,...args);this._formula=formula;}}
globalThis.foundry={dice:{terms:{RollTerm,DiceTerm,Die,OperatorTerm,NumericTerm}},utils:{deepClone:structuredClone}};
globalThis.CONFIG={Dice:{fulfillment:{methods:{}},rolls:[SavedRoll],termTypes:{Die,OperatorTerm,NumericTerm},terms:{d:Die}}};
Number.isNumeric=n=>Number.isFinite(Number(n));
for(const faces of [6,8,10,12]){
 const data={class:'SavedRoll',formula:`4 + 1d${faces}x${faces}`,data:{},options:{},evaluated:true,total:4+faces+2,dice:[],terms:[{class:'NumericTerm',number:4},{class:'OperatorTerm',operator:'+'},{class:'Die',number:1,faces,modifiers:[`x${faces}`],results:[{result:faces,active:true,exploded:true},{result:2,active:true}]}]};
 globalThis.Roll=SavedRoll;
 const roll=SavedRoll.fromData(data),{boosted:edited}=maximizeDamageRoll(roll),last=lastDamageDie(edited);
 assert.equal(last.result.result,faces);assert.equal(lastDamageDie(roll).result.result,2);
 assert.equal(edited.total,4+faces*2);assert.equal(roll.total,4+faces+2);
 const saved=SavedRoll.fromData(edited.toJSON());assert.equal(saved.total,4+faces*2);assert.equal(lastDamageDie(saved).result.result,faces);
}
Array.prototype.filterJoin??=function(separator){return this.filter(Boolean).join(separator);};
const state={fortune:2,misfortune:1},user={id:'gm',active:true,isGM:true};
const message={id:'native-damage',speakerActor:{type:'character',testUserPermission:()=>true},flags:{[SYSTEM_ID]:{card:{kind:'damage'},damage:{title:'Native weapon'}}},whisper:[],author:user,
 rolls:[SavedRoll.fromData({class:'SavedRoll',formula:'4 + 1d8',evaluated:true,total:6,dice:[],terms:[{class:'NumericTerm',number:4},{class:'OperatorTerm',operator:'+'},{class:'Die',number:1,faces:8,modifiers:[],results:[{result:2,active:true}]}]})],
 update:async(data,options)=>{assert.equal(options.diff,false);message.rolls=data.rolls.map(json=>SavedRoll.fromJSON(json));message.flags[SYSTEM_ID].damage=data[`flags.${SYSTEM_ID}.damage`];message.content=data.content;}};
globalThis.game={user,users:{activeGM:user,get:()=>user},messages:{get:()=>message},settings:{get:(id,key)=>state[key],set:async(id,key,value)=>{state[key]=value;}}};
foundry.applications={handlebars:{renderTemplate:async(path,data)=>JSON.stringify(data)}};
await executeDamageAction(message.id,user.id,'maximize');
assert.equal(message.rolls[0].total,12);assert.equal(message.rolls[0].dice[0].results[0].result,8);assert.equal(state.fortune,1);assert.equal(state.misfortune,2);assert.equal(message.flags[SYSTEM_ID].damage.maximized,true);assert.ok(message.content.includes('maximized'));
console.log('Native v14 Roll/Die: final explosion die maximized for d6/d8/d10/d12, original preserved, totals and serialization verified.');


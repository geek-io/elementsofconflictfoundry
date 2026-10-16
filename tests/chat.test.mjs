import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Handlebars from "handlebars";
import { qualityTags } from "../scripts/qualities.mjs";
import { testCardContext,totalCardContext,postRollCard,decorateChatMessage } from "../scripts/chat.mjs";
import { skillChance,testResult } from "../scripts/rules.mjs";
import trappings from "../data/basic-trappings.mjs";
import { SYSTEM_ID } from "../scripts/config.mjs";
test("all core armament qualities resolve to EoC rules, with parameterized aliases intact",()=>{
 for(const item of trappings.filter(item=>["weapon","armor"].includes(item.type)))for(const tag of qualityTags(item.system.qualities))assert.equal(tag.known,true,`${item.name}: ${tag.label}`);
 const tags=qualityTags("Empowering (Fire, Yin), Piercing (2); Workable (15), Pummelling");
 assert.equal(tags.length,4);assert.match(tags[0].tooltip,/Fire, Yin/);assert.match(tags[1].tooltip,/up to 2/);assert.match(tags[2].tooltip,/\+15/);assert.equal(tags[3].name,"Pummeling");
 assert.equal(qualityTags("Custom Curse")[0].known,false);assert.deepEqual(qualityTags("N/A, none"),[]);
});
const system={attributes:{brawn:45},skills:{athletics:1},perilState:0};
test("cards preserve flipped results, supreme/critical outcomes and the original chance",()=>{
 const current=skillChance(system,"athletics");
 for(const [raw,mode] of [[83,"advantage"],[1,"disadvantage"],[100,"advantage"],[44,"normal"],[88,"normal"]]){
  const result=testResult(raw,current.chance,mode),context=testCardContext({current,result,mode,difficulty:10});
  assert.equal(context.total,result.total);assert.equal(context.chance,current.chance);assert.equal(context.outcome,result.label);
  assert.equal(context.outcomeClass.includes("success"),result.success);assert.equal(context.outcomeClass.includes("critical"),result.critical);
 }
 assert.ok(testCardContext({current,result:testResult(83,55,"advantage"),mode:"advantage"}).badges.some(badge=>badge.label==="Flipped 83 → 38"));
});
test("roll template escapes names and tooltip text, retaining expandable native dice details",async()=>{
 const render=Handlebars.compile(await readFile("templates/chat-roll.hbs","utf8"));
 const context=testCardContext({current:skillChance(system,"athletics"),result:testResult(38,55),mode:"normal",item:{name:'<img src=x onerror=alert(1)>',type:"weapon",system:{qualities:'<script>bad()</script>'}}});
 const html=render({...context,tooltip:'<div class="dice-tooltip">Native dice breakdown</div>'});
 assert.ok(html.includes('&lt;img src'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));
 assert.ok(html.includes('<details'));assert.ok(html.includes('class="dice-tooltip"'));assert.ok(html.includes('data-tooltip-html='));assert.ok(!html.includes('title='));
});
test("posting cards retains real Rolls and uses core message-mode visibility",async()=>{
 let sent,options;
 globalThis.foundry={applications:{handlebars:{renderTemplate:async(path,context)=>{assert.ok(path.endsWith("chat-roll.hbs"));return `<article>${context.total}</article>`;}}}};
 globalThis.ChatMessage={getSpeaker:({actor})=>({actor:actor.id})};
 const roll={total:12,formula:"1d6x6 + 4",dice:[{results:[{exploded:true},{exploded:false}]}],getTooltip:async()=>"Native tooltip",toMessage:async(data,opts)=>{sent=data;options=opts;return data;}};
 const context=totalCardContext({roll,title:"Kunai",kind:"damage"});assert.equal(context.badges[0].label,"Exploding dice ×1");
 await postRollCard(roll,{id:"actor"},context);
 assert.equal(sent.speaker.actor,"actor");assert.equal(sent.flags[SYSTEM_ID].card.kind,"damage");assert.equal(options,undefined);
 let classes=[];const html={querySelector:()=>true,classList:{add:value=>classes.push(value)}};
 decorateChatMessage({flags:sent.flags,isContentVisible:false},html);assert.deepEqual(classes,[]);
 decorateChatMessage({flags:sent.flags,isContentVisible:true},html);assert.deepEqual(classes,["eoc-chat-message"]);
});

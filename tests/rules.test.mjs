import test from "node:test";
import assert from "node:assert/strict";
import { bonuses, secondary, skillChance, testResult } from "../scripts/rules.mjs";
import { SKILLS, ATTRIBUTES } from "../scripts/config.mjs";
import { registerMultiTargetExplosions } from "../scripts/dice.mjs";
const system = () => ({ attributes: Object.fromEntries(Object.keys(ATTRIBUTES).map(k => [k, 45])), skills: { guile: 3, education: 0 }, bonusAdjustments: { brawn: 1 }, tier: 2, perilState: 0, damageState: 0 });
test("EoC skill list includes 33 unique skills and correct jutsu attributes", () => {
  assert.equal(SKILLS.length, 33); assert.equal(new Set(SKILLS.map(s => s.key)).size, 33);
  assert.equal(SKILLS.find(s => s.key === "ninjutsu").attribute, "willpower");
  assert.equal(SKILLS.find(s => s.key === "genjutsu").attribute, "fellowship");
});
test("Peril subtracts effective ranks before applying the subtotal cap", () => {
  const s = system(); assert.equal(skillChance(s, "guile").chance, 75);
  s.perilState = 3; assert.equal(skillChance(s, "guile").chance, 55);
  assert.equal(skillChance(s, "guile", 50, -10).chance, 65);
  assert.equal(skillChance(s, "guile", -100, 10).chance, 25);
  s.perilState = 5; assert.equal(skillChance(s, "guile").incapacitated, true);
});
test("untrained Special skills impose disadvantage; Common skills do not", () => {
  assert.equal(skillChance(system(), "education").disadvantaged, true);
  assert.equal(skillChance(system(), "guile").disadvantaged, false);
});
test("advantage flips the same digits and respects supreme edge cases", () => {
  assert.equal(testResult(91, 85, "advantage").total, 19);
  assert.equal(testResult(19, 90, "disadvantage").total, 91);
  assert.equal(testResult(10, 50, "advantage").total, 1);
  assert.equal(testResult(1, -100, "disadvantage").label, "Supreme Success");
  assert.equal(testResult(100, 200, "advantage").label, "Supreme Failure");
  assert.equal(testResult(55, 55).label, "Critical Success");
  assert.equal(testResult(55, 54).label, "Critical Failure");
});
test("secondary stats include separate bonus adjustments and highest equipped armor", () => {
  const s = system(); assert.equal(bonuses(s).brawn, 5);
  const stats = secondary(s, [{type:"armor",system:{equipped:true,armorBonus:3,encumbrance:2,quantity:1}}, {type:"armor",system:{equipped:true,armorBonus:2,carried:false}}]);
  assert.equal(stats.damage, 8); assert.equal(stats.chakra, 18); assert.equal(stats.peril, 7); assert.equal(stats.carried, 2);
});
test("multi-target explosions recurse, honor inactive dice, and delegate ordinary modifiers", async () => {
  class Die { constructor() {this.faces=6;this.results=[{result:1,active:true},{result:6,active:false}];this.next=[6,3];} async explode(modifier){return modifier;} async roll(){this.results.push({result:this.next.shift(),active:true});} }
  registerMultiTargetExplosions(Die); const die=new Die(); await die.explode("x1&6");
  assert.deepEqual(die.results.map(r=>r.result),[1,6,6,3]); assert.equal(die.results[1].exploded,undefined);
  assert.equal(await die.explode("x6"),"x6"); await assert.rejects(()=>die.explode("x1&2&3&4&5&6"));
});

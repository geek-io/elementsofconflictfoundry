import { SKILLS, ATTRIBUTES, PHYSICAL_TYPES } from "./config.mjs?v=0.3.15";
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export function professionAdvances(upstream = {}) {
  const group = (records, count) => Object.fromEntries(Array.from({ length: count }, (_, index) => {
    const value = records?.[index] ?? {};
    return [String(index), { name: String(value.name ?? ""), uuid: String(value.uuid ?? ""), completed: Boolean(value.completed ?? value.purchased) }];
  }));
  return { talents: group(upstream.talents, 3), skills: group(upstream.skillRanks, 10), bonuses: group(upstream.bonusAdvances, 7) };
}
export function professionProgress(advances) {
  const count = group => Object.values(advances?.[group] ?? {}).filter(slot => slot.name.trim() && slot.completed).length;
  const talents=count("talents"), skills=count("skills"), bonuses=count("bonuses");
  return { talents, skills, bonuses, completed: talents+skills+bonuses, total: 20, complete: talents===3 && skills===10 && bonuses===7 };
}
export function bonuses(system) {
  return Object.fromEntries(Object.keys(ATTRIBUTES).map(key => [key, Math.floor(attributeValue(system,key) / 10) + (system.bonusAdjustments?.[key] ?? 0) + (system.heritageBonuses?.[key] ?? 0)]));
}
export const attributeValue = (system,key) => clamp(system.attributes[key] + (system.heritageAttributes?.[key] ?? 0),0,100);
export const selectedHeritage = items => items.find(item=>item.type==="heritage" && item.system.heritageEnabled);
export function secondary(system, items = []) {
  const b = bonuses(system);
  const armor = items.filter(i => i.type === "armor" && i.system.equipped).reduce((max, i) => Math.max(max, i.system.armorBonus ?? 0), 0);
  const shield = items.filter(i => i.type === "weapon" && i.system.equipped).reduce((max, i) => Math.max(max, i.system.armorBonus ?? 0), 0);
  const reserved=items.reduce((sum,item)=>sum+Math.max(0,Number(system.chakraReservations?.[item.id] ?? 0)||0),0);
  const result = { initiative: 3 + b.perception, movement: 3 + b.agility, encumbrance: 3 + b.brawn,
    techniqueLimit: 3 + b.intelligence, peril: 3 + b.willpower, damage: b.brawn + armor + shield,
    chakra: Math.max(0, system.tier * (b.brawn + b.willpower) + (system.chakraBonus ?? 0)-reserved),
    carried: items.filter(i => PHYSICAL_TYPES.includes(i.type) && i.system.carried !== false).reduce((n, i) => n + (i.system.encumbrance ?? 0) * (i.system.quantity ?? 1), 0) };
  for (const key of ["initiative","movement","encumbrance","techniqueLimit","peril","damage"]) result[key] += system.secondaryAdjustments?.[key] ?? 0;
  return result;
}
export function skillChance(system, key, modifier = 0, difficulty = 0) {
  const skill = SKILLS.find(s => s.key === key);
  if (!skill) throw Error("Unknown skill");
  const rank = system.skills?.[key] ?? 0;
  const ignored = clamp((system.perilState ?? 0) - 1, 0, 3);
  const effectiveRank = Math.max(0, rank - ignored);
  const subtotal=effectiveRank * 10 + modifier + (system.heritageSkills?.[key] ?? 0) + (rank===0 ? system.heritageUntrainedBonus ?? 0 : 0);
  return { skill, rank, effectiveRank, base: attributeValue(system,skill.attribute) + clamp(subtotal, -30, 30),
    chance: attributeValue(system,skill.attribute) + clamp(subtotal, -30, 30) + difficulty,
    disadvantaged: skill.special && rank === 0, incapacitated: system.perilState === 5 || system.damageState === 5 };
}
export function testResult(raw, chance, mode = "normal") {
  if (!Number.isInteger(raw) || raw < 1 || raw > 100) throw Error("Invalid d100 result");
  const reversed = raw % 10 * 10 + Math.floor(raw / 10);
  const flipped = reversed === 0 ? 100 : reversed;
  const total = raw === 1 || raw === 100 ? raw : mode === "advantage" ? Math.min(raw, flipped) : mode === "disadvantage" ? Math.max(raw, flipped) : raw;
  const success = total === 1 || (total !== 100 && total <= chance);
  const critical = total === 1 || total === 100 || total % 11 === 0;
  return { raw, total, success, critical, label: total === 1 ? "Supreme Success" : total === 100 ? "Supreme Failure" : `${critical ? "Critical " : ""}${success ? "Success" : "Failure"}` };
}

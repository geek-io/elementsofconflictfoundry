import { conditionalBonus } from './conditional-bonuses.mjs?v=0.3.19';
import { skillChance } from './rules.mjs?v=0.3.19';
export function actorTestChance(actor, key, modifier = 0, difficulty = 0, { item = null, label = '' } = {}) {
  const current = skillChance(actor.system, key, modifier, difficulty);
  if (actor.type !== 'npc') return current;
  const fixed = item?.system.testChance ?? actor.system.npcDefenses?.[label.toLowerCase()];
  if (typeof fixed !== 'number' || !Number.isFinite(fixed)) return current;
  const base =
    fixed - (current.rank - current.effectiveRank) * 10 + modifier + conditionalBonus(actor.system, key);
  return { ...current, base, chance: base + difficulty, disadvantaged: false };
}

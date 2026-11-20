import { SKILLS, ATTRIBUTES } from './config.mjs?v=0.3.19';
import { actorAction } from './action-flow.mjs?v=0.3.19';
export function conditionalBonus(system, key) {
  const attribute = SKILLS.find((s) => s.key === key)?.attribute;
  return (system.conditionalBonuses ?? [])
    .filter(
      (row) =>
        row.enabled &&
        (row.target === 'all' || row.target === key || row.target === `attribute:${attribute}`),
    )
    .reduce((n, row) => n + Number(row.value || 0), 0);
}
export function conditionalAdjustment(system, target) {
  return (system.conditionalBonuses ?? [])
    .filter((row) => row.enabled && row.target === target)
    .reduce((n, row) => n + Number(row.value || 0), 0);
}
export function conditionalDamageFormula(actor, formula) {
  const value = conditionalAdjustment(actor.system, 'damage');
  return value ? `(${formula}) + (${value})` : formula;
}
export function conditionalTargets() {
  return {
    all: 'All tests (%)',
    ...Object.fromEntries(
      Object.entries(ATTRIBUTES).map(([key, label]) => [`attribute:${key}`, `${label} tests (%)`]),
    ),
    ...Object.fromEntries(SKILLS.map((s) => [s.key, `${s.label} (%)`])),
    ...Object.fromEntries(
      Object.entries(ATTRIBUTES).map(([key, label]) => [`bonus:${key}`, `${label} Bonus (+points)`]),
    ),
    ...Object.fromEntries(
      ['initiative', 'movement', 'encumbrance', 'techniqueLimit', 'peril', 'damage', 'chakra'].map((key) => [
        `secondary:${key}`,
        `${{ peril: 'Peril Threshold', damage: 'Damage Threshold', chakra: 'Chakra maximum', techniqueLimit: 'Technique limit', encumbrance: 'Encumbrance limit', initiative: 'Initiative', movement: 'Movement' }[key]} (+value)`,
      ]),
    ),
    damage: 'Damage rolls (+flat damage)',
  };
}
export const CONDITIONAL_ITEM_TYPES = ['talent', 'technique', 'heritage'];
export function itemConditionalRows(items, heritage) {
  return Array.from(items ?? [])
    .filter(
      (item) =>
        CONDITIONAL_ITEM_TYPES.includes(item.type) && (item.type !== 'heritage' || item.id === heritage?.id),
    )
    .flatMap((item) =>
      (item.system.conditionalBonuses ?? []).map((row) => ({
        ...row,
        id: `item:${item.id}:${row.id}`,
        name: `${item.name}: ${row.name}`,
        sourceItemId: item.id,
        sourceRowId: row.id,
      })),
    );
}
export async function editConditionalBonus(actor, { id, field, value, add = false, remove = false } = {}) {
  if (!actor.isOwner) throw Error('You must own this character.');
  if (id?.startsWith('item:') && actor.documentName !== 'Item') {
    const [, itemId, rowId] = id.split(':');
    const item = actor.items.get(itemId);
    if (!item) throw Error('The source item no longer exists.');
    return editConditionalBonus(item, { id: rowId, field, value, remove });
  }
  return actorAction(actor, async () => {
    const rows = JSON.parse(
      JSON.stringify((actor.system.conditionalBonuses ?? []).filter((row) => !row.sourceItemId)),
    );
    if (add)
      rows.push({
        id: foundry.utils.randomID(),
        name: 'Conditional bonus',
        target: 'all',
        value: 10,
        enabled: false,
      });
    else {
      const i = rows.findIndex((row) => row.id === id);
      if (i < 0) return;
      if (remove) rows.splice(i, 1);
      else if (field === 'enabled') rows[i].enabled = Boolean(value);
      else if (field === 'name') rows[i].name = String(value);
      else if (field === 'target' && Object.hasOwn(conditionalTargets(), value)) rows[i].target = value;
      else if (field === 'value' && Number.isInteger(Number(value)) && Math.abs(Number(value)) <= 100)
        rows[i].value = Number(value);
      else throw Error('Enter a valid conditional bonus.');
    }
    await actor.update({ 'system.conditionalBonuses': rows });
  });
}

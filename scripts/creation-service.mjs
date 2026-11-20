import { SYSTEM_ID, ATTRIBUTES, SKILLS } from './config.mjs?v=0.3.19';
import { actorAction } from './action-flow.mjs?v=0.3.19';
import {
  PROFESSION_ATTRIBUTES,
  techniqueLearningCost,
  isDraftTechnique,
} from './creation-tables.mjs?v=0.3.19';
const copy = (value) => JSON.parse(JSON.stringify(value));
const normalized = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
const source = (actor) => actor._source?.system ?? actor.system;
const log = (state, entry) => ({
  ...state,
  ledger: [
    ...(state.ledger ?? []),
    { id: foundry.utils.randomID(), time: new Date().toISOString(), ...entry },
  ],
});
const replace = (value) => globalThis.foundry?.data?.operators?.ForcedReplacement?.create(value) ?? value;
function check(actor) {
  if (!actor.isOwner || actor.type !== 'character') throw Error('Use a character you own.');
}
export function xpBalances(actor) {
  const s = actor.system,
    c = s.creationState ?? {},
    restricted = Math.max(0, (c.restrictedTotal ?? 0) - (c.restrictedSpent ?? 0));
  const total = Math.max(0, s.experience - s.spentExperience);
  return {
    gained: s.experience,
    spent: s.spentExperience,
    total,
    restricted: Math.min(total, restricted),
    general: Math.max(0, total - restricted),
  };
}
export function purchaseBudget(actor, cost, technique = false) {
  if (!Number.isInteger(cost) || cost < 0) throw Error('Enter a non-negative whole XP cost.');
  const balance = xpBalances(actor);
  if (cost > (technique ? balance.total : balance.general))
    throw Error('Not enough eligible XP. Undiscovered Nature XP can buy only Techniques.');
  return technique ? Math.min(cost, balance.restricted) : 0;
}
export async function creationCatalogue() {
  const entries = [];
  for (const item of game.items.contents)
    if (
      ['profession', 'heritage', 'talent', 'trait', 'technique'].includes(item.type) &&
      (item.visible || game.user.isGM)
    )
      entries.push({
        uuid: item.uuid,
        name: item.name,
        type: item.type,
        system: copy(item.system),
        document: item,
      });
  for (const pack of game.packs)
    if (
      pack.metadata.packageName === SYSTEM_ID &&
      pack.visible &&
      pack.documentName === 'Item' &&
      [
        'eoc-professions',
        'eoc-talents',
        'eoc-specialist-traits',
        'eoc-heritages',
        'eoc-book-techniques',
      ].includes(pack.metadata.name)
    ) {
      for (const item of await pack.getDocuments())
        if (!entries.some((e) => e.type === item.type && e.name === item.name && e.uuid.startsWith('Item.')))
          entries.push({
            uuid: item.uuid,
            name: item.name,
            type: item.type,
            system: copy(item.system),
            document: item,
          });
    }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}
function itemData(document) {
  const data = copy(document.toObject());
  delete data._id;
  data.flags ??= {};
  data.flags.core ??= {};
  data.flags.core.sourceId = document.uuid;
  for (const effect of data.effects ?? []) delete effect._id;
  return data;
}
export function specialistFor(profession, catalogue) {
  const uuid = String(profession.system.description ?? '').match(
    /@UUID\[([^\]]*eoc-specialist-traits[^\]]*)\]/,
  )?.[1];
  return (
    catalogue.find((e) => e.uuid === uuid) ||
    catalogue.find((e) => e.type === 'trait' && e.system.category === profession.name)
  );
}
export function advanceOptions(actor) {
  return actor.items
    .filter((i) => i.type === 'profession')
    .flatMap((profession) =>
      ['skills', 'bonuses', 'talents'].flatMap((group) =>
        Object.entries(profession.system.advances?.[group] ?? {})
          .filter(([, slot]) => slot.name)
          .map(([index, slot]) => ({
            professionId: profession.id,
            profession: profession.name,
            group,
            index,
            name: slot.name,
            completed: slot.completed,
            cost: 100,
          })),
      ),
    );
}
export function initializeCharacter(actor, profile, catalogue) {
  return actorAction(actor, async () => {
    check(actor);
    if (
      actor.system.creationState?.initialized ||
      actor.system.experience ||
      actor.system.spentExperience ||
      actor.items.some((i) => i.type === 'profession')
    )
      throw Error(
        'This character already has advancement data. Use the purchase section for existing characters.',
      );
    const profession = catalogue.find((e) => e.uuid === profile.profession && e.type === 'profession'),
      heritage = catalogue.find((e) => e.uuid === profile.heritage && e.type === 'heritage');
    if (!profession) throw Error('Choose a Profession.');
    const specialist = specialistFor(profession, catalogue);
    if (!specialist) throw Error('This Profession needs a linked Specialist Trait before initialization.');
    const attributes = Object.fromEntries(
      Object.keys(ATTRIBUTES).map((key, i) => [
        key,
        Number(profile.values?.[Number(profile.assignments?.[key] ?? i)]),
      ]),
    );
    const indices = Object.keys(ATTRIBUTES).map((key, i) => Number(profile.assignments?.[key] ?? i));
    if (
      new Set(indices).size !== 7 ||
      indices.some((i) => !Number.isInteger(i) || i < 0 || i > 6) ||
      Object.values(attributes).some((v) => !Number.isInteger(v) || v < 37 || v > 55)
    )
      throw Error('Roll seven 2d10+35 values and assign each result exactly once.');
    const attribute = PROFESSION_ATTRIBUTES[profession.name];
    if (attribute) attributes[attribute] += 5;
    if (
      !['Water', 'Fire', 'Wind', 'Lightning', 'Earth', 'Yin', 'Yang', 'Undiscovered'].includes(profile.nature)
    )
      throw Error('Choose a Chakra Nature.');
    const restricted = profile.nature === 'Undiscovered' ? 500 : 0,
      before = copy(source(actor)),
      oldName = actor.name;
    const professionData = itemData(profession.document);
    for (const slots of Object.values(professionData.system.advances ?? {}))
      for (const slot of Object.values(slots)) slot.completed = false;
    const data = [professionData, itemData(specialist.document)];
    if (heritage) {
      const record = itemData(heritage.document);
      record.system.heritageEnabled = true;
      data.push(record);
    }
    for (const row of profession.system.equipment ?? []) {
      const record = copy(row);
      delete record.id;
      delete record._id;
      data.push(record);
    }
    let created = [];
    try {
      created = await actor.createEmbeddedDocuments('Item', data, { eocSkipEquipment: true });
      const state = log(
        {
          initialized: true,
          completed: false,
          restrictedTotal: restricted,
          restrictedSpent: 0,
          profile: copy(profile),
          rollHistory: copy(profile.rollHistory ?? []),
        },
        { kind: 'profession', label: `${profession.name}: Specialist Trait — ${specialist.name}`, cost: 100 },
      );
      await actor.update({
        name: profile.name?.trim() || actor.name,
        'system.attributes': attributes,
        'system.profession': profession.name,
        'system.heritage': heritage?.name ?? '',
        'system.chakraNature': profile.nature,
        'system.tier': 1,
        'system.shonen': 2,
        'system.experience': 1000 + restricted,
        'system.spentExperience': 100,
        'system.age': profile.age ?? '',
        'system.gender': profile.gender ?? '',
        'system.appearance': [
          'stature',
          'build',
          'complexion',
          'hairLength',
          'hairStyle',
          'hairColor',
          'eyes',
        ]
          .filter((k) => profile[k])
          .map((k) => `${k.replace(/([A-Z])/g, ' $1')}: ${profile[k]}`)
          .join('\n'),
        'system.nindo': `War: ${profile.war ?? ''}; Peace: ${profile.peace ?? ''}${profile.memento ? `; Memento: ${profile.memento}` : ''}`,
        'system.creationState': replace(state),
      });
      await actor.update({ 'system.chakra.value': actor.system.chakra.max });
    } catch (error) {
      if (created.length)
        await actor.deleteEmbeddedDocuments(
          'Item',
          created.map((d) => d.id),
        );
      await actor.update({ name: oldName, system: replace(before) });
      throw error;
    }
  });
}
export function buyAdvance(actor, { professionId, group, index, techniqueUuid }, catalogue) {
  return actorAction(actor, async () => {
    check(actor);
    const before = copy(source(actor)),
      state = copy(before.creationState ?? {});
    let created = [],
      profession,
      oldAdvances;
    const changes = {};
    let cost = 100,
      label,
      kind = group,
      restricted = 0,
      updateProfession;
    if (techniqueUuid) {
      const entry = catalogue.find((e) => e.uuid === techniqueUuid && e.type === 'technique');
      if (!entry) throw Error('Technique not found.');
      if (isDraftTechnique(entry))
        throw Error(
          'This Technique is still a draft. Configure its rules and costs before it can be learned.',
        );
      const price = techniqueLearningCost(entry, actor.system.chakraNature);
      if (!price) throw Error('This Technique has no rank price. Set an explicit learning cost on the Item.');
      cost = price.cost;
      if (actor.items.some((i) => i.type === 'technique' && normalized(i.name) === normalized(entry.name)))
        throw Error('This character already knows that Technique.');
      if (actor.items.filter((i) => i.type === 'technique').length >= actor.system.secondary.techniqueLimit)
        throw Error('Technique limit reached.');
      restricted = purchaseBudget(actor, cost, true);
      label = entry.name;
      kind = 'technique';
      created = [itemData(entry.document)];
    } else {
      profession = actor.items.get(professionId);
      if (profession?.type !== 'profession' || !['skills', 'bonuses', 'talents'].includes(group))
        throw Error('Choose an advance from an owned Profession.');
      const slot = profession.system.advances?.[group]?.[index];
      if (!slot?.name || slot.completed) throw Error('This advance is unavailable or already purchased.');
      purchaseBudget(actor, cost);
      label = `${profession.name}: ${slot.name}`;
      oldAdvances = copy(profession.system.advances);
      updateProfession = copy(oldAdvances);
      updateProfession[group][index].completed = true;
      if (group === 'skills') {
        const skill = SKILLS.find((s) => normalized(s.label) === normalized(slot.name));
        if (!skill) throw Error('Unknown Profession skill.');
        const rank = before.skills[skill.key];
        if (rank >= 3) throw Error('This Skill already has three ranks.');
        if (
          Object.values(profession.system.advances.skills).some(
            (s) => s.completed && normalized(s.name) === normalized(slot.name),
          ) ||
          state.ledger?.some(
            (e) => e.professionId === professionId && e.kind === 'skills' && e.skill === skill.key,
          )
        )
          throw Error('Only one rank per Skill may be bought in each Profession.');
        changes[`system.skills.${skill.key}`] = rank + 1;
        changes._skill = skill.key;
      }
      if (group === 'bonuses') {
        const key = Object.keys(ATTRIBUTES).find(
          (key) => normalized(slot.name.replace(/ Bonus$/i, '')) === key,
        );
        if (!key) throw Error('Unknown Bonus Advance.');
        changes[`system.bonusAdjustments.${key}`] = (before.bonusAdjustments[key] ?? 0) + 1;
      }
      if (group === 'talents') {
        const entry =
          catalogue.find((e) => e.uuid === slot.uuid) ||
          catalogue.find((e) => e.type === 'talent' && normalized(e.name) === normalized(slot.name));
        if (!entry) throw Error('Link this Talent to an available Item before purchasing.');
        if (actor.items.some((i) => i.type === 'talent' && normalized(i.name) === normalized(entry.name)))
          throw Error('This character already has that Talent.');
        created = [itemData(entry.document)];
      }
    }
    const skill = changes._skill;
    delete changes._skill;
    let next = log(state, {
      kind,
      label,
      cost,
      restricted,
      professionId,
      group,
      index,
      skill,
      techniqueUuid,
    });
    next.restrictedSpent = (state.restrictedSpent ?? 0) + restricted;
    Object.assign(changes, {
      'system.spentExperience': before.spentExperience + cost,
      'system.creationState': replace(next),
    });
    let documents = [];
    try {
      if (created.length) documents = await actor.createEmbeddedDocuments('Item', created);
      if (profession) await profession.update({ 'system.advances': updateProfession });
      await actor.update(changes);
    } catch (error) {
      if (documents.length)
        await actor.deleteEmbeddedDocuments(
          'Item',
          documents.map((d) => d.id),
        );
      if (profession) await profession.update({ 'system.advances': oldAdvances });
      await actor.update({ system: replace(before) });
      throw error;
    }
  });
}
export function awardCreationXP(actor, amount) {
  return actorAction(actor, async () => {
    check(actor);
    if (!game.user.isGM) throw Error('Only the GM can award XP here.');
    if (!Number.isInteger(amount) || amount <= 0) throw Error('Enter a positive whole XP award.');
    await actor.update({
      'system.experience': actor.system.experience + amount,
      'system.creationState': replace(
        log(actor.system.creationState ?? {}, { kind: 'award', label: 'XP awarded', cost: 0, amount }),
      ),
    });
  });
}

export const SYSTEM_ID = "elementsofconflictfoundry";
export const ATTRIBUTES = { combat: "Combat", brawn: "Brawn", agility: "Agility", perception: "Perception", intelligence: "Intelligence", willpower: "Willpower", fellowship: "Fellowship" };
export const ITEM_TYPES = ["gear", "weapon", "armor", "medicine", "tool", "technique", "profession", "trait", "talent", "heritage", "ancestry", "condition", "disease", "disorder", "drawback", "injury", "quality", "skill", "trapping"];
export const JUTSU_TYPES = ["technique"];
export const ITEM_ICONS = Object.fromEntries(ITEM_TYPES.map(type => [type, `systems/${SYSTEM_ID}/icons/${type}.svg`]));
export const PHYSICAL_TYPES = ["gear", "weapon", "armor", "medicine", "tool", "trapping"];
export const RECORD_TYPES = ITEM_TYPES.filter(type => !PHYSICAL_TYPES.includes(type));
export const SKILLS = [
  ["athletics", "Athletics", "brawn"], ["awareness", "Awareness", "perception"], ["bargain", "Bargain", "fellowship"],
  ["bukijutsu", "Bukijutsu", "combat", true], ["chakraControl", "Chakra Control", "intelligence", true], ["charm", "Charm", "fellowship"],
  ["coordination", "Coordination", "agility"], ["disguise", "Disguise", "fellowship", true], ["eavesdrop", "Eavesdrop", "perception"],
  ["education", "Education", "intelligence", true], ["folklore", "Folklore", "intelligence"], ["fuinjutsu", "Fuinjutsu", "intelligence", true],
  ["gamble", "Gamble", "intelligence"], ["genjutsu", "Genjutsu", "fellowship", true], ["guile", "Guile", "fellowship"],
  ["handleAnimal", "Handle Animal", "fellowship", true], ["handleVehicle", "Handle Vehicle", "agility", true], ["heal", "Heal", "intelligence", true],
  ["intimidate", "Intimidate", "brawn"], ["leadership", "Leadership", "fellowship", true], ["navigation", "Navigation", "intelligence", true],
  ["ninjutsu", "Ninjutsu", "willpower", true], ["resolve", "Resolve", "willpower"], ["rumor", "Rumor", "fellowship"],
  ["scrutinize", "Scrutinize", "perception"], ["skullduggery", "Skullduggery", "agility", true], ["stealth", "Stealth", "agility"],
  ["strategy", "Strategy", "intelligence", true], ["survival", "Survival", "perception"], ["taijutsu", "Taijutsu", "combat"],
  ["toughness", "Toughness", "brawn"], ["tradecraft", "Tradecraft", "intelligence", true], ["warfare", "Warfare", "combat", true]
].map(([key, label, attribute, special = false]) => ({ key, label, attribute, special }));
export const DAMAGE_STATES = ["Unharmed", "Lightly wounded", "Moderately wounded", "Seriously wounded", "Grievously wounded", "Slain"];
export const PERIL_STATES = ["Unhindered", "Imperiled", "Ignore 1 rank", "Ignore 2 ranks", "Ignore 3 ranks", "Incapacitated"];

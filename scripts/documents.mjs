import {migrateItemSource} from './item-migration.mjs?v=0.3.15';
import { bonuses, secondary, selectedHeritage } from "./rules.mjs?v=0.3.15";
import { PHYSICAL_TYPES, JUTSU_TYPES, ITEM_ICONS } from "./config.mjs?v=0.3.15";
import { heritageBonusValues } from "./heritage.mjs?v=0.3.15";
export class EocActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
    const heritage=selectedHeritage(this.items.contents);
    this.system.heritageBonuses = heritageBonusValues(heritage?.system);
    this.system.heritageAttributes = {};
    this.system.heritageSkills = {};
    this.system.heritageUntrainedBonus = /^Child of the Pure Lands/i.test(heritage?.name??'') && this.system.tier>=1 && heritage.system.boons?.some(boon=>boon.tier===1 && /\+5 Base Chance/i.test(boon.description)) ? 5 : 0;
    this.system.secondary = secondary(this.system, this.items.contents);
    this.system.chakra.max = this.system.secondary.chakra;
  }
  getRollData() { return { ...super.getRollData(), bonuses: bonuses(this.system) }; }
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    const changes = {};
    if (data.type === "character") {
      if (data.system?.shonen === undefined) changes["system.shonen"] = 2;
      if (data.prototypeToken?.actorLink === undefined) changes["prototypeToken.actorLink"] = true;
    }
    this.updateSource(changes);
  }
}
export class EocItem extends Item {
  static _preCleanData(source,options,state){migrateItemSource(source);return super._preCleanData(source,options,state);}
  static migrateData(source,options){migrateItemSource(source);return super.migrateData(source,options);}
  prepareBaseData() {
    super.prepareBaseData();
    if (!this.img || this.img === "icons/svg/item-bag.svg") this.img=ITEM_ICONS[this.type] ?? this.img;
  }
  async _preUpdate(changes, options, user) {
    if (changes.system?.audience === "antagonist" && this.system.audience !== "antagonist") changes.system.active = false;
    return super._preUpdate(changes, options, user);
  }
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (JUTSU_TYPES.includes(data.type) && data.system?.skill === undefined) this.updateSource({ "system.skill": "ninjutsu" });
    if (!data.img || data.img === "icons/svg/item-bag.svg") this.updateSource({ img:ITEM_ICONS[data.type] });
    if (data.type === "heritage" && this.parent?.documentName === "Actor" && selectedHeritage(this.parent.items.contents)) this.updateSource({ "system.heritageEnabled": false });
  }
}
export class EocActiveEffect extends ActiveEffect {
  get isSuppressed() {
    if (super.isSuppressed) return true;
    const item = this.parent;
    if (item?.documentName !== "Item" || !this.transfer) return false;
    if (item.type === "trait") return !item.system.active;
    if (item.type === "heritage" && item.parent?.documentName === "Actor") return selectedHeritage(item.parent.items.contents)?.id !== item.id;
    if (PHYSICAL_TYPES.includes(item.type)) return !item.system.equipped;
    return false;
  }
}

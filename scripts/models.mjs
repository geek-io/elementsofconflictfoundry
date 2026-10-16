import { ATTRIBUTES, SKILLS } from "./config.mjs?v=0.3.15";
import { professionAdvances } from "./rules.mjs?v=0.3.15";
import { migrateHeritageData } from "./heritage.mjs?v=0.3.15";
import { migrateTechniqueData, TECHNIQUE_OUTCOMES, TECHNIQUE_TYPES, TECHNIQUE_RANKS, TECHNIQUE_DURATIONS, TECHNIQUE_ACTIONS, TECHNIQUE_RANGES, TECHNIQUE_TEMPLATES } from "./techniques.mjs?v=0.3.15";
const { StringField, NumberField, SchemaField } = foundry.data.fields;
const text = () => new StringField({ required: true, blank: true, initial: "" });
const number = (initial = 0, min = 0, max) => new NumberField({ required: true, nullable: false, integer: true, initial, min, ...(max === undefined ? {} : { max }) });
export class EocActorModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      attributes: new SchemaField(Object.fromEntries(Object.keys(ATTRIBUTES).map(key => [key, number(0, 0, 100)]))),
      npcAbilities:new SchemaField(Object.fromEntries(Object.keys(ATTRIBUTES).map(key=>[key,text()]))),
      npcElite:new foundry.data.fields.BooleanField({initial:false}),
      npcSize:text(),npcThreatRating:text(),npcDefenses:new SchemaField({parry:new NumberField({initial:null,nullable:true,min:0,max:200}),dodge:new NumberField({initial:null,nullable:true,min:0,max:200})}),
      bonusAdjustments: new SchemaField(Object.fromEntries(Object.keys(ATTRIBUTES).map(key => [key, number(0, -20, 20)]))),
      skills: new SchemaField(Object.fromEntries(SKILLS.map(s => [s.key, number(0, 0, 3)]))),
      secondaryAdjustments: new SchemaField(Object.fromEntries(["initiative","movement","encumbrance","techniqueLimit","peril","damage"].map(key => [key, number(0, -100, 100)]))),
      secondary: new foundry.data.fields.ObjectField({ initial: {} }),
      heritageBonuses: new foundry.data.fields.ObjectField({ initial: {} }), heritageAttributes: new foundry.data.fields.ObjectField({ initial: {} }), heritageSkills: new foundry.data.fields.ObjectField({ initial: {} }), heritageUntrainedBonus: number(),
      dodgeSkill: new StringField({ initial: "coordination", choices: SKILLS.map(s=>s.key) }), parrySkill: new StringField({ initial: "bukijutsu", choices: SKILLS.map(s=>s.key) }),
      damageState: number(0, 0, 5), perilState: number(0, 0, 5), chakraBonus: number(0, -100),
      age: text(), gender: text(), village: text(), appearance: text(), background: text(),
      experience: number(), spentExperience: number(), currency: number(),
      actions: number(3, 0, 3), bleeding: new foundry.data.fields.BooleanField({ initial: false }),
      template:new StringField({initial:'',blank:true,choices:Object.keys(TECHNIQUE_TEMPLATES)}),
      ...Object.fromEntries(['areaLength','areaWidth','areaStartWidth'].map(key=>[key,new NumberField({initial:0,min:0,required:true,nullable:false})])),
      tags:text(),weaponStyle:new StringField({initial:'',blank:true,choices:['','Melee','Ranged']}),
      upstream: new foundry.data.fields.ObjectField({ initial: {} }),
      profession: text(), heritage: text(), chakraNature: text(), nindo: text(), notes: text(),
      tier: number(1, 1, 3), shonen: number(), chakraReservations:new foundry.data.fields.ObjectField({initial:{}}), chakra: new SchemaField({ value: number(), max: number() })
    };
  }
}
export class EocItemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new foundry.data.fields.HTMLField({ initial: "", required: true, blank: true }), source: text(), quantity: number(1),
      equipped: new foundry.data.fields.BooleanField({ initial: false }), carried: new foundry.data.fields.BooleanField({ initial: true }),
      encumbrance: new NumberField({ initial: 0, min: 0, required: true, nullable: false }), category: text(), price: text(), armorBonus: number(), damageFormula: text(), range: text(),
      skill: new StringField({ initial: "bukijutsu", choices: SKILLS.map(s => s.key) }),
      testChance:new NumberField({initial:null,nullable:true,min:0,max:200}),
      chakraCost: number(), actionCost: number(1, 0, 3), qualities: text(), requirements: text(),
      template:new StringField({initial:'',blank:true,choices:Object.keys(TECHNIQUE_TEMPLATES)}),
      ...Object.fromEntries(['areaLength','areaWidth','areaStartWidth'].map(key=>[key,new NumberField({initial:0,min:0,required:true,nullable:false})])),
      tags:text(),weaponStyle:new StringField({initial:'',blank:true,choices:['','Melee','Ranged']}),
      upstream: new foundry.data.fields.ObjectField({ initial: {} })
    };
  }
}
const advance = () => new SchemaField({ name: text(), uuid: text(), completed: new foundry.data.fields.BooleanField({ initial: false }) });
const slots = count => new SchemaField(Object.fromEntries(Array.from({ length: count }, (_, index) => [String(index), advance()])));
export class EocRecordModel extends EocItemModel {
  static defineSchema() {
    const schema = super.defineSchema();
    for (const key of ["quantity", "price", "encumbrance", "carried", "equipped"]) delete schema[key];
    return schema;
  }
}
export class EocTraitModel extends EocRecordModel {
  static migrateData(source,options={}) {
    source = super.migrateData(source,options);
    if (!options.partial && source.active === undefined && source.audience === "antagonist") source.active = false;
    return source;
  }
  static defineSchema() {
    return { ...super.defineSchema(), audience: new StringField({ initial: "player", choices: ["player", "antagonist"], required: true }),
      active: new foundry.data.fields.BooleanField({ initial: true }), spendMisfortune: new foundry.data.fields.BooleanField({ initial: false }), misfortuneCost: number(1), actionCost:number(0,0,3),actionType:new StringField({initial:'Special',choices:['Combat','Non-Combat','Special'],required:true}) };
  }
}
export class EocProfessionModel extends EocRecordModel {
  static migrateData(source,options={}) {
    source = super.migrateData(source,options);
    if (!options.partial && !source.advances) source.advances = professionAdvances(source.upstream);
    return source;
  }
  static defineSchema() {
    return { ...super.defineSchema(), equipment:new foundry.data.fields.ArrayField(new foundry.data.fields.ObjectField()), advances: new SchemaField({ talents: slots(3), skills: slots(10), bonuses: slots(7) }) };
  }
}
export class EocJutsuModel extends EocRecordModel {
  static migrateData(source,options={}) { return migrateTechniqueData(super.migrateData(source,options),options); }
  static defineSchema() {
    return { ...super.defineSchema(), ...Object.fromEntries(Object.keys(TECHNIQUE_OUTCOMES).map(key=>[key,text()])), jutsuType:new StringField({initial:"Ninjutsu",choices:TECHNIQUE_TYPES,required:true}), nature:text(), jutsuRank:new StringField({ initial:"E", choices:TECHNIQUE_RANKS,required:true }),
      jutsuRankText:text(),chakraCostMode:new StringField({initial:"current",choices:["current","pool"],required:true}),chakraCostText:text(), actionCostText:text(), duration:new StringField({initial:"Instantaneous",choices:TECHNIQUE_DURATIONS,required:true}), durationText:text(),
      actionType:new StringField({initial:"Special",choices:TECHNIQUE_ACTIONS,required:true}),actionTypeText:text(),range:new StringField({initial:"Self",choices:Object.keys(TECHNIQUE_RANGES),required:true}),rangeText:text(),template:new StringField({initial:"",blank:true,choices:Object.keys(TECHNIQUE_TEMPLATES)}),
      ...Object.fromEntries(['areaLength','areaWidth','areaStartWidth'].map(key=>[key,new NumberField({initial:0,min:0,required:true,nullable:false})])),
      cloneMode:new StringField({initial:'auto',choices:['auto','on','off']}),createClone:new foundry.data.fields.BooleanField({initial:false}),cloneEffect:text(),
      configured:new foundry.data.fields.BooleanField({ initial:true }), variableCost:new foundry.data.fields.BooleanField({ initial:false }), contentStatus:text() };
  }
}
export class EocHeritageModel extends EocRecordModel {
  static migrateData(source,options={}) {
    source=super.migrateData(source,options);
    if(options.partial && !Object.hasOwn(source,"bonusModifiers") && !Object.hasOwn(source,"tiers"))return source;
    const migrated=migrateHeritageData(source);
    for(const key of Object.keys(source))if(!Object.hasOwn(migrated,key))delete source[key];
    Object.assign(source,migrated);
    return source;
  }
  static defineSchema() {
    const entry=()=>new SchemaField({name:text(),tier:number(1,1,3),description:text()});
    return {...super.defineSchema(), modifiers:new foundry.data.fields.ArrayField(new SchemaField({attribute:new StringField({initial:"combat",choices:Object.keys(ATTRIBUTES),required:true}),value:number(0,-100,100)})),
      boons:new foundry.data.fields.ArrayField(entry()),banes:new foundry.data.fields.ArrayField(entry()),contentStatus:text(),heritageEnabled:new foundry.data.fields.BooleanField({initial:true})};
  }
}

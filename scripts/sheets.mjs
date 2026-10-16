import {isCloneTechnique,chooseCloneLocation,requestClone} from './clones.mjs?v=0.3.15';
import {placeTechniqueArea,techniqueArea} from './area.mjs?v=0.3.15';
import { ATTRIBUTES, SYSTEM_ID, SKILLS, ITEM_TYPES, DAMAGE_STATES, PERIL_STATES, PHYSICAL_TYPES, JUTSU_TYPES, ITEM_ICONS } from "./config.mjs?v=0.3.15";

import { bonuses, attributeValue, selectedHeritage, skillChance, testResult, professionProgress } from "./rules.mjs?v=0.3.15";

import { bindSkillHighlights } from "./sheet-ui.mjs?v=0.3.15";

import { EocLibrary } from "./library.mjs?v=0.3.15";

import { effectRows, createEffect, editEffect, toggleEffect, deleteEffect } from "./effects.mjs?v=0.3.15";

import { triggerTrait } from "./traits.mjs?v=0.3.15";

import { changeHeritageList, updateHeritageList } from "./heritage.mjs?v=0.3.15";

import { spendTechnique, releaseTechnique, TECHNIQUE_TYPES, TECHNIQUE_RANKS, TECHNIQUE_DURATIONS, TECHNIQUE_ACTIONS, TECHNIQUE_RANGES, TECHNIQUE_TEMPLATES } from "./techniques.mjs?v=0.3.15";

import { qualityTags } from "./qualities.mjs?v=0.3.15";

import { postRollCard, testCardContext, totalCardContext } from "./chat.mjs?v=0.3.15";

import {openPools} from './pool-window.mjs?v=0.3.15';

import {abilityTooltipHtml,techniqueRules} from './tooltips.mjs?v=0.3.15';
import {promptTest} from './roll-dialog.mjs?v=0.3.15';
import {creationTypes,weaponAttack,damageFormulaFor,usesCombatAP} from './action-flow.mjs?v=0.3.15';
import {cycleNpcAttribute,assignNpcAttribute,abilityTypes} from './npc.mjs?v=0.3.15';
import {TECHNIQUE_OUTCOMES,techniqueOutcome} from './techniques.mjs?v=0.3.15';
import {changeEquipment,grantProfessionEquipment} from './profession-equipment.mjs?v=0.3.15';
import {actorTestChance} from './npc-tests.mjs?v=0.3.15';
import {rollActorInitiative} from './initiative.mjs?v=0.3.15';

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const escape = value => foundry.utils.escapeHTML(String(value));



export class EocActorSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  static DEFAULT_OPTIONS = { classes: ["eoc", "eoc-actor"], tag: "form", position: { width: 980, height: 820 }, window: { resizable: true },

    form: { submitOnChange: true, closeOnSubmit: false }, actions: { pools:openPools, assignAttribute:EocActorSheet.assignAttribute, rollSkill: EocActorSheet.rollSkill, editItem: EocActorSheet.editItem, deleteItem: EocActorSheet.deleteItem,

      targetItem:EocActorSheet.targetItem, equipItem: EocActorSheet.equipItem, createItem: EocActorSheet.createItem, library: EocActorSheet.library, libraryJutsu: EocActorSheet.libraryJutsu, activateHeritage: EocActorSheet.activateHeritage, rollDamage: EocActorSheet.rollDamage, setState: EocActorSheet.setState, useTechnique: EocActorSheet.useTechnique, endTechnique:EocActorSheet.endTechnique, newRound: EocActorSheet.newRound, rollInitiative: EocActorSheet.rollInitiative, applyIdentity: EocActorSheet.applyIdentity, toggleTrait: EocActorSheet.toggleTrait, createEffect, editEffect, toggleEffect, deleteEffect } };

  static TABS = { sheet: { tabs: [{ id: "skills", label: "EOC.Tabs.skills", icon: "" }, { id: "jutsu", label: "EOC.Tabs.jutsu", icon: "ra ra-scroll-unfurled" }, { id: "inventory", label: "EOC.Tabs.inventory", icon: "ra ra-wooden-sign" }, { id: "identity", label: "EOC.Tabs.identity", icon: "ra ra-player" }, { id: "effects", label: "EOC.Tabs.effects", icon: "ra ra-aura" }, { id: "notes", label: "EOC.Tabs.notes", icon: "ra ra-book" }], initial: "skills" } };

  static PARTS = { main: { template: `systems/${SYSTEM_ID}/templates/actor.hbs`, scrollable: [".eoc-tab-content", ".eoc-tests-column", ".eoc-combat-column", ".eoc-attributes", ".tab.active"] } };

  async _prepareContext(options) {

    const b = bonuses(this.actor.system);

    const stats = this.actor.system.secondary;

    const groups = ITEM_TYPES.map(type => ({ type, label: game.i18n.localize(`TYPES.Item.${type}`), items: this.actor.items.filter(i => i.type === type).map(i => ({ id: i.id, name: i.name, img: i.img, system: i.system, tooltip:abilityTooltipHtml(i), hasArea:Boolean(techniqueArea(i)), qualities:qualityTags(i.system.qualities), physical: PHYSICAL_TYPES.includes(i.type), trait: i.type === "trait", profession: i.type === "profession", progress: i.type === "profession" ? professionProgress(i.system.advances) : null, weapon: i.type === "weapon", technique: JUTSU_TYPES.includes(i.type), identity: ["profession","ancestry"].includes(i.type) })) })).filter(g => g.items.length);

    const heritage=selectedHeritage(this.actor.items.contents);

    const decorate=item=>({id:item.id,name:item.name,img:item.img,system:item.system,tooltip:abilityTooltipHtml(item),hasArea:Boolean(techniqueArea(item)),reserved:this.actor.system.chakraReservations?.[item.id] ?? 0,draft:JUTSU_TYPES.includes(item.type) && item.system.configured===false,hasDamage:Boolean(item.system.damageFormula)});

    return { ...await super._prepareContext(options), rootId:this.id, npc:this.actor.type==='npc', weapons:groups.find(group=>group.type==='weapon')?.items??[], actor: this.actor, system: this.actor.system, stats, groups:groups.filter(group=>PHYSICAL_TYPES.includes(group.type)), identityGroups:groups.filter(group=>!PHYSICAL_TYPES.includes(group.type) && !JUTSU_TYPES.includes(group.type) && group.type!=="skill").map(group=>({...group,items:group.items.map(item=>({...item,heritage:item.type==="heritage" || group.type==="heritage",selectedHeritage:heritage?.id===item.id}))})),

      jutsuGroups:JUTSU_TYPES.map(type=>({type,label:game.i18n.localize(`TYPES.Item.${type}`),items:this.actor.items.filter(item=>item.type===type).map(decorate)})).filter(group=>group.items.length), skillRecords:this.actor.items.filter(item=>item.type==="skill").map(decorate),npcTraits:this.actor.type==='npc'?this.actor.items.filter(item=>item.type==='trait').map(decorate):[],

      dodge:{key:this.actor.system.dodgeSkill,...actorTestChance(this.actor,this.actor.system.dodgeSkill,0,0,{label:'Dodge'})},parry:{key:this.actor.system.parrySkill,...actorTestChance(this.actor,this.actor.system.parrySkill,0,0,{label:'Parry'})}, effects: effectRows(this.actor), misfortune: game.settings.get(SYSTEM_ID, "misfortune"),

      attributes: Object.entries(ATTRIBUTES).map(([key, label]) => ({ key, label, value: this.actor._source.system.attributes?.[key] ?? this.actor.system.attributes[key],effective:attributeValue(this.actor.system,key), adjustment: this.actor._source.system.bonusAdjustments?.[key] ?? 0, bonus: b[key], ability:this.actor.items.get(this.actor.system.npcAbilities?.[key])?.name, abilityId:this.actor.system.npcAbilities?.[key] })),

      skills: SKILLS.map(s => ({ ...s, attributeLabel: ATTRIBUTES[s.attribute], rank: this.actor.system.skills[s.key], ...skillChance(this.actor.system, s.key) })),

      damageStates: DAMAGE_STATES.map((label, value) => ({ label, value, selected: value === this.actor.system.damageState })),

      perilStates: PERIL_STATES.map((label, value) => ({ label, value, selected: value === this.actor.system.perilState })),

      thresholds: [0,6,12,18].map(offset => ({ damage: stats.damage + offset, peril: stats.peril + offset })),

      damageLabel: DAMAGE_STATES[this.actor.system.damageState], perilLabel: PERIL_STATES[this.actor.system.perilState], itemTypes: ITEM_TYPES };

  }

  async _onRender(context,options) { await super._onRender(context,options); bindSkillHighlights(this.element);

    if(this.actor.type==='npc' && this.actor.isOwner)for(const el of this.element.querySelectorAll('.eoc-attribute[data-attribute]'))el.addEventListener('contextmenu',async event=>{

      event.preventDefault();

      const key=el.dataset.attribute;

      await cycleNpcAttribute(this.actor,key,event.shiftKey);

    }); }

  static async assignAttribute(event,target){

    const key=target.dataset.attribute;

    if(this.actor.type!=='npc' || !this.actor.isOwner || !Object.hasOwn(ATTRIBUTES,key))return;

    const current=this.actor._source.system.attributes[key], presets=this.actor.system.npcElite?[50,55]:[40,45,50,35];

    const items=this.actor.items.filter(item=>abilityTypes.includes(item.type));

    const selected=this.actor.system.npcAbilities?.[key];

    const result=await DialogV2.prompt({window:{title:`${ATTRIBUTES[key]}  -  NPC Ability`},content:`<p>Assign an owned ability and set the attribute. Shift-right-click cycles presets backwards.</p><label>Attribute<input name="value" type="number" min="0" max="100" value="${current}"></label><label>Preset<select name="preset"><option value="">Keep entered value</option>${presets.map(value=>`<option value="${value}">${value}%</option>`).join('')}</select></label><label>Ability<select name="ability"><option value="">None</option>${items.map(item=>`<option value="${escape(item.id)}" ${item.id===selected?'selected':''}>${escape(item.name)}</option>`).join('')}</select></label>`,ok:{label:'Assign',callback:(event,button)=>({value:Number(button.form.elements.preset.value || button.form.elements.value.value),itemId:button.form.elements.ability.value})}});

    if(!result)return;

    try{await assignNpcAttribute(this.actor,key,result.value,result.itemId);}catch(error){ui.notifications.warn(error.message);}

  }

  static library() { new EocLibrary(this.actor).render(true); }

  static libraryJutsu() { new EocLibrary(this.actor,"techniques").render(true); }

  static async activateHeritage(event,target) {

    if (!this.actor.isOwner) return;

    const item=this.actor.items.get(target.dataset.id);

    if(item?.type!=="heritage")return;

    await this.actor.updateEmbeddedDocuments("Item",this.actor.items.filter(item=>item.type==="heritage").map(candidate=>({_id:candidate.id,"system.heritageEnabled":candidate.id===item.id})));

    await this.actor.update({"system.heritage":item.name});

  }

  static async applyIdentity(event, target) {

    if (!this.actor.isOwner) return;

    const item = this.actor.items.get(target.dataset.id);

    if (!item || !["profession", "ancestry", "heritage"].includes(item.type)) return;

    if (item.type === "heritage") return EocActorSheet.activateHeritage.call(this,event,target);

    await this.actor.update({ [`system.${item.type === "profession" ? "profession" : "heritage"}`]: item.name });

  }

  async _onDropItem(event, item) {

    const created = await super._onDropItem(event, item);
    if(created?.type==='profession')await grantProfessionEquipment(created);

    if (created && this.actor.isOwner && ["profession","heritage","ancestry"].includes(item.type) && (created.type!=="heritage" || created.system.heritageEnabled)) await this.actor.update({ [`system.${item.type === "profession" ? "profession" : "heritage"}`]: item.name });

    return created;

  }

  static async toggleTrait(event, target) {

    const item = this.actor.items.get(target.dataset.id);

    await toggleTraitItem(item);

  }

  static async createItem(event,target) {

    if (!this.actor.isOwner) return;

    const allowed=creationTypes(target?.dataset.section ?? target?.closest?.('[data-tab]')?.dataset.tab);
    const type = target?.dataset.type ?? await DialogV2.prompt({ window: { title: "Add an item" }, content: `<label>Item type<select name="type">${allowed.map(t => `<option value="${t}">${escape(game.i18n.localize(`TYPES.Item.${t}`))}</option>`).join("")}</select></label>`, ok: { label: "Create", callback: (event, button) => button.form.elements.type.value } });

    if (!type || !allowed.includes(type)) return;

    const [item] = await this.actor.createEmbeddedDocuments("Item", [{ name: `New ${game.i18n.localize(`TYPES.Item.${type}`)}`, type, img:ITEM_ICONS[type] }]); item.sheet.render(true);

  }

  static editItem(event, target) { this.actor.items.get(target.dataset.id)?.sheet.render(true); }

  static async deleteItem(event, target) {

    if (!this.actor.isOwner) return;

    const item = this.actor.items.get(target.dataset.id);

    if (item && await DialogV2.confirm({ window: { title: "Remove item" }, content: `<p>Remove ${escape(item.name)} from this character?</p>` })) await item.delete();

  }

  static async equipItem(event, target) {

    if (!this.actor.isOwner) return;

    const item = this.actor.items.get(target.dataset.id); if (item && PHYSICAL_TYPES.includes(item.type)) await item.update({ "system.equipped": !item.system.equipped });

  }

  static async setState(event, target) {

    if (!this.actor.isOwner || !["damageState","perilState"].includes(target.dataset.track)) return;

    await this.actor.update({ [`system.${target.dataset.track}`]: Number(target.dataset.value) });

  }

  static async newRound() { if (this.actor.isOwner) await this.actor.update({ "system.actions": 3 }); }

  static async rollInitiative() {
    try{return await rollActorInitiative(this.actor);}catch(error){ui.notifications.warn(error.message);}
  }

  static async rollSkill(event, target) {

    if (!this.actor.isOwner) return;

    const key = target.dataset.skill;

    const start = skillChance(this.actor.system, key);

    if (start.incapacitated) { ui.notifications.warn("This character cannot make Skill Tests while incapacitated or slain."); return; }

    const item=this.actor.items.get(target.dataset.id);
    const config = await promptTest(this.actor,key,{weapon:item?.type==='weapon'?item:null,item,label:target.dataset.testLabel});
    if(!config)return;
    try{
      if(item?.type==='weapon'&&techniqueArea(item)&&!await EocActorSheet.targetItem.call(this,event,target))return;
      const execute=(ap=0)=>EocActorSheet.performTest.call(this,key,config,item,target.dataset.testLabel,null,ap);
      return item?.type==='weapon'?await weaponAttack(this.actor,item,execute):await execute();
    }catch(error){ui.notifications.warn(error.message);}
  }
  static async performTest(key,config,item=null,label='',cost=null,attackAP=0){
    if(!Number.isFinite(config.modifier)||!Number.isFinite(config.difficulty))throw Error('Enter valid test modifiers.');
    const current=actorTestChance(this.actor,key,config.modifier,config.difficulty,{item,label});
    if(current.incapacitated)throw Error('This Actor cannot make tests while incapacitated or slain.');
    const mode=current.disadvantaged?(config.mode==='advantage'?'normal':'disadvantage'):config.mode;
    const roll=await new Roll('1d100').evaluate(),result=testResult(roll.total,current.chance,mode);
    const context=testCardContext({current,result,mode,modifier:config.modifier,difficulty:config.difficulty,item});
    if(['Dodge','Parry'].includes(label))context.title=`${label} Test`;
    if(item?.type==='weapon'&&attackAP)context.badges.push({label:`${attackAP} AP spent`,kind:'cost'});
    if(cost){context.badges.push({label:`${cost.chakra} Chakra · ${cost.actions} AP spent`,kind:'cost'});context.rules=techniqueRules(item);}
      if(JUTSU_TYPES.includes(item?.type))context.techniqueOutcome=techniqueOutcome(item,result);
    return postRollCard(roll,this.actor,context,{test:{skill:key,chance:current.chance,mode,...result,modifier:config.modifier,difficulty:config.difficulty,itemId:item?.id??'',title:context.title,snapshot:{rank:current.rank,effectiveRank:current.effectiveRank,base:current.base,chance:current.chance}}},{messageMode:config.messageMode});
  }

  static async targetItem(event,target){
    const item=this.actor.items.get(target.dataset.id);if(!this.actor.isOwner||!item)return false;
    await this.minimize();
    try{return await placeTechniqueArea(this.actor,item);}catch(error){ui.notifications.warn(error.message);return false;}finally{await this.maximize();}
  }
  static async rollDamage(event, target) {

    if (!this.actor.isOwner) return;

    const item = this.actor.items.get(target.dataset.id);

    if (!damageFormulaFor(item)) { ui.notifications.warn("Set a damage formula on the item first."); return; }

    try {

      const roll=await new Roll(damageFormulaFor(item), { bonuses: bonuses(this.actor.system), system: this.actor.system }).evaluate();

      await postRollCard(roll,this.actor,totalCardContext({roll,title:item.name,kind:"damage",item}));

    } catch (error) { console.error(error); ui.notifications.error("This damage formula could not be rolled. Open the item to correct it."); }

  }

  static async useTechnique(event,target){
    if(!this.actor.isOwner)return;
    const item=this.actor.items.get(target.dataset.id);
    if(!item || !JUTSU_TYPES.includes(item.type))return;
    if(item.system.configured===false){ui.notifications.warn("Configure this draft Technique's rules and costs before use.");return;}
    const passive=['Passive','Internalized'].includes(item.system.duration);
    const config=await promptTest(this.actor,item.system.skill??'ninjutsu',{technique:item,passive});
    if(!config)return;
    try{
      if(techniqueArea(item)){
        await this.minimize();
        let placed;try{placed=await placeTechniqueArea(this.actor,item);}finally{await this.maximize();}
        if(!placed)return;
      }
      let clonePosition;
      if(isCloneTechnique(item)){await this.minimize();try{clonePosition=await chooseCloneLocation(this.actor);}finally{await this.maximize();}if(!clonePosition)return;}
      const message=await spendTechnique(this.actor,item,{chakra:config.chakra,actions:config.actions},async cost=>{
        if(!passive)return EocActorSheet.performTest.call(this,item.system.skill??'ninjutsu',config,item,'',cost);
        const content=await foundry.applications.handlebars.renderTemplate(`systems/${SYSTEM_ID}/templates/technique-use.hbs`,{item,cost,rules:techniqueRules(item),reserved:item.system.chakraCostMode==='pool'});
        return ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.actor}),content,flags:{[SYSTEM_ID]:{cloneItemId:item.id,card:{kind:'technique-use'}}}},{messageMode:config.messageMode});
      });
      if(clonePosition&&message&&(!message.flags?.[SYSTEM_ID]?.test||message.flags[SYSTEM_ID].test.success)){try{await requestClone(message.id,clonePosition);}catch(error){ui.notifications.warn(error.message);}}
      return message;
    }catch(error){ui.notifications.warn(error.message);}
  }

  static async endTechnique(event,target) {

    const item=this.actor.items.get(target.dataset.id);

    if(!item)return;

    try{if(await releaseTechnique(this.actor,item))ui.notifications.info(`Ended ${item.name}; maximum Chakra restored.`);}catch(error){ui.notifications.warn(error.message);}

  }

}



// Compact combat layout adapted from Zweihander Creature/NPC sheets (MIT).

export class EocNpcSheet extends EocActorSheet {

  static DEFAULT_OPTIONS={classes:['eoc','eoc-actor','eoc-npc'],position:{width:900,height:820}};

}



export class EocItemSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {

  static DEFAULT_OPTIONS = { classes: ["eoc", "eoc-item"], tag: "form", position: { width: 720, height: 720 }, window: { resizable: true }, form: { submitOnChange: true, closeOnSubmit: false }, actions: { createEffect, editEffect, toggleEffect, deleteEffect, toggleTrait: EocItemSheet.toggleTrait,addHeritageRow:EocItemSheet.addHeritageRow,removeHeritageRow:EocItemSheet.removeHeritageRow,addEquipment:EocItemSheet.addEquipment,removeEquipment:EocItemSheet.removeEquipment } };

  static PARTS = { main: { template: `systems/${SYSTEM_ID}/templates/item.hbs`, scrollable: ["", ".eoc-source-data"] } };

  async _prepareContext(options) {

    return { ...await super._prepareContext(options), rootId: this.id, item: this.item, system: this.item.system, qualityTags:qualityTags(this.item.system.qualities), weapon: this.item.type === "weapon", armor: this.item.type === "armor", physical: PHYSICAL_TYPES.includes(this.item.type), trait: this.item.type === "trait", antagonist: this.item.system.audience === "antagonist", profession: this.item.type === "profession", heritage:this.item.type==="heritage",skillRecord:this.item.type==="skill",jutsu:this.item.type==="jutsu",

      heritageModifierOptions:Object.fromEntries(Object.entries(ATTRIBUTES).map(([key,label])=>[key,`${label} Bonus`])),heritageTierOptions:{1:"Genin",2:"Chunin",3:"Jonin"},

      heritageModifiers:Array.from(this.item.system.modifiers ?? [],(row,index)=>({...row,index})),heritageBenefits:[{list:"boons",label:"Boons",singular:"Boon"},{list:"banes",label:"Banes",singular:"Bane"}].map(group=>({...group,rows:Array.from(this.item.system[group.list] ?? [],(row,index)=>({...row,index,unlocked:!this.item.parent || (this.item.parent.system.tier ?? 1)>=row.tier}))})),

      progress: professionProgress(this.item.system.advances), effects: effectRows(this.item), misfortune: game.settings.get(SYSTEM_ID, "misfortune"),

      traitAudiences: { player: "Player Trait", antagonist: "Antagonist Trait" }, jutsuRanks:Object.fromEntries(TECHNIQUE_RANKS.map(rank=>[rank,rank])),techniqueTypes:Object.fromEntries(TECHNIQUE_TYPES.map(type=>[type,type])),techniqueDurations:Object.fromEntries(TECHNIQUE_DURATIONS.map(type=>[type,type])),techniqueActions:Object.fromEntries(TECHNIQUE_ACTIONS.map(type=>[type,type])),chakraCostModes:{current:"Spend current Chakra",pool:"Reserve maximum Chakra (Internalized)"},techniqueRanges:TECHNIQUE_RANGES,cloneModes:{auto:'Automatic by name',on:'Create clone',off:'Disabled'},techniqueTemplates:TECHNIQUE_TEMPLATES,weaponStyles:{'':'Automatic',Melee:'Melee',Ranged:'Ranged'}, attributes: Object.values(ATTRIBUTES), advanceGroups: [{key:"talents",label:"3 Talents",placeholder:"Talent name — or drop a Talent here"},{key:"skills",label:"10 Skill Advances",placeholder:"Skill name"},{key:"bonuses",label:"7 Bonus Advances",placeholder:"Attribute bonus"}].map(group => ({ ...group, slots: Object.entries(this.item.system.advances?.[group.key] ?? {}).map(([index, slot]) => ({index,...slot})) })),

      technique: JUTSU_TYPES.includes(this.item.type), skills: SKILLS, enriched: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.item.system.description, { async: true, secrets: this.item.isOwner, relativeTo: this.item }),
      traitActionTypes:{Combat:'Combat','Non-Combat':'Non-Combat',Special:'Special'},
      techniqueOutcomes:Object.entries(TECHNIQUE_OUTCOMES).map(([key,label])=>({key,label,value:this.item.system[key]??''})),equipmentTypes:Object.fromEntries(PHYSICAL_TYPES.map(type=>[type,game.i18n.localize(`TYPES.Item.${type}`)])),professionEquipment:(this.item.system.equipment??[]).map((row,index)=>({...row,index})),

      upstream: JSON.stringify(this.item.system.upstream, null, 2) };

  }

  static async toggleTrait() { await toggleTraitItem(this.item); }
  static async addEquipment(){await changeEquipment(this.item,{add:{name:'New equipment',type:'gear',system:{quantity:1,encumbrance:0}}});}
  static async removeEquipment(event,target){await changeEquipment(this.item,{remove:Number(target.dataset.index)});}

  static async addHeritageRow(event,target) { await changeHeritageList(this.item,target.dataset.list); }

  static async removeHeritageRow(event,target) { await changeHeritageList(this.item,target.dataset.list,Number(target.dataset.index)); }

  async _onRender(context, options) {

    await super._onRender(context, options);

    if(this.item.type==="heritage" && this.item.isOwner) {

      for(const control of this.element.querySelectorAll("[data-heritage-field]"))control.addEventListener("change",async event=>{

        event.stopPropagation();

        if(!control.checkValidity()){control.reportValidity();return;}

        const field=control.dataset.heritageField;

        const value=["value","tier"].includes(field)?Number(control.value):control.value;

        await updateHeritageList(this.item,control.dataset.list,Number(control.dataset.index),field,value);

      });

    }

    if (this.item.type !== "profession" || !this.item.isOwner) return;
    for(const control of this.element.querySelectorAll('[data-equipment-field]'))control.addEventListener('change',async event=>{
      event.stopPropagation();if(!control.checkValidity()){control.reportValidity();return;}
      const field=control.dataset.equipmentField,value=['quantity','encumbrance','armorBonus'].includes(field)?Number(control.value):control.value;
      try{await changeEquipment(this.item,{index:Number(control.dataset.index),field,value});}catch(error){ui.notifications.warn(error.message);}
    });
    const equipment=this.element.querySelector('[data-profession-equipment]');
    if(equipment){equipment.addEventListener('dragover',event=>event.preventDefault());equipment.addEventListener('drop',async event=>{
      event.preventDefault();event.stopPropagation();
      try{const data=foundry.applications.ux.TextEditor.implementation.getDragEventData(event);const item=await Item.implementation.fromDropData(data);await changeEquipment(this.item,{add:item});}catch(error){ui.notifications.warn(error.message);}
    });}

    for (const slot of this.element.querySelectorAll("[data-advance-group]")) {

      slot.addEventListener("dragover", event => event.preventDefault());

      slot.addEventListener("drop", async event => {

        event.preventDefault(); event.stopPropagation();

        try {

          const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

          const item = await Item.implementation.fromDropData(data);

          if (slot.dataset.advanceGroup === "talents" && item?.type === "talent") await this.item.update({ [`system.advances.talents.${slot.dataset.index}.name`]: item.name, [`system.advances.talents.${slot.dataset.index}.uuid`]: item.uuid });

        } catch (error) { console.error(error); ui.notifications.warn("Drop a Talent into a Talent advance slot."); }

      });

    }

  }

}

async function toggleTraitItem(item) {

  if (!item?.isOwner || item.type !== "trait") return;

  if (item.system.audience === "antagonist" && !game.user.isGM) return;

  if (item.system.active) { await item.update({ "system.active": false }); return; }

  const cost = item.system.audience === "antagonist" && item.system.spendMisfortune ? item.system.misfortuneCost : 0;
  const ap=item.system.audience==='antagonist'&&item.parent?.documentName==='Actor'&&usesCombatAP(item.parent)?item.system.actionCost??0:0;

  if (!await DialogV2.confirm({ window: { title: item.name }, content: `<p>Activate ${escape(item.name)}${cost||ap?` for ${[ap?`${ap} AP`:'',cost?`${cost} Misfortune Point(s)`:''].filter(Boolean).join(' and ')}`:''}?</p>` })) return;

  try { await triggerTrait(item); } catch (error) { ui.notifications.warn(error.message); }

}


import {matchesLibrary,libraryFacets} from './library-filters.mjs?v=0.3.15';
import { SYSTEM_ID, PHYSICAL_TYPES, JUTSU_TYPES } from "./config.mjs?v=0.3.15";
import {abilityTooltipHtml} from './tooltips.mjs?v=0.3.15';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class EocLibrary extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = { classes: ["eoc", "eoc-library"], window: { title: "EoC Compendium Browser", resizable: true }, position: { width: 820, height: 720 }, actions: { add: EocLibrary.add, view: EocLibrary.view } };
  static PARTS = { main: { template: `systems/${SYSTEM_ID}/templates/library.hbs`, scrollable:["",".eoc-library-results"] } };
  constructor(actor=null,category="") { super(); this.actor = actor; this.query = ""; this.category = category; this.records = []; this.filters={}; }
  async _prepareContext(options) {
    if (!this.loaded) {
      for (const pack of game.packs.filter(p => p.metadata.packageName === SYSTEM_ID && p.documentName === "Item")) {
        if (!pack.visible) continue;
        try {
          const index = await pack.getIndex({fields:["system.tags","system.weaponStyle","system.qualities","system.nature","system.jutsuRank","system.jutsuType","system.category","system.contentStatus",'system.description','system.source','system.chakraCost','system.chakraCostText','system.actionCost','system.actionCostText','system.duration','system.durationText','system.range','system.rangeText']});
          this.records.push(...index.map(entry => ({ ...entry, tooltip:abilityTooltipHtml(entry), pack: pack.collection, source: pack.metadata.label, uuid: `Compendium.${pack.collection}.Item.${entry._id}` })));
        } catch (error) { console.error(`${SYSTEM_ID} | Library index failed`, pack.collection, error); }
      }
      this.loaded = true;
      this.records.sort((a, b) => a.name.localeCompare(b.name));
    }
    const scoped=this.records.filter(r=>!this.category||(this.category==='techniques'?JUTSU_TYPES.includes(r.type):r.type===this.category));
    const facets=libraryFacets(scoped).filter(f=>f.choices.length);
    for(const key of Object.keys(this.filters))if(!facets.some(f=>f.key===key&&f.choices.some(c=>c.value===this.filters[key])))delete this.filters[key];
    const matches=scoped.filter(r=>matchesLibrary(r,this.filters,this.query));
    return { ...await super._prepareContext(options), facets:facets.map(f=>({...f,selected:this.filters[f.key]??''})), query: this.query, category: this.category, categories: {techniques:"All Techniques",...Object.fromEntries([...new Set(this.records.map(r => r.type))].sort().map(type=>[type,game.i18n.localize(`TYPES.Item.${type}`)]))}, records: matches.slice(0, 100), total: matches.length, actorName: this.actor?.name, editable: this.actor?.isOwner ?? false };
  }
  _onRender(context, options) {
    super._onRender(context, options);
    const search = this.element.querySelector("[name=search]");
    search.addEventListener("input", event => {
      this.query = event.target.value;
      clearTimeout(this.timer);
      this.timer = setTimeout(async () => { await this.render(); const input = this.element?.querySelector("[name=search]"); input?.focus(); input?.setSelectionRange(this.query.length, this.query.length); }, 250);
    });
    this.element.querySelector("[name=category]").addEventListener("change", event => { this.category = event.target.value; this.filters={}; this.render(); });
    for(const input of this.element.querySelectorAll("[data-facet]"))input.addEventListener("change",event=>{this.filters[input.dataset.facet]=event.target.value;this.render();});
    for (const row of this.element.querySelectorAll("[data-drag-uuid]")) {
      row.draggable = true;
      row.addEventListener("dragstart", event => event.dataTransfer.setData("text/plain", JSON.stringify({ type: "Item", uuid: row.dataset.dragUuid })));
    }
  }
  static async view(event, target) { const doc = await fromUuid(target.dataset.uuid); doc?.sheet.render(true); }
  static async add(event, target) {
    if (!this.actor?.isOwner) return;
    const doc = await fromUuid(target.dataset.uuid);
    if (!doc) return;
    const data = doc.toObject(); delete data._id; if (PHYSICAL_TYPES.includes(data.type)) data.system.equipped = false;
    const [created]=await this.actor.createEmbeddedDocuments("Item", [data]);
    if (["profession","heritage","ancestry"].includes(data.type) && (data.type!=="heritage" || created.system.heritageEnabled)) await this.actor.update({ [`system.${data.type === "profession" ? "profession" : "heritage"}`]: data.name });
    ui.notifications.info(`Added ${doc.name} to ${this.actor.name}.`);
  }
}
export function addCompendiumBrowser(app,html) {
  const root=html instanceof HTMLElement ? html : app.element;
  if (!root || root.querySelector(".eoc-open-browser")) return;
  const header=root.querySelector(".directory-header") ?? root.querySelector("header") ?? root;
  const button=document.createElement("button");
  button.type="button";button.className="eoc-open-browser";button.textContent="EoC Compendium Browser";
  button.addEventListener("click",()=>new EocLibrary().render(true));
  header.prepend(button);
}

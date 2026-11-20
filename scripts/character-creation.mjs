import { SYSTEM_ID, ATTRIBUTES } from './config.mjs?v=0.3.19';
import {
  CREATION_TABLES,
  tableResult,
  techniqueLearningCost,
  isDraftTechnique,
} from './creation-tables.mjs?v=0.3.19';
import {
  creationCatalogue,
  initializeCharacter,
  buyAdvance,
  advanceOptions,
  xpBalances,
  awardCreationXP,
} from './creation-service.mjs?v=0.3.19';
import { abilityTooltipHtml } from './tooltips.mjs?v=0.3.19';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const open = new Map();
export class EocCharacterCreation extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ['eoc', 'eoc-creation'],
    window: { title: 'Character Creation & Advancement', resizable: true },
    position: { width: 980, height: 850 },
    actions: {
      refresh: EocCharacterCreation.refresh,
      step: EocCharacterCreation.step,
      rollTable: EocCharacterCreation.rollTable,
      rollAttributes: EocCharacterCreation.rollAttributes,
      initialize: EocCharacterCreation.initialize,
      buy: EocCharacterCreation.buy,
      learn: EocCharacterCreation.learn,
      view: EocCharacterCreation.view,
      finish: EocCharacterCreation.finish,
      award: EocCharacterCreation.award,
      heritage: EocCharacterCreation.heritage,
    },
  };
  static PARTS = {
    main: {
      template: `systems/${SYSTEM_ID}/templates/character-creation.hbs`,
      scrollable: ['', '.eoc-creation-body'],
    },
  };
  constructor(actor) {
    super();
    this.actor = actor;
    this.profile = JSON.parse(
      JSON.stringify(actor.system.creationState?.draft ?? { name: actor.name, assignments: {} }),
    );
    this.stepId =
      actor.system.creationState?.initialized || actor.items.some((i) => i.type === 'profession')
        ? 'advances'
        : 'profile';
    this.query = '';
    this.affordableOnly = true;
    this.error = '';
    this.busy = false;
  }
  async _prepareContext(options) {
    this.catalogue ??= await creationCatalogue();
    for (const entry of this.catalogue) {
      entry.system = JSON.parse(JSON.stringify(entry.document.system));
      entry.name = entry.document.name;
    }
    const initialized = Boolean(
      this.actor.system.creationState?.initialized ||
      this.actor.items.some((i) => i.type === 'profession') ||
      this.actor.system.experience ||
      this.actor.system.spentExperience,
    );
    const balance = xpBalances(this.actor),
      known = new Set(
        this.actor.items.filter((i) => i.type === 'technique').map((i) => i.name.toLowerCase()),
      );
    const techniqueCount = this.actor.items.filter((i) => i.type === 'technique').length,
      limit = this.actor.system.secondary.techniqueLimit;
    const techniques = this.catalogue
      .filter((e) => e.type === 'technique' && !isDraftTechnique(e) && !known.has(e.name.toLowerCase()))
      .map((e) => {
        const price = techniqueLearningCost(e, this.actor.system.chakraNature);
        return {
          ...e,
          tooltip: abilityTooltipHtml(e),
          priced: Boolean(price),
          cost: price?.cost,
          base: price?.base,
          discounted: price?.discounted,
          canBuy: Boolean(price && price.cost <= balance.total && techniqueCount < limit),
        };
      })
      .filter(
        (e) =>
          `${e.name} ${e.system.jutsuType} ${e.system.nature} ${e.system.jutsuRank}`
            .toLowerCase()
            .includes(this.query.toLowerCase()) &&
          (!this.affordableOnly || e.canBuy),
      );
    return {
      ...(await super._prepareContext(options)),
      actor: this.actor,
      profile: this.profile,
      initialized,
      busy: this.busy,
      error: this.error,
      balance,
      gm: game.user.isGM,
      completed: this.actor.system.creationState?.completed,
      steps: [
        ['profile', '1. Tables & Identity'],
        ['advances', '2. Profession Advances'],
        ['techniques', '3. Techniques'],
        ['ledger', '4. XP Ledger'],
      ].map(([id, label]) => ({ id, label, active: this.stepId === id })),
      profileStep: this.stepId === 'profile',
      advancesStep: this.stepId === 'advances',
      techniquesStep: this.stepId === 'techniques',
      ledgerStep: this.stepId === 'ledger',
      tables: Object.entries(CREATION_TABLES).map(([id, table]) => ({
        id,
        label: table.label,
        page: table.page,
        value: this.profile[id] ?? '',
        choices:
          id === 'profession'
            ? this.catalogue
                .filter((e) => e.type === 'profession')
                .map((e) => ({ value: e.uuid, label: e.name }))
            : table.rows.map((row) => ({ value: row.value, label: `${row.min}–${row.max}: ${row.value}` })),
      })),
      heritages: this.catalogue
        .filter((e) => e.type === 'heritage')
        .map((e) => ({ value: e.uuid, label: e.name })),
      attributes: Object.entries(ATTRIBUTES).map(([key, label], index) => ({
        key,
        label,
        assignment: this.profile.assignments?.[key] ?? index,
        choices: (this.profile.values ?? []).map((value, i) => ({
          value: i,
          label: `Roll ${i + 1}: ${value}`,
        })),
      })),
      rolled: Boolean(this.profile.values?.length === 7),
      values: (this.profile.values ?? []).join(', '),
      advances: advanceOptions(this.actor).map((a) => ({
        ...a,
        canBuy: initialized && !a.completed && balance.general >= 100,
      })),
      techniques,
      query: this.query,
      affordableOnly: this.affordableOnly,
      techniqueCount,
      limit,
      ledger: [...(this.actor.system.creationState?.ledger ?? [])].reverse(),
      history: [...(this.profile.rollHistory ?? [])].reverse(),
      hasHeritage: this.actor.items.some((i) => i.type === 'heritage'),
    };
  }
  async _onRender(context, options) {
    await super._onRender(context, options);
    for (const el of this.element.querySelectorAll('[data-profile]'))
      el.addEventListener('input', () => {
        const key = el.dataset.profile;
        this.profile[key] = el.value;
        this.queueDraft();
      });
    for (const el of this.element.querySelectorAll('[data-assignment]'))
      el.addEventListener('change', () => {
        this.profile.assignments ??= {};
        this.profile.assignments[el.dataset.assignment] = Number(el.value);
        this.queueDraft();
      });
    this.element.querySelector('[data-technique-search]')?.addEventListener('input', (e) => {
      this.query = e.target.value;
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(async () => {
        await this.render();
        const input = this.element.querySelector('[data-technique-search]');
        input?.focus();
        input?.setSelectionRange(this.query.length, this.query.length);
      }, 250);
    });
    this.element.querySelector('[data-affordable-only]')?.addEventListener('change', (e) => {
      this.affordableOnly = e.target.checked;
      this.render();
    });
  }
  queueDraft() {
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () =>
        this.saveDraft().catch((e) => {
          this.error = e.message;
          this.render();
        }),
      400,
    );
  }
  async saveDraft() {
    if (!this.actor.isOwner || this.actor.system.creationState?.initialized) return;
    this.savingDraft = true;
    try {
      await this.actor.update({ 'system.creationState.draft': JSON.parse(JSON.stringify(this.profile)) });
    } finally {
      this.savingDraft = false;
    }
  }
  async run(task) {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    clearTimeout(this.timer);
    await this.render();
    try {
      await task();
    } catch (error) {
      console.error(error);
      this.error = error.message;
    } finally {
      this.busy = false;
      await this.render();
    }
  }
  static async step(event, target) {
    if (this.busy) return;
    clearTimeout(this.timer);
    await this.saveDraft();
    this.stepId = target.dataset.step;
    this.render();
  }
  static async rollTable(event, target) {
    await this.run(async () => {
      const key = target.dataset.table,
        table = CREATION_TABLES[key];
      if (!table) throw Error('Unknown creation table.');
      const roll = await new Roll('1d100').evaluate(),
        value = tableResult(key, roll.total);
      this.profile[key] =
        key === 'profession'
          ? (this.catalogue.find((e) => e.type === 'profession' && e.name === value)?.uuid ?? '')
          : value;
      this.profile.rollHistory ??= [];
      this.profile.rollHistory.push({
        label: table.label,
        total: roll.total,
        result: value,
        page: table.page,
      });
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `${table.label}: ${value} (EoC PDF p.${table.page})`,
      });
      await this.saveDraft();
    });
  }
  static async rollAttributes() {
    await this.run(async () => {
      this.profile.values = [];
      for (let i = 0; i < 7; i++) {
        const roll = await new Roll('2d10+35').evaluate();
        this.profile.values.push(roll.total);
      }
      this.profile.assignments = Object.fromEntries(
        Object.keys(ATTRIBUTES).map((key, index) => [key, index]),
      );
      this.profile.rollHistory ??= [];
      this.profile.rollHistory.push({
        label: 'Primary Attributes (2d10+35 each)',
        result: this.profile.values.join(', '),
        page: 19,
      });
      await this.saveDraft();
    });
  }
  static async initialize() {
    await this.run(async () => {
      await initializeCharacter(this.actor, this.profile, this.catalogue);
      this.stepId = 'advances';
    });
  }
  static async buy(event, target) {
    await this.run(() =>
      buyAdvance(
        this.actor,
        { professionId: target.dataset.profession, group: target.dataset.group, index: target.dataset.index },
        this.catalogue,
      ),
    );
  }
  static async learn(event, target) {
    await this.run(() => buyAdvance(this.actor, { techniqueUuid: target.dataset.uuid }, this.catalogue));
  }
  static async view(event, target) {
    this.catalogue.find((e) => e.uuid === target.dataset.uuid)?.document.sheet.render(true);
  }
  static async heritage() {
    this.actor.items.find((i) => i.type === 'heritage')?.sheet.render(true);
  }
  static async finish() {
    await this.run(async () => {
      await this.actor.update({ 'system.creationState.completed': true });
    });
  }
  static async award() {
    const value = Number(this.element.querySelector('[data-xp-award]')?.value);
    await this.run(() => awardCreationXP(this.actor, value));
  }
  static async refresh() {
    await this.run(async () => {
      this.catalogue = await creationCatalogue();
    });
  }
  async _onClose(options) {
    clearTimeout(this.timer);
    clearTimeout(this.searchTimer);
    await this.saveDraft();
    open.delete(this.actor.uuid);
    return super._onClose?.(options);
  }
}
export function openCharacterCreation(actor) {
  if (!actor?.isOwner || actor.type !== 'character') return;
  let app = open.get(actor.uuid);
  if (!app) {
    app = new EocCharacterCreation(actor);
    open.set(actor.uuid, app);
  }
  return app.render(true);
}
export function addCharacterCreator(app, html) {
  if (!game.user.isGM && !game.user.can('ACTOR_CREATE')) return;
  const root = html instanceof HTMLElement ? html : app.element;
  if (!root || root.querySelector('.eoc-create-character')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'eoc-create-character';
  button.textContent = 'Create Character';
  button.addEventListener('click', async () => {
    try {
      const actor = await Actor.implementation.create({ name: 'New Shinobi', type: 'character' });
      openCharacterCreation(actor);
    } catch (e) {
      ui.notifications.warn(e.message);
    }
  });
  (root.querySelector('.directory-header') ?? root.querySelector('header') ?? root).append(button);
}

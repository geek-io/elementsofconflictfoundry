export function effectRows(document) {
  const effects = document.documentName === "Actor" ? [...document.allApplicableEffects()] : document.effects.contents;
  return effects.map(effect => ({ uuid: effect.uuid, name: effect.name, img: effect.img,
    source: effect.parent?.documentName === "Item" ? effect.parent.name : "Actor",
    status: effect.disabled ? "Disabled" : effect.isSuppressed ? "Suppressed" : "Active",
    changes: (effect.system?.changes ?? effect.changes ?? []).map(change => `${change.key}: ${change.value}`).join(" · ") }));
}
async function ownEffect(sheet, uuid) {
  const effect = await fromUuid(uuid);
  if (effect?.documentName !== "ActiveEffect" || !effect.isOwner) return null;
  if (effect.parent !== sheet.document && effect.parent?.parent !== sheet.document) return null;
  return effect;
}
export async function createEffect() {
  if (!this.document.isOwner) return;
  const [effect] = await this.document.createEmbeddedDocuments("ActiveEffect", [{ name: "New Effect", img: "icons/svg/aura.svg", transfer: this.document.documentName === "Item", disabled: false }]);
  effect.sheet.render(true);
}
export async function editEffect(event, target) { const effect = await ownEffect(this, target.dataset.uuid); effect?.sheet.render(true); }
export async function toggleEffect(event, target) { const effect = await ownEffect(this, target.dataset.uuid); if (effect) await effect.update({ disabled: !effect.disabled }); }
export async function deleteEffect(event, target) {
  const effect = await ownEffect(this, target.dataset.uuid);
  if (effect && await foundry.applications.api.DialogV2.confirm({ window: { title: "Remove Effect" }, content: `<p>Remove ${foundry.utils.escapeHTML(effect.name)}?</p>` })) await effect.delete();
}

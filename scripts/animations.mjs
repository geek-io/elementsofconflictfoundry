import { SYSTEM_ID } from './config.mjs?v=0.3.19';

/** Use AA's public API after gameplay costs and chat have committed. */
export async function animateItemUse(actor, item, message, { targets } = {}) {
  if (!message || !['weapon', 'technique'].includes(item?.type)) return false;
  if (!globalThis.game?.modules.get('autoanimations')?.active || !globalThis.canvas?.ready) return false;
  const api = globalThis.AutomatedAnimations;
  if (typeof api?.playAnimation !== 'function') return false;
  const tokens = actor.getActiveTokens();
  const source = actor.token?.object || tokens.find((t) => t.controlled) || tokens[0];
  if (!source) return false;
  const selected = Array.from(targets ?? game.user.targets ?? []);
  const result = message.flags?.[SYSTEM_ID]?.test;
  try {
    await api.playAnimation(source, item, {
      targets: selected,
      hitTargets: result?.success === false ? [] : selected,
      playOnMiss: true,
      eocUse: true,
    });
    return true;
  } catch (error) {
    console.warn('EoC: Automated Animations playback failed.', error);
    return false;
  }
}

export function registerAnimationIntegration() {
  // AA's generic chat scanner must not replay EoC uses, damage cards or rerolls.
  Hooks.on('AutomatedAnimations-WorkflowStart', (data, animation) => {
    if (
      data.eocUse &&
      !data.templateData &&
      (animation?.menu === 'templatefx' ||
        (animation?.menu === 'preset' && ['proToTemp', 'thunderwave'].includes(animation.presetType)))
    )
      data.stopWorkflow = true;
    if (data.workflow?.flags?.[SYSTEM_ID]) data.stopWorkflow = true;
  });
}

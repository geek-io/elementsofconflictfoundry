# Automated Animations

Enable a Foundry v14-compatible version of [Automated Animations](https://github.com/theripper93/autoanimations), its required dependencies (including Sequencer), and your chosen JB2A asset module. Assets are supplied by those modules.

Open a weapon or Technique sheet and choose **Automated Animations** from the sheet header controls menu. AA supplies this configuration control. Configure the item's animation there, or match the item name in AA's automatic recognition menu. Item-specific AA flags remain attached when the item is copied to an actor.

Place the actor's token on the active scene, select targets, and use its weapon or Technique normally. Playback runs once after costs and the chat card have been saved. Failed tests pass an empty hit-target list; ranged animations can show misses. Damage rolls and Fortune/Misfortune rerolls do not replay the animation. No animation is played when an activation is cancelled or cannot be paid for. A missing module, token, or animation does not prevent normal play.

The existing clone-token creation and optional clone appearance effect continue to work independently. Avoid configuring the same appearance effect in both places if you only want it once.

This integration supports source and target animations. AA template presets require an AA-compatible Region; EoC's temporary area selector currently supplies targets only. Template presets are skipped to avoid animating an unrelated Region on the scene.

Implementation reference: AA's public `AutomatedAnimations.playAnimation(sourceToken, item, options)` API in [external.js](https://github.com/theripper93/autoanimations/blob/main/src/system-support/external.js), with its [workflow hook](https://github.com/theripper93/autoanimations/blob/main/src/system-handlers/workflow-data.js) preventing generic chat-scanner duplicates.

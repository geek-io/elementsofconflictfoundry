import {poolTransaction,poolValues,poolChange,savePools} from './pools.mjs?v=0.3.15';
import {actorAction,usesCombatAP} from './action-flow.mjs?v=0.3.15';
export function triggerTrait(item) {
  const task = async () => {
    if (!item.isOwner || item.type !== "trait") return false;
    if (item.system.active) return false;
    const paid = item.system.audience === "antagonist" && item.system.spendMisfortune;
    if (item.system.audience === "antagonist" && !game.user.isGM) throw Error("Only the GM can trigger Antagonist Traits.");
    if (paid && game.users.activeGM?.id !== game.user.id) throw Error("The active GM must spend shared Misfortune Points.");
    const cost = paid ? item.system.misfortuneCost : 0;
    const actor=item.parent?.documentName==='Actor'?item.parent:null;
    const ap=item.system.audience==='antagonist'&&actor&&usesCombatAP(actor)?item.system.actionCost??0:0;
    if(actor&&!actor.isOwner)throw Error('You must own this Actor to spend its AP.');
    if(actor&&actor.system.actions<ap)throw Error(`Not enough AP: ${ap} required, ${actor.system.actions} remaining.`);
    const beforeAP=actor?.system.actions;
    const before = poolValues();
    if (before.misfortune < cost) throw Error("Not enough Misfortune Points.");
    if (cost) await savePools(poolChange(before,'misfortune',cost));
    let spentAP=false;
    try {if(ap){await actor.update({'system.actions':beforeAP-ap});spentAP=true;}await item.update({ "system.active": true }); }
    catch (error) { if(spentAP)await actor.update({'system.actions':beforeAP});if (cost) await savePools(before); throw error; }
    return true;
  };
  return poolTransaction(()=>item.parent?.documentName==='Actor'?actorAction(item.parent,task):task());
}

import {postRollCard,totalCardContext} from './chat.mjs?v=0.3.15';
export const INITIATIVE_FORMULA='1d10 + @secondary.initiative';
export function configureInitiative(){CONFIG.Combat.initiative.formula=INITIATIVE_FORMULA;CONFIG.Combat.initiative.decimals=0;}
export async function rollActorInitiative(actor){
 if(!actor.isOwner)return;
 if(game.combat){const existing=game.combat.getCombatantsByActor(actor);return actor.rollInitiative({createCombatants:!existing.length,rerollInitiative:true});}
 const roll=await new Roll(INITIATIVE_FORMULA,actor.getRollData()).evaluate();
 return postRollCard(roll,actor,totalCardContext({roll,title:'Initiative',kind:'initiative'}));
}

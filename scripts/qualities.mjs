// EoC Shinobi Playtest v1.0, PDF pp.38–40. These are EoC rules, not the upstream packs.
export const QUALITY_RULES = {
  Acidic:[38,"On a hit, the foe must pass Coordination or take 2d10+2 fire Damage. When an Injury Power Die shows 6, destroy their armor, shield, or weapon (your choice) instead."],
  Adaptable:[38,"When using this weapon in two hands instead of one for an Attack Action, add +1 Damage."],
  Adamantine:[38,"Weapons gain +10 Base Chance to hit and +2 Damage; armor and shields gain +2 Damage Threshold. The armament cannot be destroyed and costs five times the standard price."],
  Bomb:[38,"Damage and other effects affect a Burst Template. On a miss, roll 1d6: on 1–5 it bounces harmlessly elsewhere; on 6 it bounces back and hits you."],
  Break:[38,"After dealing Damage, this weapon is destroyed."],
  Breaker:[38,"When you successfully Parry a Finesse melee weapon, or your attack is parried by one, you may spend 1 AP to break that weapon."],
  Camouflage:[38,"While wearing this armor, gain +10 Base Chance on Stealth Tests while stationary and undiscovered."],
  Cobalt:[38,"Adds its Quality Level in Damage to Water-nature jutsu cast while wielding this weapon."],
  Dangerous:[38,"When you suffer an Injury while wearing this clothing or while naked, you begin to Bleed."],
  Defensive:[38,"Gain +10 Base Chance when using this weapon to Parry melee weapons."],
  Devastating:[38,"Injuries inflicted with this weapon are always treated as Grievous Injuries."],
  Endurium:[38,"Adds its Quality Level in Damage to Earth-nature jutsu cast while wielding this weapon."],
  Entangling:[38,"After a hit, before Damage, you may force the foe to Resist a Chokehold or Takedown (your choice). They Flip to Fail to Resist."],
  Empowered:[38,"When this weapon is a focus for a Technique of {element}, spend an additional action to halve the Technique's Chakra cost."],
  Explosive:[38,"Uses an Explosion Template for Distance."],
  Fast:[38,"Foes suffer −10 Base Chance to Parry or Dodge attacks made with this weapon."],
  Finesse:[38,"Use [AB] instead of [CB] when determining this weapon's Damage."],
  Fiery:[39,"After a hit, the weapon is extinguished. The foe and another Engaged foe must pass Coordination or suffer 2d10+2 fire Damage. An Injury Power Die showing 6 causes On Fire instead."],
  Heavy:[39,"You cannot use Ninjutsu or Dodge ranged weapons in this armor. Athletics and Stealth Tests have Disadvantage."],
  "Ill-fitted":[39,"Double this armor's Encumbrance until you pay 100,000 Ryo or pass Tradecraft after one day."],
  Immolate:[39,"After dealing Damage, this weapon is extinguished. An Injury Power Die showing 6 causes On Fire instead."],
  Inaccurate:[39,"This weapon cannot take advantage of Long or Extreme Distances."],
  Ineffective:[39,"This weapon cannot deal Damage or inflict Injuries."],
  Khorium:[39,"Adds its Quality Level in Damage to Fire-nature jutsu cast while wielding this weapon."],
  Light:[39,"When held in your offhand, this shield or weapon adds +1 to weapon Damage."],
  Piercing:[39,"Ignore up to {rating} Damage Threshold provided by armor. The default rating is 1."],
  Powerful:[39,"After dealing Damage, you may make the foe Resist with Toughness or be shoved [BB] Paces away. This movement does not provoke Opportunity Attacks."],
  Protective:[39,"Use this shield or weapon's Skill to Hit instead of Coordination to Parry ranged weapons."],
  Pummeling:[39,"Can inflict only Moderate Injuries and never causes Bleeding. Use [BB] instead of [CB] for Damage."],
  Punishing:[39,"After dealing Damage, you may spend 1 AP to add another 1d6 Power Die to Damage."],
  Reach:[39,"Hit Engaged foes or foes up to 2 Paces away. Make an Opportunity Attack when a foe Charges or Runs to Engage or disengage."],
  Repeating:[39,"Fire up to three times before reloading. Loading one ammunition costs 2 AP."],
  Ruined:[40,"Armor grants no Damage Threshold; shields cannot Parry; weapons suffer −3 Damage. Repair for 100,000 Ryo or pass Tradecraft after six days. If Ruined again, it is destroyed."],
  Saronite:[40,"Adds its Quality Level in Damage to Lightning-nature jutsu cast while wielding this weapon."],
  Silent:[40,"When Hidden and making an Attack Action with this weapon, you may spend 2 AP to make a Stealth Test and hide again as a Reaction."],
  Slow:[40,"Foes gain +10 Base Chance to Parry or Dodge attacks made with this weapon."],
  Smoke:[44,"Listed on Smoke Bomb, but its effect is not defined in this playtest's quality list. Resolve the smoke effect with the GM."],
  Spread:[40,"Uses a Cone Template for Distance."],
  Strangling:[40,"After a hit, before Damage, the foe must Resist with Toughness at Disadvantage or enter a Chokehold. If the weapon also has Sweeping, choose which quality to use."],
  Superior:[40,"Gain +5% Base Chance to hit with this weapon."],
  Sweeping:[40,"After a hit, before Damage, the foe must Resist with Coordination at Disadvantage or be knocked Prone."],
  Throwing:[40,"This weapon cannot take advantage of Medium, Long, or Extreme Distances."],
  Trillium:[40,"Adds its Quality Level in Damage to Wind-nature jutsu cast while wielding this weapon."],
  Vicious:[40,"Add another 1d6 Power Die when determining whether the foe is Injured."],
  Volatile:[40,"On Critical Failure, roll 1d6. On 1–5 it malfunctions until repaired outside combat; on 6 it is destroyed and you take 2d10+2 fire Damage."],
  Weak:[40,"This weapon cannot inflict Grievous Injuries."],
  Workable:[40,"Add +{rating} to Tradecraft Tests to repair or craft this item. The default bonus is +10."]
};
const aliases={empowering:"Empowered",pummelling:"Pummeling",camoflauge:"Camouflage"};
const names=new Map(Object.keys(QUALITY_RULES).map(name=>[name.toLowerCase(),name]));
export function qualityTags(value="") {
  const tokens=[];let token="",depth=0;
  for(const char of String(value)){
    if(char==="(")depth++;
    if(char===")")depth=Math.max(0,depth-1);
    if(",;\n".includes(char) && depth===0){tokens.push(token);token="";}else token+=char;
  }
  tokens.push(token);
  return tokens.map(text=>text.trim()).filter(text=>text && !/^(?:none|n\/a)$/i.test(text)).map(label=>{
    const match=/^(.+?)\s*(?:\((.*)\))?$/.exec(label),key=match[1].trim().toLowerCase(),name=aliases[key] ?? names.get(key),parameter=match[2]?.trim();
    if(!name)return {label,known:false,tooltip:`${label}\nCustom quality: no core rule found. See the item's Description & Rules.`};
    const [page,rule]=QUALITY_RULES[name],rating=parameter || (name==="Workable"?"10":"1");
    return {label,name,known:true,tooltip:`${label}\n${rule.replaceAll("{rating}",rating).replaceAll("{element}",parameter || "the indicated element")}\nEoC Shinobi Playtest v1.0, PDF p.${page}`};
  }).map(tag=>({...tag,tooltipHtml:formatRulesTooltip(tag.tooltip)}));
}
import {formatRulesTooltip} from './tooltips.mjs?v=0.3.15';

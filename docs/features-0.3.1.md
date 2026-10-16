# Sheet controls and records

Plot Armor uses the existing `system.shonen` storage key so saved values survive the label change. Secondary attributes recalculate from primary bonuses, bonus adjustments, equipped armor/shields, and secondary adjustments. Chakra maximum recalculates from Tier × (Brawn Bonus + Willpower Bonus), plus Chakra adjustment. Current Chakra remains independent so temporary over-capacity resources are possible.

## Active Effects

Create effects on an Actor or Item with Add Effect; edit their changes in Foundry's native editor. In v14, changes are stored in `system.changes`. Use the initial phase for primary fields such as `system.attributes.brawn`, `system.bonusAdjustments.willpower`, or `system.chakraBonus`. Use the final phase for direct derived overrides such as `system.secondary.initiative` or `system.chakra.max`.

Transferring equipment effects apply while equipped. Transferring Trait effects apply while active. Transferring Profession, Talent, and Heritage effects apply while owned. Disabled effects never apply. Effect durations and expiry follow Foundry's native controls.

## Traits and Misfortune

Select Player Trait or Antagonist Trait on the Item sheet. Antagonist Traits can require a configurable Misfortune cost. Set the shared pool in Configure Settings → Elements of Conflict Zwei → Misfortune Points. The active GM triggers paid Traits; insufficient funds block activation. Deactivate an activated Trait before triggering it again. Deactivation does not refund spent points. Narrative effects still require GM resolution; configure Active Effects for numeric changes.

## Professions and identity

Professions contain 3 Talent, 10 Skill, and 7 Bonus advance slots. Enter their names, or drop a Talent into a Talent slot, and check completed advances. Completion requires all 20 named slots. Tracking advances does not automatically spend XP, increase skill ranks, grant Talents, or add bonus adjustments. Drop Professions, Talents, and Heritages onto a character to own them. Profession and Heritage drops also populate the character's identity label. Legacy Ancestry records remain supported.

Profession, Talent, Heritage, and Trait sheets have no inventory quantity, price, or encumbrance fields.

## Basic Trappings

The EoC Basic Trappings pack contains 113 records from the playtest equipment tables, including all survival, illumination, medicine, poison, armor, shield, melee, and ranged entries. Records include prices, qualities, damage formulas, and fractional encumbrance where specified. Unspecified encumbrance starts at zero and is identified in each description for GM assignment. Medicines and poisons include rule summaries; their consumption, duration, and special outcomes remain GM-resolved. Only EoC compendiums are included as of version 0.3.2.

## Verification

Local checks cover data models, all compendium records, syntax/templates, resource calculations, profession completion, effect suppression, and Misfortune transaction behavior. Live world behavior on Foundry 14.367 and Ubuntu still requires playtesting.

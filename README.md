# Elements of Conflict Zwei for Foundry VTT

A Foundry VTT v14 game system for *Elements of Conflict Zwei*, starting from the Shinobi Playtest v1.0 rules.

- System by: Nexus Flameheart of Nexus of Fantasy
- Built off of Zweihander: Grim and Perilous RPG published by Grim and Perilous Studios, LLC
- Foundry development by: Geek IO Dev Team
- Icons: [RPG-Awesome](https://github.com/nagoshiashumari/Rpg-Awesome) by Daniela Howe and Ivan Montiel (BSD 2-Clause Simplified; font/CSS notices included), and [Game-icons.net](https://game-icons.net) by Lorc and Delapouite (CC-BY-3.0). [Credits and bundled licenses](ICON-CREDITS.md).

# v 0.3.15

- Added GitHub Release installation/update URLs and a portable export package.
- Fixed Fortune damage maximization failing with “roll._evaluateTotal is not a function.”
- Limited compendium filter controls and options to the selected Item type.
- Added Heritage importing with signed bonuses and tiered Boons/Banes in Fields and Paste Text modes.
- Combined all 157 book and expansion Techniques into one Techniques compendium.
- Retired Jutsu, Ritual, Spell, Taint, and Unique Advance Item types; existing records migrate to Technique, Condition, or Talent while retaining their content.

# v 0.3.14

- Moved Damage and Peril trackers directly below their thresholds.
- Fixed template placement targeting for Foundry v14.
- Added Item template controls, Inventory targeting buttons, and automatic Spread weapon templates.
- Added compendium filters for Technique Type, Rank, Nature, Melee/Ranged weapons, and tags/qualities.
- Added clone location selection and independently damageable clone tokens, with optional Sequencer/JB2A appearance effects.

# v 0.3.13

- Added canvas area selectors for Burst, Blast, Explosion, Ray, and Cone Techniques, with automatic targeting and editable dimensions.
- Added a Fortune action to maximize the final active damage die and update the roll total.
- Added chat damage application to targeted characters, with condition-track previews and protection against duplicate applications.

# v 0.3.12

- Added Profession importer fields for 10 Skill Ranks, 7 Bonus Advances, and 3 Talents, with matching Paste Text support.
- Added NPC Traits beside attacks in combat, with activation controls and rules tooltips.
- Fixed Combat Encounter initiative rolls and added clearly labelled Roll Initiative buttons to PC and NPC sheets.
- Sheet initiative rolls now update the active encounter.

# v 0.3.11

- Added NPC and Item importers to their sidebar directories, with Fields and Paste Text tabs, previews, and destination folders.
- Added support for the NPC Guide's attribute/secondary tables, Skill Ranks, Attacks, Techniques, and Traits.
- Linked imported NPC Techniques to matching EoC content; unresolved Techniques remain drafts with warnings.
- Preserved printed NPC bonuses, defenses, attack chances, Size, and Threat Rating.
- Added Antagonist Trait Action Point Cost, Misfortune Cost, and Combat / Non-Combat / Special action types.
- Antagonist Trait activation now spends its configured AP during combat and refunds costs if activation fails.

# v 0.3.10

- Added Critical Success, Critical Failure, Sublime Success, and Sublime Failure fields to all Techniques, with matching outcome rules on roll cards.
- Re-imported all 123 book Techniques and 34 expansion Techniques; source Supreme outcomes populate Sublime fields.
- Added editable custom and dropped starting equipment to Professions, automatically granted to Inventory when the Profession is added.
- NPC attribute right-clicks now cycle preset values; Shift-right-click cycles backwards.
- Fixed Technique use outside combat: Chakra is spent, while AP is required and spent only during combat.
- Allowed further Fortune/Misfortune rerolls of each new non-Critical/non-Supreme result.

# v 0.3.9

- Replaced duplicate Heritage actions with one active-Heritage control and added explicit Item Edit buttons.
- Automated Child of the Pure Lands' Genin bonus for skills with no learned ranks.
- Fixed Fortune/Misfortune reroll buttons and added chat pool controls and damage rolls for successful attacks.
- Unified Technique Use into cost confirmation, a test when applicable, and a rules card; weapon attacks now spend 1 AP.
- Replaced duplicate rules tooltips with styled black tooltips and clearer Technique summaries.
- Preserved scroll positions while editing ranks, Item fields, and compendium browser results.
- Restricted Inventory and Identity creation menus to their respective Item types.
- Added existing Active Effect toggles to the roll dialog with live chance updates.

# v 0.3.8

- Added Talent and Technique rules tooltips.
- Matched PC Skills & Combat to the compact NPC layout with attack profiles and Techniques.
- Removed the lower Chakra Capacity panel; its bonus control is now in Identity.
- Added one coin-funded reroll for non-Critical/non-Supreme skill tests.
- Added a Zweihander-style roll dialog with live chance, difficulty, flip, visibility, and ability references.
- Added schema-backed Active Effect key dropdowns.

# v 0.3.7

- Imported all five book professions, their 15 Talents, and five Specialist Traits. Talents appear in Identity.
- Added a shared Fortune/Misfortune coin window with EoC transfers and GM session controls.
- Added a compact Antagonist/NPC sheet with attack profiles, Techniques, and right-click attribute/ability assignments.
- Enlarged Damage and Peril Threshold panels for all actors.

# v 0.3.6

- Added weapon quality tooltips on Item sheets, Inventory rows, and weapon roll cards using the EoC rules.
- Restyled skill, damage, and initiative results with Zweihander-style titles, modifier badges, colored outcomes, and expandable dice details.

# v 0.3.5

- Replaced sheet icons with RPG-Awesome and Game-icons.net artwork; bundled attribution and licenses.
- Added all 123 book Techniques in a separate compendium organized by Type, Element, and Rank.
- Added Technique type, rank, duration, action type, range, and optional area dropdowns, with automatic Chakra/AP spending on Use.
- Refreshed the separate Heritage Expansion compendium with all 21 named Heritages and their Genin, Chunin, and Jonin Boons and Banes.

# v 0.3.4

- Removed skill dice icons and centered uniformly sized test buttons.
- Renamed the Jutsu tab to Technique.
- Replaced Heritage modifier grids with attribute-bonus dropdown rows and signed values.
- Removed Choice instructions and the rating/skill modifier controls.
- Added editable, removable boons and banes with tier selections; existing Heritage bonuses and tier text migrate into the new lists.

# v 0.3.3

- Combined attributes, skill tests, Dodge/Parry, movement, initiative, Damage, and Peril on one Skills & Combat page.
- Added skill hover/focus highlighting for the associated attribute.
- Added a Jutsu tab and moved Skill Items out of Inventory.
- Added 34 named Jutsu and 21 Heritages from the EoC expansions, preserving unfinished entries as drafts.
- Added Jutsu fields and casting costs, plus Heritage bonus/rating/skill modifiers and Genin/Chunin/Jonin boons and banes.
- Added the EoC Compendium Browser to the Compendium sidebar, with draggable results.
- Organized EoC packs in folders by Item type and added icons for every Item type.

# v 0.3.2

- Removed all Zweihänder and Flames of Freedom compendiums; the packs folder and Rules Library now contain only EoC content.
- Updated compendium generation and packaging to keep releases limited to EoC packs.

# v 0.3.1

- Renamed Shonen Points to Plot Armor.
- Secondary attributes and Chakra maximum now calculate automatically.
- Added native Active Effects and equipment/active Trait effect controls.
- Added Player and Antagonist Traits, with optional Misfortune spending from the shared GM pool.
- Added profession completion tracking for 3 Talents, 10 Skill Advances, and 7 Bonus Advances.
- Added draggable Heritages alongside Professions and Talents, without inventory fields.
- Added the EoC Basic Trappings compendium with weapons, shields, armor, medicine, poisons, survival tools, and illumination.
- Fixed sheet window control icons.

# v 0.2.0

- Rebuilt the character sheet with a portrait header, attribute cards, and Skills, Combat, Inventory, Identity, and Notes tabs.
- Added all 33 EoC skills, editable ranks, and d100 tests with Peril, difficulty, critical/supreme results, and advantage/disadvantage.
- Added Damage and Peril tracks, attribute bonus adjustments, secondary statistics, and a calculated Chakra maximum button.
- Added a searchable Rules Library, owned-item creation/editing/removal, equipment controls, weapon attack/damage rolls, and configurable technique costs.
- Added the Zweihänder and Flames of Freedom baseline content libraries, equipment icons, bestiary, and reference tables, alongside a separate EoC Skills pack.
- Added formatted item descriptions and type-specific weapon, armor, and technique fields.
- New Shinobi start with two Shonen Points and linked tokens; existing character values are preserved.

# v 0.1.2

- Added the missing compatibility declaration for Foundry VTT 14.367 so the system is no longer classified as unavailable with unknown compatibility.

# v 0.1.1

- Corrected the compatibility range to include Foundry VTT 14.367.

# v 0.1.0

## The foundation

- Created a fresh system manifest, native JavaScript modules, validated data models, and ApplicationV2 Actor/Item sheets targeting Foundry v14.
- Added Shinobi and NPC records with seven primary attributes, identity, Nindo, notes, and manually tracked Chakra and Shonen Points.
- Added blank Gear, Weapon, Armor, Technique, Profession, and Trait records, with descriptions, source references, quantity, and a recorded equipped state.
- Established case-sensitive package checks, portable packaging, Ubuntu installation instructions, and an initial rules/roadmap guide.
- Reorganized this README around release history, following the 10,000 Swords system's structure.

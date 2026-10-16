# v0.3.6 — Quality tooltips and roll cards

Weapon qualities appear as hoverable, keyboard-focusable tags in Inventory, on the Weapon Item sheet, and on weapon attack/damage cards. Definitions come from the EoC Shinobi Playtest v1.0 PDF, pages 38–40. Parameterized qualities such as Piercing (2), Workable (15), and Empowering (Wind) retain their values; commas inside parentheses do not split the quality. Unknown homebrew qualities remain visible with a prompt to consult the item's rules.

Skill, Dodge/Parry, weapon/Technique tests, damage, and initiative messages now use a card layout adapted from Zweihander's chat-skill/chat-weapon and dice/roll templates. Cards include a title/subtitle, roll-mode and modifier badges, colored outcomes, roll-versus-chance results, and expandable native dice details. Advantage/disadvantage flips show the original and effective totals. Damage cards show the evaluated formula and exploding-dice count.

The underlying Rolls, result calculation, and test flags are preserved. Messages use Foundry v14's native Roll.toMessage mode handling, so public, private, self, and blind results keep core visibility behavior. Styling only applies to visible EoC cards. Old chat messages retain their original contents. No combat buttons or downstream automations were copied from Zweihander.

Adapted layout code is covered by the retained MIT notice in `licenses/zweihander-MIT.txt`. Only EoC content remains in the packaged compendiums.

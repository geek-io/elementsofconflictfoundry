# Heritage controls and test buttons

The character tab is now called Technique. Skill dice icons are removed, and the test buttons are centered with a common height.

Heritage modifiers use a list of attribute-bonus dropdowns and signed numeric values. Add or remove rows with the plus and trash controls. Multiple rows for the same bonus add together. Only the character's selected Heritage contributes these adjustments. The former rating and skill modifier grids, untrained-bonus control, and Choice instructions field are removed; their legacy numeric adjustments no longer apply.

Boons and Banes each have independent Add and Remove controls. Every entry has a name, Genin/Chunin/Jonin tier, and description. These are narrative rules unless configured with Active Effects; they do not automatically spend resources or grant abilities.

Existing signed bonus adjustments and all available tier descriptions migrate into the new lists. Empty lists intentionally remain empty, so deleting the last entry does not restore old data when an Item reloads. Partial edits to names or descriptions preserve existing lists. Old expansion snapshots remain source references; generated packs contain the new row format.

Local checks cover migration, partial updates, signed values, simultaneous edits, add/remove controls, ownership, and rendered dropdowns. World interaction testing remains separate from schema/template verification.

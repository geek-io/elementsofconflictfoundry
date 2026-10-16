# Skills, Jutsu, and Heritages

The Skills & Combat page puts primary attributes, tests, Dodge/Parry, Movement, Initiative, Damage, and Peril together. Skills and combat panels scroll independently at desktop widths. Hovering or focusing a test highlights its associated primary attribute on that same sheet. The interaction and three-column organization follow the Zweihänder reference; EoC skill assignments and rules remain in force.

Inventory holds physical Items only. Owned Skill Items appear under Owned Skill Records on Skills & Combat; their reference records do not automatically purchase skill ranks. Enter ranks in the skill list. Jutsu, Technique, Spell, and Ritual Items appear on Jutsu regardless of which sheet tab receives the drop. Other non-physical records appear under Identity.

## Jutsu

The Jutsu compendium includes all 34 named entries from the [Jutsu Expansion](https://docs.google.com/document/d/1UOJy--NY0l0C5Uvn1ad9DTb8lD5h3P3WTrkg8B7W-GQ/edit). Blank authoring templates are omitted. The 22 entries with cast rules and costs are configured; 12 named drafts retain the source's unfinished content and cannot be used until configured. Rank, Nature, Discipline, Action Type, Range, Duration, Chakra rules, and AP rules are editable. Source descriptions preserve the available critical and supreme outcomes.

Use prompts for the actual Chakra and AP total, accommodating clone counts, alternate cast variants, and maintained upkeep. Spending only proceeds when the character has the resources. Upkeep, area templates, narrative outcomes, and conditional critical benefits require table resolution. Formula buttons are supplied where the source states a direct dice-plus-bonus damage formula; conditional damage still needs its source prerequisites.

Drag entries from the compendium, browser, or Items directory onto the Actor sheet. Drag owned entries off the sheet with Foundry's native Item handling.

## Heritages

The Heritage compendium contains 21 named entries from the [Core Heritage Expansion](https://docs.google.com/document/d/1QCJvpelbQ4wGB9_fyRFQEhTpTUclmlrRjNnUEDXawJA/edit). Set bonus adjustments, primary rating modifiers, individual skill modifiers, and the three tiers' boon/bane text on the Heritage sheet. Known modifiers are prefilled; unspecified values remain zero with source placeholders retained. For Child of the Pure Lands, choose its three positive and three negative bonus adjustments manually. Its untrained +5 test benefit is prefilled.

Only the selected owned Heritage contributes these modifiers. The first Heritage is enabled on creation; use Use Heritage in Identity to switch. Derived modifiers do not overwrite base ratings, purchased bonus adjustments, or current Chakra. Tier availability is shown against the Actor's Tier. Conditional tier benefits, restrictions, special damage alternatives, Fortune/Plot Armor spending, and granted abilities remain source rules for table resolution or configured Active Effects.

The expansions' original Fortune terminology remains in their descriptions; the Actor resource continues to be Plot Armor. No new Fortune resource is introduced.

## Compendiums and icons

EoC packs are split by Item type, inside type folders. EoC Compendium Browser appears in the Compendium sidebar, opens from a character, supports type filtering and searches across names, source packs, natures, ranks, disciplines, and categories. All results are draggable. Sidebar browsing works without an Actor; the Add action is available when opened from an owned Actor.

Every registered Item type has a bundled SVG icon. Existing custom images remain intact; generic default images use the type icon.

## Verification

Local rules/schema checks and browser-rendered template checks cover routing, Heritage recalculation, source draft detection, scoped hover/focus highlighting, and the Compendium Browser. End-to-end world testing on Foundry v14.367 remains required.

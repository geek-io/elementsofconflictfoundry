# Rules implementation reference

The Zweihänder source in vendor/zweihander is retained as a development reference. Its code notices remain in licenses/. The EoC runtime uses its own models, character sheets, and rules. Multi-target exploding damage support was adapted from the upstream implementation with its MIT notice retained.

## EoC content only

Version 0.3.2 removes all Zweihänder and Flames of Freedom compendiums from the active packs folder, manifest, and release package. The Rules Library indexes only EoC Skills and EoC Basic Trappings. The pack build script generates these EoC records from scripts/config.mjs and data/basic-trappings.mjs; it does not import the reference game's equipment, spells, professions, creatures, tables, or other records.

Historical source snapshots and old release archives are development references, outside the active packs folder. Already-imported world documents remain independent; this cleanup does not delete user-owned world records.

## Packaging

Checks require the packs directory to match the declared EoC compendiums exactly. Packaging rejects obsolete staged compendiums. Replace the installed system directory for the updated release to avoid retaining old compendium files.

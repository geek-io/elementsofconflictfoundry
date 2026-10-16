# Installation and development

## Ubuntu test installation

Use a separate Foundry v14 test world. Stop Foundry before installing or replacing the system. Locate your configured **User Data Path**; the target is `<User Data Path>/Data/systems/elementsofconflictfoundry/`.

From a terminal, replace `/srv/foundryuserdata` with your actual User Data Path:

```bash
git clone https://github.com/geek-io/elementsofconflictfoundry.git elementsofconflictfoundry
mkdir -p /srv/foundryuserdata/Data/systems/elementsofconflictfoundry
cp -a elementsofconflictfoundry/system.json elementsofconflictfoundry/scripts elementsofconflictfoundry/styles elementsofconflictfoundry/templates elementsofconflictfoundry/lang elementsofconflictfoundry/assets elementsofconflictfoundry/packs elementsofconflictfoundry/licenses /srv/foundryuserdata/Data/systems/elementsofconflictfoundry/
```

The clone instructions apply once these local changes are published to the repository. For the current local foundation, transfer the staged package described below to Ubuntu instead. The folder name must exactly match `elementsofconflictfoundry`. The Foundry service account must be able to read its files. No Windows paths, external fonts, build pipeline, or Node dependencies are required by the system at runtime.

Start Foundry and create a world using **Elements of Conflict Zwei**. Once the GitHub Release assets are published, use the manifest URL in [Release packaging](releasing.md) to install through Foundry's Install System dialog.

## Local checks and staging

Development requires Node.js 22 or newer:

```bash
npm ci
npm test
npm run check
npm run package
```

Packaging creates `dist/elementsofconflictfoundry/` containing runtime files, compiled packs, assets, documentation, and notices. Transfer that directory into the Ubuntu `Data/systems/` directory. Runtime dependency installation is not needed. Packaging does not publish or deploy anything. Development dependencies support compilation and validation; `npm run build:packs` rebuilds only EoC Skills and EoC Basic Trappings from the EoC configuration and `data/basic-trappings.mjs`.

## Foundry smoke test (pending)

1. Confirm system selection and world launch on your exact v14 build; record the build and Ubuntu version.
2. Create Shinobi and NPC Actors. Edit each attribute and identity field, close and reopen, and reload the world to confirm persistence.
3. Check that negative resource values and out-of-range attributes are limited by the data models. Resources are independent manual records; maximum does not clamp current Chakra yet.
4. Create Item types, edit their fields, and reopen them. Browse the Rules Library, add items, and test item drops. Confirm owned copies persist independently of their world or compendium originals.
5. Test as a limited player: owned Actors should be editable; observer sheets should be read-only. Check portrait editing and narrow sheet layout.
6. Check the browser/server console for errors and missing files. Verify all paths on Ubuntu's case-sensitive filesystem.

After a successful live test, record the exact build in the release notes and manifest `compatibility.verified`. Local static checks do not establish runtime compatibility.

## Version 0.2.0 playtest checks

Test all six sheet tabs, rank editing and persistence, skill difficulty/advantage options, Damage/Peril changes, armor threshold bonuses, automatic Chakra maximum, configured technique costs, owned-item removal, and rich-text description saving. Check GM/public/private/blind roll visibility. Test both linked PCs and unlinked NPC tokens.

## Structure

`scripts/` contains initialization, schemas, configuration, and sheets. `templates/` contains Handlebars sheet markup. `styles/` contains scoped CSS. `lang/` contains document type and sheet labels. `tools/` contains cross-platform validation and staging commands. `docs/` contains setup, rules decisions, and future scope.

Keep the system ID stable. Add documented, non-destructive data migrations before changing stored field names or document types. Update the manifest, package version, and README together for each release.

Version 0.3.1 controls and verification: [Sheet controls and records](features-0.3.1.md).

## Version 0.3.2 content cleanup

Only EoC Skills and EoC Basic Trappings are registered or packaged. Replace the installed system directory when installing this release so old pack files are not left behind. Already-imported world Items and Actors are independent records and are not deleted by this package cleanup.

## Version 0.3.3 sheets and libraries

See [Skills, Jutsu, and Heritages](features-0.3.3.md). The current runtime has eight type-specific EoC packs containing 201 Items. Replace the system directory to remove the obsolete combined Basic Trappings pack. The builder now reads the static EoC expansion snapshots as well as skills and trappings.

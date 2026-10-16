# Release packaging

Current release: **v0.3.15**, for Foundry VTT v14 build 367 and later v14 builds.

## Build

Run from the repository root:

```sh
npm ci
npm test
npm run package
python3 tools/release.py
```

On Windows, use `py tools/release.py` or the path to your installed Python 3 interpreter. Python is needed only to build the ZIP. Servers need neither Python nor npm to run the packaged system. Compiled packs are included; if their source data changes, run `npm run build:packs` before packaging.

Outputs are in `dist/releases/v0.3.15/`:

- `elementsofconflictfoundry-0.3.15.zip`: complete runtime folder, with Unix directory permissions 0755 and file permissions 0644.
- `system.json`: the same manifest included in the ZIP.
- `SHA256SUMS.txt`: archive and manifest checksums.
- `RELEASE-NOTES.md`: text for the GitHub Release description.

## Publish manually

1. Publish your repository changes when ready.
2. Create a GitHub Release tagged **v0.3.15**. Use `RELEASE-NOTES.md` as its description.
3. Attach the ZIP, `system.json`, and `SHA256SUMS.txt` as release assets, retaining these exact filenames.
4. Publish it as the latest release. The download URLs become usable after the assets are public.

Foundry installation manifest:

```text
https://github.com/geek-io/elementsofconflictfoundry/releases/latest/download/system.json
```

Version-specific manifest:

```text
https://github.com/geek-io/elementsofconflictfoundry/releases/download/v0.3.15/system.json
```

For later versions, update the system/package version, entry point, cache versions, release notes, and manifest download URL together. The stable `manifest` URL stays on `releases/latest/download/system.json`.

## Install on another server

In Foundry Setup, select **Game Systems → Install System** and paste the installation manifest URL after publishing the assets. For manual installation, extract the ZIP into `<User Data Path>/Data/systems/`; the resulting path must be `Data/systems/elementsofconflictfoundry/system.json`. Keep the folder name unchanged. Stop Foundry before replacing an existing installation, then restart and select the system for your world.

Clone appearance animations require the optional Sequencer/JB2A modules. They are not bundled in this release.

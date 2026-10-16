# EoC expansion sources

- [Jutsu Expansion](https://docs.google.com/document/d/1UOJy--NY0l0C5Uvn1ad9DTb8lD5h3P3WTrkg8B7W-GQ/edit)
- [Core Heritage Expansion](https://docs.google.com/document/d/1QCJvpelbQ4wGB9_fyRFQEhTpTUclmlrRjNnUEDXawJA/edit)

The JSON snapshots contain the named entries from the user-supplied expansions. Blank templates and the documents' authoring instructions are excluded. The 34 Jutsu entries include 22 configured records and 12 named drafts. The 21 Heritages retain specified bonus adjustments and all available Genin, Chunin, and Jonin boon/bane text; question marks and unfinished content remain explicit.

`tools/import-expansions.py` transforms local plain-text exports in `tmp/` into these snapshots. `npm run build:packs` builds the shipped compendiums from the snapshots without contacting Google Docs.

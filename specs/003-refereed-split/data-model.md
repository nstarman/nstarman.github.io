# Data model

- **Publication.refereed** (required): `"journal"` — accepted, published, submitted or written for a refereed journal (JOSS included); `"proceedings"` — peer-reviewed conference or workshop paper; `false` — not refereed (reports, white papers).
- **Selection.refereed** (v2, optional): `{ "<sectionId>": "split" }`; any other value dropped.
- **Preset section.refereed** (optional): `"split"`.
- **Model section.groups[]**: `{ label, ids, heading? }` — `heading` only with the split, on the first run of each kind.
- **Tally.journal** (only with the split): count of non-in-prep `journal` papers counted.

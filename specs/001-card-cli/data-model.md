# Data model: Card images from the command line

No stored data. One in-memory request, read from the command line by `readArgs`:

| field | from | rule |
|---|---|---|
| `id` | 1st positional | required; an item with an embed page (publication, highlight, software) — checked in the page |
| `name` | 2nd positional, optional | a `SITE_PRESETS` key, or a card name `parseName` reads; left out, `defaultSlug(item)` |
| `theme` | `--theme` | `light` (default) or `dark` |
| `width` | `--width` | integer 120–1600 px; used only where the name fills its width, and required there |
| `out` | positional ending in `.svg`, `.png` or `.pdf` | optional; default `file(s, theme)` in the working directory, PNG |
| `format` | `out`'s extension | `svg`, `png` or `pdf`; any other extension is an error |

The builder card handed to `downloadCard`: `{ id, it: { title }, slug, width, format, theme }`, as
`readSpec` makes it in the builder.

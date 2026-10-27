# Data model: Professional Activities

## Item fields

### `presentation` (gains two optional fields)

| field | meaning |
|---|---|
| `role` | my part in the event — SOC, LOC, Organizing Committee — `$defs/role`, under data-model FR-036 (never repeats the title) |
| `professional` | `true` when the talk is about software or the community, not science; absent is false |

A presentation's CV heading reads title, role, then its place as today (FR-028 of cv-presets
gains `presentation`). Its `event` line is unchanged.

### No "Role: " prefix

No string in any item's `details` starts with "Role:". A test enforces it.

## Presets (`config/presets.json`)

### `$groups` (new)

```jsonc
"$groups": {
  "professional": {
    "heading": "Professional Activities",
    "short": "Professional",
    "icon": "service",
    "sections": ["conferences-organized", "conferences-attended", "talks-professional", "peer-review", "service"]
  }
}
```

- A group id may not equal a section id.
- Every id in a group's `sections` is a `$sections` id; a section belongs to at most one group.
- Presets never list a group. Grouping is switched on per CV by the builder (`groups`).

### `$sections` changes

As research.md R4: `conferences` removed; `conferences-organized`, `conferences-attended`,
`talks-professional` added; `peer-review` heading "Peer Review & Panels"; `service` heading
"Service & Committees"; `talks-invited`, `talks-contributed` gain `not: { professional: true }`.

## Resolved model (`resolve()` → `cvModel()`)

Each section object gains, when grouped:

```js
group: { id: 'professional', heading: 'Professional Activities', short: 'Professional', icon: 'service' }
```

Sections of one group are consecutive and ordered per research.md R2.

## Saved selection (v2)

v1's fields plus `groups`: the group ids switched on (absent or `[]` = none). `decode()` migrates
a v1 file per research.md R7; `encode()` writes v2. With a group on, `order` may name its id.

## Migration of data

The 17 items of research.md R6, plus `professional: true` on `from-jax-to-galax` and
`astropy-core-developer-conference-talk`. No id, filename or date changes.

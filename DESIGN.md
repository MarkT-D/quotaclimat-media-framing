# Design System

## Palette — Mossy Broadsheet

### CSS variables (`app/globals.css`)

| Token | Hex | Role |
|---|---|---|
| `--red` | `#B8402E` | Primary accent — headlines, borders on hover, key data |
| `--red-l` | `#F2E6E2` | Red tint — section meta backgrounds |
| `--red-m` | `#D48878` | Mid red — secondary chart lines, conflict frame |
| `--red-d` | `#7A2018` | Dark red — deep accent |
| `--green` | `#4A6741` | Secondary accent — positive signals, solutions |
| `--green-l` | `#D8E8C4` | Green tint — section meta backgrounds |
| `--green-m` | `#A8BE8A` | Mid green — chart fills |
| `--green-d` | `#2D4228` | Dark green — deep accent |
| `--bg` | `#F2EDE3` | Page background (warm off-white) |
| `--bg2` | `#EAE4D8` | Secondary background — badges, chips, inset areas |
| `--border` | `#B8B0A4` | Borders, dividers |
| `--t1` | `#1C1A14` | Primary text |
| `--t2` | `#7A7265` | Secondary / muted text |

### Chart-only hardcoded colors

| Hex | Usage |
|---|---|
| `#7C3AED` | Morality frame |
| `#EF9F27` | Economic Consequences frame / Economics angle |
| `#D4A017` | Misinformation moderate risk |
| `#C4943A` | Sector chart (Buildings) |
| `#8A9A50` | Sector chart (overflow) |

### Sector chart palette (in order)

`--red` · `--green` · `--red-m` · `--green-d` · `#C4943A` · `--green-m` · `--t2` · `--red-d` · `#8A9A50`

### Frame chart palette (in order)

| Frame | Color |
|---|---|
| Attribution of Responsibility | `--red` |
| Human Interest | `--green` |
| Conflict | `--red-m` |
| Morality | `#7C3AED` |
| Economic Consequences | `#EF9F27` |

### Angle chart palette (in order)

`--red` · `#EF9F27` · `--green` · `--red-m` · `#7C3AED` · `--green-m`

---

## Typography

All fonts loaded via `next/font/google` in `app/layout.tsx`. One custom font loaded via `@font-face` in `globals.css`.

| CSS variable | Font family | Weights | Usage |
|---|---|---|---|
| `--font-playfair` | Playfair Display | 400, 500, 700 (normal + italic) | Editorial headlines, large numbers, section heads |
| `--font-playfair-sc` | Playfair Display SC | 400, 700 | Small-caps display text |
| `--font-source-serif` | Source Serif 4 | 300, 400, 600 | Body copy, editorial notes, bylines |
| `--font-podkova` | Podkova | 400, 500, 600, 700 | UI labels, metadata, tooltips, legends |
| `--font-quantico` | Quantico | 400, 700 | Section meta chips (uppercase tags) |
| `--font-special-elite` | Special Elite | 400 | Bylines, datelines, outlet names — typewriter feel |
| `--font-quattrocento` | Quattrocento | 400, 700 | Available, currently unused |
| *(no variable)* | OldNewspaperTypes | 400 | Decorative display — loaded from `public/fonts/` |

### Usage conventions (from `app/overview/page.tsx`)

| Element | Font | Size |
|---|---|---|
| Hero headline | Playfair Display 400 | 56px |
| Section heads | Playfair Display 400 | 22px |
| Large stat numbers | Playfair Display 400 | 52px |
| Outlet names | Special Elite | 12px |
| Section meta chips | Quantico uppercase | 13px |
| Body / editorial notes | Source Serif 4 | 13–18px |
| All UI labels, legends, tooltips | Podkova | 10–13px |

---

## Texture

Background uses `public/crumpled.png` blended at 18% opacity (`rgba(242,237,227, 0.82)` overlay) over the `--bg` base color, creating a subtle paper grain. Two CSS classes handle this:

- `body::before` — scrolls with content (main pages)
- `.paper` — fixed attachment (sticky header via `NewspaperHeader.tsx`)

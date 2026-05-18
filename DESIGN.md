# Design System — Mossy Broadsheet

## Thesis

The Climate Narrative Review presents climate journalism with the visual language of a printed broadsheet. Hairline rules, editorial serif typography, warm paper tones, and column-driven layouts evoke the gravity of long-form reporting while keeping data readable. Every page — including utility surfaces like upload, comparison, and about — wears the same broadsheet skin. There is no "dashboard mode": charts sit inside hairline-bordered sections, captions sit beneath them as editorial notes, and the texture of paper runs unbroken across the document.

When designing a new surface, ask: *would this fit in a printed paper?* If the answer is no, the design is off-system.

The canonical implementation is `app/overview/page.tsx`. When uncertain, read it first.

---

## Palette

The full palette is **19 colors**: 14 tokens declared in `app/globals.css`, plus 5 chart-only hex values that live outside the token system because they encode meaning rather than mood.

No other colors are permitted in components or pages. Tailwind palette utilities (`bg-emerald-400`, `text-neutral-500`, `border-neutral-200`, etc.) are banned.

### Tokens (`app/globals.css`)

| Token | Hex | Role | Use for |
|---|---|---|---|
| `--red` | `#B8402E` | Primary accent | Editorial accent, primary headlines on hover, sector "Energy", angle "Politics", domain "Climate", Attribution-of-Responsibility frame |
| `--red-l` | `#F2E6E2` | Red tint | Section meta chip backgrounds when the section is about coverage/attention/risk; high-risk badge background |
| `--red-m` | `#D48878` | Mid red | Secondary chart lines, Conflict frame, outlet sequence #3 |
| `--red-d` | `#7A2018` | Deep red | High-risk badge text, sector overflow #8 |
| `--green` | `#4A6741` | Secondary accent | Solutions, positive signals, Human-Interest frame, GHG-emissions reference dot, outlet sequence #2, SVG mark rectangle |
| `--green-l` | `#D8E8C4` | Green tint | Section meta chip backgrounds when the section is about solutions/balance; low-risk badge background |
| `--green-m` | `#A8BE8A` | Mid green | Domain "Natural Resources", chart fills, outlet sequence #4 |
| `--green-d` | `#2D4228` | Deep green | Low-risk badge text, sector #4 |
| `--bg` | `#F2EDE3` | Page background | Warm off-white paper. Solid surface for cards, modals, broadsheet sections, SVG mark bars |
| `--bg2` | `#EAE4D8` | Inset background | Section meta chips (neutral), chart grid lines, classification chips, moderate-risk badge background |
| `--border` | `#B8B0A4` | Hairline | All thin component borders, dividers within a panel, default rule color |
| `--t1` | `#1C1A14` | Primary text | Body copy, headlines, primary borders between editorial blocks, active states, button fills |
| `--t2` | `#7A7265` | Secondary text | Bylines, datelines, metadata, axis labels, tooltips, captions, inactive links, outlet sequence #5 |

### Chart-only hex values

These five are permitted because they carry semantic load that doesn't reduce to red/green/grey.

| Hex | Semantic role |
|---|---|
| `#7C3AED` | Morality frame (purple — no warm-palette analogue) |
| `#EF9F27` | Economic Consequences frame, Economics angle |
| `#D4A017` | Moderate misinformation risk — bar fill, badge accent text |
| `#C4943A` | Sector chart — "Industry" overflow position |
| `#8A9A50` | Sector chart — "Resource Economy" overflow position |

### Banned colors (most common offenders)

These have been removed and must not return:

| Banned | Replace with |
|---|---|
| `#000` | `--t1` |
| `#616161` | `--t2` |
| `#fff` | `--bg` |
| `#2D6A4F` | `--green` (including inside the SVG mark) |
| `#C8392B` | `--red` (including inside the SVG mark) |
| `#8EE339`, `rgba(142,227,57,*)` | (drop — neon has no role) |
| `#6D28D9`, `rgba(109,40,217,*)` | `#7C3AED` |
| `#FEF9EE` / `#7A4F00` | `--bg2` bg + `#D4A017` text |
| `#7A9A6A`, `#8B7355` | (frame mapping — see Chart palettes) |
| `#e5e7eb`, `#f3f4f6`, `#4b5563` | `--bg2`, `--border`, `--t2` (per role) |
| `#22c55e`, `#ef4444`, all Tailwind palette utilities | palette tokens |

---

## Chart palettes

All chart palettes are drawn from the 19 colors above. No chart introduces new hex.

### Sector chart (9 sectors)

`--red` · `--green` · `--red-m` · `--green-d` · `#C4943A` · `--green-m` · `--t2` · `--red-d` · `#8A9A50`

### Frame chart — canonical mapping

| Frame | Color |
|---|---|
| Attribution of Responsibility | `--red` |
| Human Interest | `--green` |
| Conflict | `--red-m` |
| Morality | `#7C3AED` |
| Economic Consequences | `#EF9F27` |

This mapping is canonical and **may not be overridden by any surface**. The previous override in `app/search/page.tsx` is retired.

### Angle chart (6 angles)

`--red` · `#EF9F27` · `--green` · `--red-m` · `#7C3AED` · `--green-m`

### Outlet comparison sequence (max 5)

`--red` · `--green` · `--red-m` · `--green-m` · `--t2`

On `/newspapers`, this 5-color sequence is the full vocabulary. If more than 5 outlets are selected, colors cycle and editorial clarity degrades — selection UI should encourage 5 or fewer.

### Domain chart (3 domains)

`--red` (Climate) · `--green` (Biodiversity) · `--green-m` (Natural Resources)

### Chart chrome (applies to every chart)

| Element | Treatment |
|---|---|
| Grid lines (cartesian, polar) | `--bg2`, stroke 0.5px, dashed `2 5` |
| Axis lines | `--border`, 0.5px |
| Axis labels | IBM Plex Sans 11–12px, `--t2` |
| Tooltip background | `--bg` |
| Tooltip border | 1px `--t1` |
| Tooltip text | IBM Plex Sans 12px, `--t1` (label) / `--t2` (key) |

---

## Typography

Three typeface families. No others. Loaded via `next/font/google` in `app/layout.tsx`.

**Rule of thumb for future contributors:** if it's *writing*, it's a serif. If it's *interface*, it's IBM Plex Sans.

| CSS variable | Font | Weights | Role | Sizes |
|---|---|---|---|---|
| `--font-playfair` | Playfair Display | 400, 500, 700 (normal + italic) | **Display serif.** Article headlines, section openers, masthead, hero copy, large editorial moments. The voice of the brand at its most editorial. | 24px and up |
| `--font-playfair-sc` | Playfair Display SC | 400, 700 | **Small-caps companion** to Playfair Display. Used wherever small-caps display is called for (masthead, decorative section openers). Loaded as a dedicated variant because the Google Fonts build of Playfair Display does **not** ship the `smcp` OpenType feature (verified: `GSUB` features are `calt, ccmp, dnom, frac, kern, liga, lnum, locl, mark, mkmk, numr, rlig`). Faking small caps via `text-transform: uppercase` produces wrong proportions and is forbidden. | 13–32px |
| `--font-source-serif` | Source Serif 4 | 300, 400, 600 (normal + italic) | **Reading serif.** Article body, long-form descriptions, editorial captions, methodology notes — anywhere the content *is* writing. | 14–20px |
| `--font-plex-sans` | IBM Plex Sans | 400, 500, 600 | **Functional sans.** UI chrome, form labels, buttons, navigation, metadata, badges, error messages, tooltips, data labels in charts, axis labels — anything that isn't editorial content. Quiet; never competes with the serifs. | 11–16px |

Playfair Display SC counts toward the same typeface family as Playfair Display — it is a small-caps *cut* of the same design, not a separate identity.

### Retired fonts

`Quantico`, `Special Elite`, `Quattrocento`, `Podkova`, and the local `OldNewspaperTypes` are removed from `app/layout.tsx`, `app/globals.css`, and `public/fonts/`. Their effects are reproduced as:

| Was | Now |
|---|---|
| Quantico uppercase tags | IBM Plex Sans 11–13px + `text-transform: uppercase` + `letter-spacing: 0.04em`, weight 500 |
| Special Elite typewriter bylines/datelines | IBM Plex Sans 12–13px, weight 400 |
| Podkova UI labels and metadata | IBM Plex Sans, same roles and sizes |
| Quattrocento (unused) | (no replacement) |
| OldNewspaperTypes display (search hero) | Playfair Display 400 |
| Faked small caps (`text-transform: uppercase` + `letter-spacing`) | `var(--font-playfair-sc)` directly |

The trade-off: the site loses both its typewriter accent (Special Elite) and its rounded-slab UI font (Podkova). It gains a clean editorial split — serifs carry meaning, sans carries function — and a more contemporary visual register. Closer to *The Atlantic* or *The Pudding* online than to a literal print newspaper byline.

### Size scale

| Role | Font | Size | Line height | Weight |
|---|---|---|---|---|
| Hero (home) | Playfair Display | 140px | 1.0 | 400 |
| Editorial headline | Playfair Display | 38–56px | 1.05 | 400 |
| Section head | Playfair Display | 24px | 1.15 | 400 |
| Large stat number | Playfair Display | 32–52px | 1.0 | 400 |
| Edition number (home) | Playfair Display | 72–96px | 1.0 | 400 |
| Body copy | Source Serif 4 | 14–18px | 1.5 | 300–400 |
| Long-form / article body | Source Serif 4 | 16–20px | 1.6 | 400 |
| Editorial note (italic) | Source Serif 4 | 14px | 1.5 | 300 italic |
| Outlet name / byline | IBM Plex Sans | 12–13px | 1.0 | 500 |
| Dateline / metadata | IBM Plex Sans | 11–12px | 1.0 | 400 |
| Section meta chip | IBM Plex Sans | 13px uppercase | 1.5 | 500, letter-spacing 0.04em |
| Navigation link | IBM Plex Sans | 13px | 1.0 | 500 |
| Button | IBM Plex Sans | 12px uppercase | 1.0 | 500, letter-spacing 0.04em |
| Filter chip / UI label | IBM Plex Sans | 11px uppercase | 1.0 | 500, letter-spacing 0.04em |
| Form label | IBM Plex Sans | 11–12px | 1.2 | 500 |
| Error / status message | IBM Plex Sans | 12px | 1.4 | 400 |
| Axis / tooltip | IBM Plex Sans | 11–12px | 1.0 | 400 |

### Loading & fallbacks

Fonts are loaded via `next/font/google` in `app/layout.tsx`. The function imports are `Playfair_Display`, `Playfair_Display_SC`, `Source_Serif_4`, and `IBM_Plex_Sans`. Each font exposes a CSS variable on `<html>` via the `variable:` option:

- `--font-playfair`
- `--font-playfair-sc`
- `--font-source-serif`
- `--font-plex-sans`

`next/font` auto-includes adjusted fallback fonts to minimize cumulative layout shift; no manual fallback stack is required at the component level. Component code references the variables, never the family names directly.

The local `@font-face` declaration for `OldNewspaperTypes` is removed from `globals.css` and the corresponding `.ttf` file is deleted from `public/fonts/`. The body default `font-family` is set to `var(--font-source-serif), Georgia, serif` so any unstyled prose renders in the reading serif by default.

---

## Spacing

Use the **4pt scale** for all padding, margin, and gap:

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`

Non-scale values (10, 18, 22, 26, 44, 66) should be rounded to the nearest scale step during refactor.

### Page frame

| Surface | Max width | Horizontal padding | Viewport target |
|---|---|---|---|
| Home (`/`) | 1440px | 48px | **Single viewport @ 1440×900 — content fits without scroll** |
| Dashboard, search, newspapers, upload, about | 1440px | 48px | Scrolls as needed |
| Article detail | 768px | 32px | Scrolls as needed |

All editorial pages share the same max-width and padding. Article detail is the only narrower surface — reading column rather than dashboard. The home page additionally targets in-viewport fit (no vertical scroll) at 1440×900 on standard laptop chrome; see *Home page layout* below for the section-by-section budget. At smaller viewports the home page reflows and scrolls naturally.

### Vertical rhythm

| Element | Gap |
|---|---|
| Between major broadsheet sections | 24px |
| Inside a section, between blocks | 16px |
| Within a card, between elements | 8–12px |
| Page top to first content | 32–48px |

---

## Borders & rules

Four weights. Use them deliberately.

| Name | Definition | When |
|---|---|---|
| Hairline | `0.5px solid var(--border)` | Card outlines, chip outlines, faint sub-section breaks |
| Soft rule | `1px solid var(--border)` | Dividers within a section, between rows in a list, footer breaks |
| Section rule | `1px solid var(--t1)` | Major broadsheet section borders, the outer border of chart panels, between editorial blocks, between grid cells inside a broadsheet section |
| Heavy rule | `2px solid var(--t1)` | Masthead break, beneath the hero block, "this is a serious threshold" |

### Forbidden border treatments

- **`border-radius` on any broadsheet surface, chart panel, button, badge, chip, or filter.** All surfaces are square-cornered. Newspapers do not have rounded corners. (The SVG mark is the single exception — its containing rectangle has `rx="11"` because the mark is a logo, not a UI surface.)
- Card chrome from generic libraries (`rounded-xl`, `shadow`, `shadow-sm`, `border-neutral-200`, `bg-white`) anywhere on the site.
- Drop shadows except on floating overlays (modals, tooltips). Single shadow recipe: `0 10px 32px rgba(28,26,20,0.18)`.

---

## Component patterns

### Broadsheet section

The default container for a block of editorial or charted content.

```
border: 1px solid var(--t1);
background: var(--bg);
padding: 22px 26px 24px;
```

When two sections sit in a grid (e.g. chart pair on `/overview`), the dividing border between them is `1px solid var(--t1)` (the right border of the left cell). The outer container has `border: 1px solid var(--t1)`. Sections never nest — they sit side-by-side or stacked.

### Hairline card

The lighter container for prose-only blocks, inset panels, modal bodies, or surfaces that don't need a broadsheet section's gravity.

```
border: 0.5px solid var(--border);
background: var(--bg);
padding: 16px 20px;
```

### Section meta chip

The small uppercase tag beneath a section head.

```
font: 13px IBM Plex Sans uppercase, weight 500, letter-spacing 0.04em;
color: var(--t2);
padding: 3px 10px;
border: none;
background: <see rule below>;
```

**Background semantic rule:**

| Background | When the section is about |
|---|---|
| `--red-l` | Coverage volume, attention, responsibility, risk, conflict |
| `--green-l` | Solutions, balance, positive signals, alignment |
| `--bg2` | Descriptive, neutral, or comparative content |

### Editorial note

The italic caption beneath a chart.

```
border-top: 1px solid var(--t1);
margin-top: 16px;
padding-top: 12px;
font: 13px Source Serif 4 italic, weight 300;
color: var(--t2);
line-height: 1.5;
```

### Stat row

The flat horizontal summary at the top of `/overview`. **Not** four separate cards.

```
container: border 1px solid var(--t1), no radius
cell: padding 18px 22px 20px, border-right 1px solid var(--t1) (except last)
label: IBM Plex Sans 11px uppercase letter-spacing 0.05em, var(--t2)
number: Playfair Display 52px, var(--t1)
sublabel: above a 1px var(--border) top rule, padding-top 8px, IBM Plex Sans 12px var(--t2)
```

### Badge / tag

```
font: 11–12px IBM Plex Sans, weight 500;
padding: 2px 8px;
border: 0.5px solid var(--border);
background: var(--bg2);
color: var(--t2);
```

Tier variants for risk-style badges:

| Tier | Background | Text |
|---|---|---|
| Low | `--green-l` | `--green-d` |
| Moderate | `--bg2` | `#D4A017` |
| High | `--red-l` | `--red-d` |

### Button

Three variants. No others. None have rounded corners.

| Variant | Style |
|---|---|
| Primary | `bg: --t1; color: --bg; padding: 8px 18px; border: none; font: IBM Plex Sans 12px uppercase letter-spacing 0.04em weight 500` |
| Secondary | `bg: transparent; color: --t1; padding: 8px 18px; border: 0.5px solid --border; font: same as primary` |
| Ghost / text link | `bg: transparent; color: --t2; underline 1px offset 2px; font: same as primary` |

### Filter chip

```
font: IBM Plex Sans 11px uppercase letter-spacing 0.04em, weight 500;
padding: 3px 14px;
inactive: border 1px solid var(--border), background transparent, color var(--t2);
active:   border 1px solid var(--t1),     background var(--t1), color var(--bg);
```

### Modal / overlay

```
backdrop: rgba(28,26,20,0.7) + backdrop-filter: blur(2px)  /* --t1 at 70% */
panel:    same as hairline card, max-width 640px
shadow:   0 10px 32px rgba(28,26,20,0.18)
header:   separated from body by 1px solid var(--border)
close:    ghost variant with X icon, top-right
```

---

## Logo usage

The system has two marks. The masthead is the default; the SVG mark is reserved for technical contexts where a square containing mark is structurally required.

### Typographic masthead (primary)

Rendered by `components/NewspaperHeader.tsx` as `THE CLIMATE NARRATIVE REVIEW` in Playfair Display, uppercase, letter-spacing 0.05em, with the italic Playfair tagline beneath. Used in the global sticky header and any large-format brand placement (cover images, print exports, hero banners). This is the dominant brand expression.

### SVG square mark (secondary, technical only)

A dark-green rounded rectangle containing a stack of horizontal bars and an inset red circle with a clock-hand detail. The mark lives in **`components/Logo.tsx`** as a reusable component accepting a `size` prop (default 42):

```tsx
<Logo size={44} />
```

Use **exclusively** in:

- Favicon and Open Graph preview *(deferred — see Follow-up work)*
- Mobile navigation, when the header is too narrow for the full masthead
- Any compact card or chip needing a contained brand presence
- The About page mission block (current consumer)

Palette requirements — the component uses tokens, not hex:

| Element | Color |
|---|---|
| Outer rounded rectangle | `--green` |
| Horizontal bars | `--bg` (warm off-white, not pure `#fff`) |
| Inset circle | `--red` |
| Clock-hand stroke | `--bg` |

The mark previously encoded `#2D6A4F` and `#C8392B` directly — both off-palette. As of this design pass it uses `--green` / `--red` / `--bg` via inline `style` (SVG presentation attributes do not reliably accept `var()` across all engines).

Reproduce at any square size; do not stretch. The 11px corner radius (`rx="11"`) is preserved because the mark is a logo, not a UI surface — the only carve-out from the "no rounded corners" rule.

The SVG mark will be retired in a future pass once a purpose-built small-format monogram replaces it. Until then, keep both marks documented and consistent.

### Sticky header behavior and size variants

`components/NewspaperHeader.tsx` is the global header on every page. Collapsible masthead on scroll, fixed-attachment texture sync via inline scroll handler.

The component renders one of two expanded-state variants based on `usePathname()`:

| Variant | Pathname | Layout | Wordmark size |
|---|---|---|---|
| Hero | `/` (home only) | Stacked: utility metadata row (date / desk) above a centered, dedicated wordmark row | Playfair Display SC 80px, lh 1.0 |
| Compact | every other page | Side-by-side: date on the left, centered wordmark, desk label on the right | Playfair Display SC 29px, lh 39px |

Both variants share the same nav strip, the same hairline rules, and the same collapse-on-scroll behavior. Both collapse to the same stuck state (nav strip only) once scrolled past `COLLAPSE_AT` (160px); both expand back when scrolled to the top or hovered. The collapsible block's `MAX_HEIGHT` is unified at 280px to accommodate either variant's expanded height.

The hero variant exists so the home page wordmark is the largest type on the page — the dominant brand expression on the front page of the Review. On every other page, the masthead is sticky chrome supporting the page's content, not the headline event itself; hence the compact size.

---

## Home page layout

The home page (`app/page.tsx`) is the front page of the Review. It is structured to fit within a single 1440×900 viewport without scroll, with vertical structure mirroring a printed broadsheet front page.

### Vertical structure

| Block | Height | Content |
|---|---|---|
| `NewspaperHeader` (hero variant) | ~195px | Date / desk metadata row, 80px Playfair Display SC wordmark, italic tagline, nav strip, hairline rules |
| Hero pair | 240px | Two columns: `TypingGreeting` "Welcome, [role]" at 56px Playfair Display on the left; lead paragraph (20px Source Serif 4 weight 400) and body paragraph (16px Source Serif 4 weight 300) on the right |
| Stats ticker | ~36px | Section-rule-bounded horizontal marquee of editorial keywords. Acts as the section divider between hero pair and editions. |
| Four-up teaser grid | 320px | Four equal-width edition columns, separated by 1px `var(--t1)` section rules. Each column previews one edition of the Review. |

Total content height: ~791px. Designed to fit a 780–820px usable area (1440×900 minus browser chrome).

### Edition teaser column pattern

Each column in the four-up grid is an `EditionTeaser`, structured top-to-bottom as:

1. **Edition label** — IBM Plex Sans 11px uppercase letter-spacing 0.04em, `var(--t2)`. E.g. "Edition I", "Special Edition".
2. **Edition number** — Playfair Display, large (56px for `01`/`02`/`03` regular; 28px boxed for `Special`). Hover lifts via `-translate-y-1`.
3. **Title** — Playfair Display 24px (italic for Editions I and II per their existing typographic identity).
4. **Description** — Source Serif 4 13px / lh 18, 1–2 lines, `var(--t2)`.
5. **Hairline divider** — 1px `var(--border)`.
6. **Teaser content** — flexible-height area for a per-edition preview (~120px).
7. **CTA** — IBM Plex Sans 11px uppercase letter-spacing 0.04em with a hover-revealed arrow.

The entire column is wrapped in a `<Link>` so the whole column is clickable.

### Placeholder teaser content

Each edition currently ships **explicit placeholder** teaser content. The structure is real; the text is obviously fake so that any pre-launch screenshots aren't mistaken for production copy. Real teaser content replaces the placeholders in a follow-up PR.

| Edition | Placeholder shape |
|---|---|
| Dashboard (01) | 4-bar SVG mini chart in palette colors + Playfair "+12pp" stat overlay + "Sector coverage placeholder" Plex label |
| The Reader (02) | "Headline placeholder" Playfair line + "Byline placeholder · 2026" Plex caption + Source Serif italic "Excerpt placeholder…" |
| Discrepancy desk (03) | Three "Outlet A / B / C" entries, each with an 8×8px palette-color frame swatch (squares, not dots — no `border-radius`) |
| About us (Special) | Source Serif italic "Quote placeholder…" with a 2px `var(--t1)` left rule, "— Attribution placeholder" credit in Plex uppercase |

### Responsive

- **Desktop @ ≥ 1280px (xl)**: layout as documented above. Single viewport at 1440×900.
- **Tablet @ 768–1279px (md to xl)**: four-up grid reflows to 2×2. Hero pair reflows to single column under `lg` (1024px). Page scrolls vertically.
- **Mobile @ < 768px**: grid stacks 1-column; hero pair stacks 1-column. Page scrolls naturally. Not optimized for this viewport range; the goal is graceful stacking.

### Retired from the home page

The restructure removed the following elements (each can return if the design moves to a multi-page-scroll model):

- The previous home-page **sub-strip** ("LIMITED EDITION · THE READING ROOM" / "UPDATED HH:MM CET") — folded conceptually into the masthead's utility row.
- The previous **"The index — four editions of the Climate Narrative Review"** section heading — the four-up grid is self-explanatory; broadsheets do not label their front-page index.
- The previous **footer breadcrumb** ("The Climate Narrative Review · Home" / "Limited Edition") — redundant in a single-viewport layout.
- The previous **asymmetric edition layout** (deliberate 310/240 height offset between the two columns of the old 2×2 grid) — replaced by uniform equal-width columns. The "asymmetry-is-the-feature" intent is retired.

The hero is **monochrome on paper** (zero red, zero green above the ticker) by design. The color signal lives in the four-up teaser previews, not the hero pair.

---

## Texture

Background uses `public/crumpled.png` blended at 18% opacity (`rgba(242,237,227, 0.82)` overlay) over `--bg`, creating a subtle paper grain.

| Class | Behavior | Used by |
|---|---|---|
| `body::before` | Scrolls with content | Main pages |
| `.paper` | Fixed-attachment, JS-synced background-position | `NewspaperHeader.tsx` |

**Texture applies to the page background only.** Cards, broadsheet sections, modals, and tooltips use **solid `--bg`** so text remains legible. The texture lives at the page level, not the component level.

---

## Conventions reference

For any surface not covered by a pattern above, the canonical example is **`app/overview/page.tsx`** — the page this design system was written from and against.

---

## Follow-up work (out of scope for this pass)

These items are explicitly deferred. They are listed here so they don't drift out of memory.

### Brand assets

- **Favicon regeneration.** `app/favicon.ico` is currently a generic icon unrelated to the SVG mark. Regenerate from the recolored `components/Logo.tsx` so the favicon reflects palette colors.
- **`app/icon.tsx`.** Optional dynamic icon route — would let the favicon track the SVG mark automatically. Adds a Next.js 16 feature.
- **`app/opengraph-image.tsx`.** No social-share preview image exists. Add one rendering the masthead + tagline + Logo so links shared from the Review carry brand.
- **Purpose-built small-format monogram.** Replace the current SVG mark with a dedicated mark designed for favicon and small-format use. When this lands, the SVG mark is retired and this section of DESIGN.md collapses.

### Page rebuilds (broadsheet conformance)

These pages still ship generic SaaS-style chrome (`rounded-xl`, `shadow`, Tailwind neutrals, white card backgrounds). Each is a separate follow-up PR; this design system describes the target state they will be rebuilt against.

- `app/article/[id]/page.tsx` — card-style analysis panels → broadsheet sections and hairline cards. Risk badge tier styles to match new spec.
- `app/upload/page.tsx` — dashed-border dropzone, mode toggle, results cards → broadsheet sections. Off-palette green tints (`rgba(45,106,79,*)`) → palette tokens.
- `app/newspapers/page.tsx` — entire chart grid is off-system. Rebuild to broadsheet sections, swap 15-color `OUTLET_PALETTE` for the 5-color outlet sequence documented here, retire the `getOutletStats` Tailwind text classes.
- `app/about/page.tsx` — mission/team cards → broadsheet sections. (The inline Logo SVG is already migrated to `components/Logo.tsx` in this pass.)
- `app/search/page.tsx` — rebuild `NewsItem` card to broadsheet pattern. Align `FRAME_COLORS` to the canonical Frame chart mapping documented above. After the palette-enforcement pass, `FRAME_COLORS` is in an intermediate state — palette-pure but mostly non-canonical:

  | Frame | Current (intermediate) | Canonical (target) | Status |
  |---|---|---|---|
  | Attribution of Responsibility | `var(--green)` | `var(--red)` | needs correction |
  | Human Interest | `var(--green-d)` | `var(--green)` | needs correction (`--green-d` was picked to avoid a collision with Economic Consequences after the palette-pure swap of the original off-palette `#7A9A6A`) |
  | Conflict | `var(--red)` | `var(--red-m)` | needs correction |
  | Morality | `#7C3AED` | `#7C3AED` | **already on canonical** (picked over a non-canonical token to avoid semantic overload with `var(--t2)` and to avoid creating a new collision; the canonical hex is also the only palette-legal option with no semantic conflict elsewhere) |
  | Economic Consequences | `var(--green-m)` | `#EF9F27` | needs correction |

  Four frames remain to be corrected; the inline `TODO` in `app/search/page.tsx` reflects this state.

### `components/MisinfoBar.tsx`

The component is orphaned (no importer found) and ships full Tailwind palette (`bg-emerald-400`, etc.). Confirm it is dead, then delete; or rebuild against this system if a future surface needs it.

### Tone-of-rules pass

After the palette-enforcement pass, mid-tone borders (`#616161`, now `var(--t2)`) are still used as hairline dividers in `components/NewspaperHeader.tsx` (masthead and nav-strip rules, both in the hero and compact variants). The borders & rules table in this document prescribes `var(--border)` (hairline) or `var(--t1)` (section rule / heavy rule) but not `var(--t2)`. A future pass should decide, per surface, whether each currently-`var(--t2)` divider should become a true hairline (`var(--border)`, lighter and softer) or a section rule (`var(--t1)`, darker and more emphatic). This is a visual-design decision, not a token swap, and was deferred from the palette-enforcement pass. The home page itself no longer carries any `var(--t2)` rules — the restructure replaced its dividers with proper section rules (`var(--t1)`).

### Page padding normalization

Both `app/page.tsx` and `components/NewspaperHeader.tsx` use `px-11` (44px) instead of the `px-12` (48px) prescribed by the *Page frame* table. Changing either in isolation would misalign the masthead with page content; site-wide normalization (every page-level container plus the masthead) belongs in a single pass to keep the change atomic.

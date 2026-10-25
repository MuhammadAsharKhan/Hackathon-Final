# S.M.I.T-Lite design system

The product is **S.M.I.T-Lite**. Never write "HCM". This file is the source of
truth for colour, type, spacing, radii, elevation and motion. Tokens live in two
places only: the CSS variables in `client/src/index.css` and the mapping in
`client/tailwind.config.js`. Components reference tokens; they never hard-code a
colour, radius or shadow.

## The idea

The S.M.I.T mark is stacked horizontal bars with one green square. That bar motif
is the structure of the whole product: the three-bar loader, the active-item bar
in the sidebar, meters and progress, step indicators, and the large composition on
the sign-in screen. It is used deliberately, never as wallpaper.

## Colour

| Token | Value | Used for |
| --- | --- | --- |
| `ink` | `#07111F` | Sidebar, auth panel, dark surfaces, tooltips |
| `ink-2` | `#0E1B2E` | Dark surface, second step |
| `ink-3` | `#162842` | Dark surface, third step, check-out button |
| `blue` | `#1C74EF` | Primary action, focus, links |
| `blue-600` | `#1763D6` | Primary hover, gradient end |
| `blue-700` | `#0F4FC4` | Pressed, blue text on light tints |
| `blue-400` | `#4B94FF` | Icons on dark, highlight on ink |
| `blue-100` | `#E6F0FF` | Selected row tint |
| `blue-50` | `#F2F7FF` | Hover tint, info surface |
| `lime` | `#88C443` | Accent, the mark's square, success glow |
| `lime-700` | `#46781A` | Success text on lime tint |
| `lime-50` | `#EFF8E2` | Success tint |
| `mist` | `#F3F6FB` | App background |
| `surface` | `#FFFFFF` | Cards, panels, tables |
| `line` | `#E3E9F3` | UI borders |
| `line-soft` | `#EEF2F8` | Row and section hairlines inside a surface |
| `text` | `#0B1626` | Primary text |
| `text-2` | `#3B4A60` | Secondary text |
| `muted` | `#5D6C82` | Labels, hints, metadata |

Status pairs are always ink on tint, never tint on tint:

| Status | Ink | Tint |
| --- | --- | --- |
| amber | `#B45309` | `#FFF3DC` |
| rose | `#BE123C` | `#FFE8EE` |
| violet | `#6D28D9` | `#F0EAFF` |
| slate | `#475569` | `#EEF2F7` |

### Gradients

Only these three exist. No decorative gradients, no purple or pink.

```css
--brand-gradient: linear-gradient(180deg, #3A8BFF 0%, #1C74EF 52%, #1763D6 100%);
--ink-gradient:   linear-gradient(160deg, #0B1B33 0%, #07111F 60%);
--hero-gradient:  linear-gradient(120deg, #0F4FC4 0%, #1C74EF 55%, #2F8CFF 100%);
```

## Type

- **Plus Jakarta Sans Variable** — headings, navigation, buttons, big numbers.
  Weights 600 to 800. Tracking `-0.02em` on headings, `-0.03em` above 32px.
- **Inter Variable** — body text and tables, 13.5 to 15px.

Scale: 12.5, 13.5, 15, 17, 20, 24, 30, 40, 52. Line length stays under 70
characters in prose. Every number and money value uses tabular figures.

## Spacing, radius, elevation

Spacing is a 4px grid: 4, 8, 12, 16, 20, 24, 32, 40, 56.

| Radius token | Value | Applies to |
| --- | --- | --- |
| `small` | 8px | Small chips, inline blocks |
| `control` | 12px | Buttons, inputs, selects |
| `card` | 20px | Cards, surfaces |
| `modal` | 24px | Modals, sheets, drawers |
| `pill` | 999px | Pills, badges, meters |

Elevation uses a blue-tinted shadow colour, `rgba(12, 38, 92, a)`:

| Token | Value |
| --- | --- |
| `e1` | `0 1px 2px rgba(12,38,92,.06)` |
| `e2` | `0 4px 14px -2px rgba(12,38,92,.08), 0 1px 3px rgba(12,38,92,.05)` |
| `e3` | `0 14px 34px -8px rgba(12,38,92,.16), 0 3px 8px rgba(12,38,92,.06)` |
| `e4` | `0 28px 64px -12px rgba(12,38,92,.28)` |

Cards have **no visible border**. They separate from mist through `e1` or `e2`
and spacing. Hairlines (`line-soft`) divide rows and sections inside a surface.

## Motion

Easing `cubic-bezier(.2,.8,.2,1)`. Fast 120ms (hover, press), base 200ms (open,
select), slow 320ms (drawers, step changes).

Motion is allowed only for:

1. The **one orchestrated moment per page type** — the sign-in mark assembling
   (1.1s), the dashboard greeting rising with the watermark (400ms), step
   changes in setup.
2. **Responses to the user's own action** — hover, press, open, close, select,
   tab change, toast, loading.

Animate only `transform` and `opacity`, plus `box-shadow` on buttons. No fade-up
reveals on every section, no scroll reveals, no hover lift on every card.

Under `prefers-reduced-motion: reduce` every animation and transition is cut to
0.01ms and the orchestrated moments render in their final state.

## Focus, selection, scrollbars

- Focus ring: `0 0 0 3px rgba(28,116,239,.35)`, 2px offset.
- Selection: `rgba(28,116,239,.22)`.
- Scrollbars: 8px, thumb `#C9D5E8`, hover `#AFC0DA`.

## Writing rules

- Sentence case everywhere. No ALL-CAPS labels or eyebrows above headings.
- No emoji. Icons come from `lucide-react` only, at 16, 18 or 20px.
- No arrow characters on buttons or links. No accenting one word of a headline.
- No numbered markers unless the content is a real sequence.
- Button labels say exactly what they do: "Save changes", "Create workspace".
- Errors say what happened and how to fix it.
- The product name is S.M.I.T-Lite, and the wordmark is live text, not an image.

## Quality floor

- Contrast at least 4.5:1 for text, 3:1 for UI borders and icons.
- Visible keyboard focus everywhere; tap targets at least 40px.
- Works from 375px to 1536px with no horizontal page scroll.
- No layout shift when fonts load or data arrives; reserve space with skeletons.

## Brand assets

`client/public/brand/` holds `smit-mark.svg` (blue), `smit-mark-light.svg`
(white, for dark backgrounds), `favicon.svg`, `favicon-32.png`,
`apple-touch-icon.png` and `icon-512.png`. `logo-original-smit-hcm.png` is not
used in the UI because it shows the old name.

## Components

- `brand/Logo` — the mark plus the live wordmark. `variant` full or mark, `tone`
  dark or light, `size` sm, md or lg.
- `brand/BarsLoader` — the three bars growing in turn with the green square
  blinking. Used by `Spinner`, `PageLoading` and button loading.

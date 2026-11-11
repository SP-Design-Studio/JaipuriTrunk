# Images

Everything under `/public` is deployed, so keep only what the site loads here. Original
artwork lives in `design-sources/` (see its README); the stickers below are cut from it.

Export photographs as **WebP** (quality about 80) and keep the longest edge near what
the site shows: anything larger is wasted bytes.

## What is here

| Folder | Holds | Used by |
|---|---|---|
| `brand/` | `monogram.svg`, `wordmark.svg`: the supplied logos | `src/components/Logo.tsx` (the artwork is inlined there; the 3D lock is extruded from the monogram's paths) |
| `products/` | One die-cut sticker per photographed piece | The collection stage (`src/lib/products.ts`) and the 3D trunk's contents |
| `craft/` | Three stickers of hands at work | `src/components/sections/Craft.tsx` |
| `atmosphere/` | `hawa-mahal-sticker`, `charminar`, `trunk` stickers | `Route.tsx`, `HawaMahal.tsx`, `Charminar.tsx` |
| `texture/` | `grain-dark.png`, `grain-light.png`: pre-baked paper grain tiles | `.u-grain` and the paper card, in `globals.css` |
| `stall/<trunk>/` | Photographs from the stall | The "See the stall" gallery, listed in `src/lib/trunks.ts` |

The site checks which images actually exist (`src/lib/assets.ts`), so a listed file that
is missing is skipped rather than breaking the page.

## Products

Each piece is a cut-out PNG in `design-sources/products/`, turned into a sticker (a
cream torn-paper border) by `scripts/cutout.mjs`. To add one:

```bash
cp ~/path/to/New-Product.png design-sources/products/
node scripts/cutout.mjs design-sources/products/New-Product.png \
  public/images/products/new-product --scale=2 --border=26 --ragged=0.5 --alpha=keep
```

Then add it to `src/lib/products.ts` with its `src`. Items without a `src` still appear
in the written lists; they just have no photograph on the card yet (currently Khussa
shoes and Sling bags).

- Keep the border near **3.4% of the output width** so the stickers read as one set.
- The paper colour is a warm cream (`--paper=#fdf6ea`), the default. A white sticker
  would stand out immediately.
- **Name the output in lowercase and never the same as the source.** macOS is
  case-insensitive: writing `jhumkas.png` next to `Jhumkas.png` overwrites the original.
- `chandbalis` and `drop-motif-earrings` came in small (about 245 px across), so they are
  a little softer up close than the rest. Re-exporting the sources at about 1000 px and
  re-cutting is the whole fix.
- The 3D trunk packs each piece onto `RESTS[index % RESTS.length]` in
  `src/components/three/TrunkScene.tsx`, so keep at least as many rests as photographed
  products.

## Stall photographs

Put the files in `public/images/stall/<slug>/` and list them (with their pixel size) in
that trunk's `photos` in `src/lib/trunks.ts`. They are shown uncropped, in their own shape.

## Atmosphere stickers

`HawaMahal.tsx` and `Charminar.tsx` each hard-code the sticker's natural width and
height. **Re-cutting changes the output's pixel size** (the border pads it), so update
those numbers after any re-cut or the aspect ratio will be slightly wrong. The recipes
for the three atmosphere stickers are in `design-sources/README.md`.

## `scripts/cutout.mjs` flags

| Flag | Default | Effect |
|---|---|---|
| `--tol` | 240 | Pixels at or above this on all channels count as background |
| `--scale` | 2 | Upscale factor |
| `--border` | 34 | Sticker border thickness in output pixels; `0` disables it |
| `--ragged` | 0.55 | `0` is a clean offset outline, `1` a heavily torn paper edge |
| `--alpha` | auto | `keep` uses the file's own alpha, `key` flood-fills white, `auto` picks |
| `--paper` | `#fdf6ea` | The border colour |
| `--tone` | none | A reference image whose luminance and chroma the cut is matched to |

It flood-fills inward from the image border (so white detail inside the subject
survives), pads the canvas so the border has room, then writes `.png` and `.webp` with a
real alpha channel.

## Sourcing new photographs

Use **Unsplash** or **Pexels** (both allow commercial use without attribution), or your
own. Do not pull from Pinterest: it hosts third-party work with no licence grant.

## Fonts

The Seasons (Light and Regular) is in `public/fonts/the-seasons/`, loaded in
`src/lib/fonts.ts`. Check its licence covers web embedding. The unused `Shivaraja.ttf`
from the earlier design is kept in `design-sources/fonts/`, off the public site.

The site ships without audio, by choice.

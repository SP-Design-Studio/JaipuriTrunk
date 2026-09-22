# Image manifest

Drop files at the exact paths below. Every slot has a designed fallback, so the
site never breaks on a missing file — it just gets better as you fill them in.

Export everything as **WebP** (quality 82) unless noted. Keep the longest edge
at the "max px" figure; anything larger is wasted bytes.

---

## 1. Product photography — `/public/images/products/`

All seven are **done**: supplied by you, cut into die-cut stickers with a white
torn-paper edge by `scripts/cutout.mjs`, and already wired into the Act 2 rail
and the Act 4 trunk. Originals are preserved in `design-sources/products/`.

| Sticker (used by the site) | From your file | Size | Category |
|---|---|---|---|
| `leather-juttis.webp` | `Leather-Jhuttis.png` | 36 KB | Jaipuri juttis |
| `embroidered-juttis.webp` | `Embroidered-Shoes.png` | 67 KB | Jaipuri juttis |
| `jhumkas.webp` | `Jhumkas.png` | 50 KB | Statement oxidised jewellery |
| `enamel-oxidised-earrings.webp` | `Enamel-Oxidized-Earrings.png` | 95 KB | Statement oxidised jewellery |
| `khadas.webp` | `Khadas.png` | 57 KB | Statement oxidised jewellery |
| `chandbalis.webp` | `chandbalis.png` | 57 KB | Statement oxidised jewellery |
| `drop-motif-earrings.webp` | `drop-motif-earrings.png` | 45 KB | Statement oxidised jewellery |
| `quilted-handbags.webp` | `Quilted-Bags.png` | 123 KB | Quilted Jaipur bags |
| `quilted-pouches.webp` | `Quilted-Pouches.png` | 98 KB | Quilted Jaipur bags |

### Still to photograph

These are listed on the site but have no card in the rail until a photo exists.
Drop a cut-out PNG into `design-sources/products/`, cut it (below), and set the
matching `src` in `src/lib/products.ts`.

| Expected filename | Item |
|---|---|
| `khussa-shoes.webp` | Khussa shoes |
| `sling-bags.webp` | Sling bags |

> **Re-shoot the two earrings when you can.** `chandbalis.png` and
> `drop-motif-earrings.png` arrived already cut out but only ~245px across,
> where every other source is 550–1200px. They were cut at `--scale=3` rather
> than the usual 2 so the shipped file is ~850px and the browser is not
> stretching a thumbnail across an 800px card — but upscaling invents no
> detail, so they stay slightly softer than their neighbours up close.
> Re-exporting the sources at ~1000px wide and re-running the cut is the whole
> fix; nothing else needs changing.

> **One rest position per photographed product.** `RESTS` in
> `src/components/three/TrunkScene.tsx` must have at least as many entries as
> there are photographed items — the trunk packs with `RESTS[index % length]`,
> so a tenth product with nine rests would drop onto the first one.

### Cutting a new product sticker

```bash
cp ~/path/to/New-Product.png design-sources/products/
node scripts/cutout.mjs design-sources/products/New-Product.png \
  public/images/products/new-product --scale=2 --border=26 --ragged=0.5 --alpha=keep
```

Keep the border near **3.4% of the output width** so all the stickers read as
one set — that is what the existing nine measure.

The paper is a warm cream, `--paper=#fdf6ea`, not white. It is the default, so
a plain re-cut picks it up; pass `--paper=#ffffff` only if you deliberately
want the old stark look. Every sticker on the site was re-cut when this
changed — products, craft and atmosphere — because the colour is baked into
the file and a single white one stands out immediately.

> **Re-cutting an atmosphere sticker changes its pixel dimensions**, and
> `HawaMahal.tsx` / `Charminar.tsx` each hard-code a `NATURAL` width and height
> plus the measured transparent top margin used to position the artwork. Update
> both after any re-cut or the aspect ratio will be subtly wrong.

> **Name the output in lowercase and never the same as the source.** macOS is
> case-insensitive, so writing `jhumkas.png` next to `Jhumkas.png` silently
> overwrites the original. Copy sources into `design-sources/products/` first.

## 2. Craft — `/public/images/craft/`

Hands at work, used in Act 3. Cut as stickers the same way as the products.

| Sticker (used by the site) | From your file | Size |
|---|---|---|
| `craft-hands-1-sticker.webp` | `craft-hands-1.png` | 110 KB |
| `craft-hands-2-sticker.webp` | `craft-hands-2.png` | 39 KB |
| `craft-hands-3-sticker.webp` | `craft-hands-3.png` | 79 KB |

Originals are preserved in `design-sources/craft/`.

## 3. Atmosphere — `/public/images/atmosphere/`

Source these from **Unsplash** or **Pexels** only. Both licenses permit
commercial use with no attribution required. Search terms given.

| File | Ratio | Max px | Search | Used in |
|---|---|---|---|---|
| `hawa-mahal-sticker.webp` | as supplied | — | **Done** — photographic cut-out, cut as a sticker (571 KB) | Act 1 hero |
| `bazaar-street.webp` | 16:9 | 2000 | "Johari Bazaar Jaipur" / "Jaipur market street" | Act 2 background wash |
| `artisan-hands.webp` | 3:2 | 1600 | "Indian artisan hands craft" / "block printing hands" | Act 3 hero |
| `block-print-cloth.webp` | 1:1 | 1400 | "Sanganeri block print textile" | Act 3 texture panel |
| `charminar.webp` | as supplied | — | **Done** — photographic cut-out, cut as a sticker (265 KB) | Act 5 arrival |

> **Do not** pull these from Pinterest. Pinterest hosts third-party copyrighted
> work with no license grant — using it on a commercial storefront is real
> exposure, not a technicality. Use Pinterest as a moodboard, then find the
> equivalent shot on Unsplash/Pexels.

---

## 4. Fonts — `/public/fonts/`

| File | Status |
|---|---|
| `Shivaraja.ttf` | **Installed.** Drives "Jaipuri" in the logotype, self-hosted via `next/font/local`. Confirm the license permits commercial web embedding before you ship. |

## Re-cutting the sticker

If you swap in a new illustration that has a flat white background:

```bash
node scripts/cutout.mjs <input.png> public/images/atmosphere/hawa-mahal-watercolor --scale=2 --border=34 --ragged=0.55
```

| Flag | Default | Effect |
|---|---|---|
| `--tol` | 240 | Pixels at/above this on all channels count as background |
| `--scale` | 2 | Upscale factor (lanczos3 + unsharp) |
| `--border` | 34 | White sticker border thickness in output px; `0` disables it |
| `--ragged` | 0.55 | `0` = clean offset outline, `1` = heavily torn paper edge |
| `--alpha` | auto | `keep` uses the file's own alpha, `key` flood-fills white, `auto` picks |
| `--tone` | – | Path to a reference image; matches its luminance mean/spread and chroma level so a hard flat-vector illustration reads like a soft painterly one. Hue is preserved, so the subject keeps its own colour. |

It flood-fills inward from the image border (so white detail *inside* the
subject survives), pads the canvas so the border has room instead of clipping,
then writes `.png` and `.webp` with a real alpha channel.

> **Resolution note:** the source artwork is 678x583. `--scale=2` resamples it
> to 1472x1282, which beats the browser's own stretching and serves Retina, but
> it recovers no detail that was never there. A genuinely larger original would
> still look better.

> **If you replace an asset**, re-measure its opaque bounds — `HawaMahalArt.tsx`
> and `CharminarArt.tsx` tune their offsets against the sticker's transparent
> margins (14.3% top / 0.9% bottom for the Hawa Mahal, 7.0% / 0.5% for the
> Charminar).

## Unused files still in /public

Both acts are photographic now, so these are no longer referenced but are kept
on disk. Note that **everything under `/public` is deployed**, so these ship to
visitors as dead weight until removed:

| File | Size |
|---|---|
| `hawa-mahal-watercolor.png` / `.webp` | 1.4 MB / 183 KB — the earlier pastel illustration |
| `hawa-mahal.png` | 1.2 MB — your un-cut source (a copy is in `design-sources/`) |
| `charminar.png`, `hawa-mahal-sticker.png` | 1.8 MB / 4.6 MB — PNG twins of the WebPs the page actually loads |

> **Keep your originals** in `design-sources/`. The sticker border is baked into
> the output, so re-cutting with a different border needs the unprocessed file.
> The Charminar source is now saved there; the Hawa Mahal illustration source is
> still missing.

## 5. Audio — none

The site ships silent by deliberate choice. No ambient loop, no sound toggle —
nothing to source or license here.

`src/components/SoundToggle.tsx` and the empty `/public/audio/` directory are
still on disk but are no longer imported anywhere. Delete both if you are sure
the decision is final; restoring the toggle otherwise means re-adding the one
line in `src/components/Experience.tsx`.

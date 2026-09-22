# Design sources

Original, un-processed artwork lives here — the inputs to `scripts/cutout.mjs`.

**Keep these files.** Once a sticker has been cut, its white border is baked
into the output, so you cannot re-cut it with a different `--border` or
`--ragged` value from the processed asset — you need the original again.

Expected files:

| File | Feeds | Status |
|---|---|---|
| `Charminar.png` | `public/images/atmosphere/charminar.webp` | Present — 2057x2392 photo cut-out with alpha |
| `Hawa-Mahal-photo.jpeg` | *unused* | Present — 3345x2509 photograph, kept in case the hero goes photographic |
| `Hawa-Mahal-cutout.png` | `public/images/atmosphere/hawa-mahal-sticker.webp` | Present — 926x631 photo cut-out with alpha, sky already keyed |
| `Hawa-Mahal.png` | *unused* | Missing — the original pastel illustration, no longer used by the site |
| `trunk.png` | `public/images/atmosphere/trunk.webp` | Present — 736x736 watercolour with alpha |

With both present, either sticker can be regenerated from scratch:

```bash
node scripts/cutout.mjs design-sources/Hawa-Mahal-cutout.png public/images/atmosphere/hawa-mahal-sticker --scale=2 --border=38 --ragged=0.5 --alpha=keep
node scripts/cutout.mjs design-sources/Charminar.png public/images/atmosphere/charminar --scale=0.5 --border=23 --ragged=0.5 --alpha=keep
```

The trunk needs one extra step. Its source carries a wide transparent margin,
and `cutout.mjs` borders the canvas rather than the subject — left alone it
produced an 886x886 frame with the trunk floating in the middle of it. Crop to
the opaque bounds first:

```bash
node -e "require('sharp')('design-sources/trunk.png').extract({left:14,top:77,width:704,height:606}).png().toFile('/tmp/trunk-trimmed.png')"
node scripts/cutout.mjs /tmp/trunk-trimmed.png public/images/atmosphere/trunk --scale=1 --border=56 --ragged=0.5 --alpha=keep
```

`--border=56` is larger than the buildings' in absolute pixels but matches them
on screen, because the trunk renders at roughly a fifth of their size. The
pre-sticker version is kept at `retired-public/trunk-no-border.webp`.

Note that re-cutting changes the output's aspect ratio — the border pads it —
so `JourneyThread.tsx` hard-codes `aspect-[896/798]` and must be updated to
match whatever the new file measures.

These are build inputs, not shipped assets — nothing here is served to visitors.

**Save new artwork straight into this folder, not `~/Downloads`.** Files placed
in Downloads on this machine have repeatedly disappeared within seconds.

/**
 * Turns a flat white background into a die-cut sticker with a torn-paper border.
 *
 *   node scripts/cutout.mjs <input> <output-basename> [options]
 *
 *   --alpha=auto   auto | keep | key. "keep" uses the file's own alpha channel,
 *                  "key" flood-fills the white background, "auto" picks whichever
 *                  fits (a file already carrying real transparency keeps it).
 *   --tol=240      pixels at/above this on all channels count as background
 *   --scale=2      upscale factor (lanczos3 + unsharp; recovers no real detail,
 *                  but beats the browser's bilinear stretch and serves Retina)
 *   --border=34    sticker border thickness in output pixels, 0 to disable
 *   --ragged=0.55  0 = clean offset outline, 1 = heavily torn paper edge
 *   --paper=#fdf6ea the sticker's paper colour, behind and around the subject.
 *                  Warm cream rather than pure white: white was the only thing
 *                  on the page brighter than the cream ground, which made every
 *                  cut-out read as a print-out laid on the design instead of a
 *                  piece of the same paper.
 *   --tone=<file>  match this reference's tonal treatment: its mean/spread of
 *                  luminance and its chroma level, so a hard flat-vector
 *                  illustration reads like a soft painterly one. Hue is
 *                  preserved, so the subject keeps its own colour.
 *
 * The background is flood-filled inward from the image border rather than
 * thresholded globally, so white detail *inside* the subject survives.
 */
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const [, , input, outBase, ...rest] = process.argv;
if (!input || !outBase) {
  console.error("usage: node scripts/cutout.mjs <input> <output-basename> [--tol= --scale= --border= --ragged= --paper=]");
  process.exit(1);
}
const opt = (name, fallback) => {
  const hit = rest.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : fallback;
};
const TOL = opt("tol", 240);
const ALPHA_MODE = (rest.find((a) => a.startsWith("--alpha="))?.split("=")[1] ?? "auto");
const TONE_REF = rest.find((a) => a.startsWith("--tone="))?.split("=")[1];
const SCALE = opt("scale", 2);
const BORDER = opt("border", 34);
const RAGGED = opt("ragged", 0.55);

/** Sticker paper. Warm cream by default; pass --paper=#ffffff for the old look. */
const PAPER_HEX = rest.find((a) => a.startsWith("--paper="))?.split("=")[1] ?? "#fdf6ea";
const PAPER = [1, 3, 5].map((i) => parseInt(PAPER_HEX.slice(i, i + 2), 16));
if (PAPER.some(Number.isNaN)) {
  console.error(`--paper must be a #rrggbb hex colour, got "${PAPER_HEX}"`);
  process.exit(1);
}

/* ---------- 1. establish the subject mask at native resolution ---------- */

const src = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w0, height: h0 } = src.info;
const c = 3;

// Straight RGB, with anything already transparent flattened to white so it can
// never bleed dark pixels into the sticker border.
const data = Buffer.alloc(w0 * h0 * 3);
const ownAlpha = Buffer.alloc(w0 * h0);
let alreadyTransparent = 0;
for (let i = 0; i < w0 * h0; i++) {
  const s = i * 4;
  const a = src.data[s + 3];
  ownAlpha[i] = a;
  if (a < 10) alreadyTransparent++;
  const k = a / 255;
  data[i * 3] = Math.round(src.data[s] * k + 255 * (1 - k));
  data[i * 3 + 1] = Math.round(src.data[s + 1] * k + 255 * (1 - k));
  data[i * 3 + 2] = Math.round(src.data[s + 2] * k + 255 * (1 - k));
}

/* ---------- 1b. optional tonal match against a reference illustration ------- */

const LUMA = [0.2126, 0.7152, 0.0722];
const luma = (r, g, b) => LUMA[0] * r + LUMA[1] * g + LUMA[2] * b;

/**
 * Mean/sd of luminance and mean chroma over the artwork only: transparent
 * pixels and the near-white sticker border are both excluded, since including
 * a border would skew the measurement by however thick it happens to be.
 */
function toneStats(rgb, alpha, count) {
  let n = 0;
  let sum = 0;
  let sum2 = 0;
  let chroma = 0;
  for (let i = 0; i < count; i++) {
    if (alpha[i] < 200) continue;
    const o = i * 3;
    if (rgb[o] > 246 && rgb[o + 1] > 246 && rgb[o + 2] > 246) continue;
    const r = rgb[o];
    const g = rgb[o + 1];
    const b = rgb[o + 2];
    const L = luma(r, g, b);
    n++;
    sum += L;
    sum2 += L * L;
    chroma += (Math.abs(r - L) + Math.abs(g - L) + Math.abs(b - L)) / 3;
  }
  const mean = sum / n;
  return { mean, sd: Math.sqrt(Math.max(1, sum2 / n - mean * mean)), chroma: chroma / n };
}

if (TONE_REF) {
  const ref = await sharp(TONE_REF).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rw = ref.info.width * ref.info.height;
  const refRgb = Buffer.alloc(rw * 3);
  const refAlpha = Buffer.alloc(rw);
  for (let i = 0; i < rw; i++) {
    const s4 = i * 4;
    refAlpha[i] = ref.data[s4 + 3];
    const k = ref.data[s4 + 3] / 255;
    refRgb[i * 3] = Math.round(ref.data[s4] * k + 255 * (1 - k));
    refRgb[i * 3 + 1] = Math.round(ref.data[s4 + 1] * k + 255 * (1 - k));
    refRgb[i * 3 + 2] = Math.round(ref.data[s4 + 2] * k + 255 * (1 - k));
  }

  const target = toneStats(refRgb, refAlpha, rw);
  const source = toneStats(data, ownAlpha, w0 * h0);
  const chromaK = Math.min(1, target.chroma / source.chroma);

  console.log(
    `tone: luminance ${source.mean.toFixed(0)}±${source.sd.toFixed(0)} -> ` +
      `${target.mean.toFixed(0)}±${target.sd.toFixed(0)}, chroma x${chromaK.toFixed(2)}`
  );

  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
  for (let i = 0; i < w0 * h0; i++) {
    const o = i * 3;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const L = luma(r, g, b);
    // Pull chroma toward the reference's level, leaving luminance untouched.
    const dr = L + (r - L) * chromaK;
    const dg = L + (g - L) * chromaK;
    const db = L + (b - L) * chromaK;
    // Then remap luminance onto the reference's distribution.
    const targetL = (L - source.mean) / source.sd * target.sd + target.mean;
    const k = L < 1 ? 0 : targetL / L;
    data[o] = clamp(dr * k);
    data[o + 1] = clamp(dg * k);
    data[o + 2] = clamp(db * k);
  }
}

const transparentPct = (alreadyTransparent / (w0 * h0)) * 100;
const useOwnAlpha =
  ALPHA_MODE === "keep" || (ALPHA_MODE === "auto" && transparentPct > 2);

let alpha0;
if (useOwnAlpha) {
  alpha0 = ownAlpha;
  console.log(`kept the file's own alpha (${transparentPct.toFixed(1)}% transparent)`);
} else {
  const isBg = (i) => {
    const o = i * c;
    return data[o] >= TOL && data[o + 1] >= TOL && data[o + 2] >= TOL;
  };

  alpha0 = Buffer.alloc(w0 * h0, 255);
  const seen = new Uint8Array(w0 * h0);
  const stack = [];
  for (let x = 0; x < w0; x++) stack.push(x, (h0 - 1) * w0 + x);
  for (let y = 0; y < h0; y++) stack.push(y * w0, y * w0 + w0 - 1);

  while (stack.length) {
    const i = stack.pop();
    if (seen[i]) continue;
    seen[i] = 1;
    if (!isBg(i)) continue;
    alpha0[i] = 0;
    const x = i % w0;
    const y = (i - x) / w0;
    if (x > 0) stack.push(i - 1);
    if (x < w0 - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w0);
    if (y < h0 - 1) stack.push(i + w0);
  }
  console.log(`flood-filled ${((alpha0.reduce((n, v) => n + (v === 0 ? 1 : 0), 0) / (w0 * h0)) * 100).toFixed(1)}% to transparent`);
}

/* ---------- 2. pad, so the border has room to grow instead of clipping ---------- */

const pad = BORDER > 0 ? Math.ceil((BORDER * 1.7) / SCALE) : 0;
const wp = w0 + pad * 2;
const hp = h0 + pad * 2;

const extend = { top: pad, bottom: pad, left: pad, right: pad };

const rgbPad = pad
  ? await sharp(data, { raw: { width: w0, height: h0, channels: c } })
      .extend({ ...extend, background: { r: 255, g: 255, b: 255 } })
      .raw()
      .toBuffer()
  : data;

const alphaPad = pad
  ? await sharp(alpha0, { raw: { width: w0, height: h0, channels: 1 } })
      .extend({ ...extend, background: { r: 0, g: 0, b: 0 } })
      .toColourspace("b-w")
      .raw()
      .toBuffer()
  : alpha0;

/* ---------- 3. upscale ---------- */

const w = Math.round(wp * SCALE);
const h = Math.round(hp * SCALE);

const rgbUp = await sharp(rgbPad, { raw: { width: wp, height: hp, channels: c } })
  .resize(w, h, { kernel: "lanczos3" })
  .sharpen({ sigma: 0.9, m1: 0.4, m2: 2.2 })
  .removeAlpha()
  .raw()
  .toBuffer();

// blur() and resize() can hand back extra channels; force single-channel or the
// alpha misaligns against the RGB and smears into horizontal bands.
const oneChannel = async (pipeline, label) => {
  const { data: buf, info: i2 } = await pipeline.toColourspace("b-w").raw().toBuffer({ resolveWithObject: true });
  if (i2.channels !== 1 || buf.length !== w * h) {
    throw new Error(`${label} is ${i2.channels}ch / ${buf.length}B, expected 1ch / ${w * h}B`);
  }
  return buf;
};

const alphaUp = await oneChannel(
  sharp(alphaPad, { raw: { width: wp, height: hp, channels: 1 } })
    .resize(w, h, { kernel: "lanczos3" })
    .blur(0.6),
  "subject alpha"
);

/* ---------- 4. dilate into a sticker border ---------- */

/** Smoothed value noise, so the cut edge wanders like torn paper. */
function valueNoise(width, height, cell) {
  const gw = Math.ceil(width / cell) + 2;
  const gh = Math.ceil(height / cell) + 2;
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = Math.random();
  const out = new Float32Array(width * height);
  const ease = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < height; y++) {
    const gy = y / cell;
    const y0 = Math.floor(gy);
    const fy = ease(gy - y0);
    for (let x = 0; x < width; x++) {
      const gx = x / cell;
      const x0 = Math.floor(gx);
      const fx = ease(gx - x0);
      const a = g[y0 * gw + x0];
      const b = g[y0 * gw + x0 + 1];
      const cc = g[(y0 + 1) * gw + x0];
      const d = g[(y0 + 1) * gw + x0 + 1];
      out[y * width + x] = (a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy;
    }
  }
  return out;
}

let stickerAlpha;
if (BORDER > 0) {
  const spread = await oneChannel(
    sharp(alphaPad, { raw: { width: wp, height: hp, channels: 1 } })
      .resize(w, h, { kernel: "lanczos3" })
      .blur(BORDER * 1.15),
    "spread mask"
  );

  const noise = valueNoise(w, h, Math.max(8, BORDER * 1.6));
  const hard = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) {
    // Lower threshold = wider border. Noise wobbles it for a torn edge.
    const t = 30 + (noise[i] - 0.5) * 44 * RAGGED;
    hard[i] = spread[i] > t ? 255 : 0;
  }
  stickerAlpha = await oneChannel(
    sharp(hard, { raw: { width: w, height: h, channels: 1 } }).blur(0.8),
    "sticker alpha"
  );
} else {
  stickerAlpha = alphaUp;
}

/* ---------- 5. composite subject over white, keyed to the sticker outline ---------- */

const out = Buffer.alloc(w * h * 4);
for (let i = 0; i < w * h; i++) {
  const a = alphaUp[i] / 255;
  const s = i * 3;
  const d = i * 4;
  out[d] = Math.round(rgbUp[s] * a + PAPER[0] * (1 - a));
  out[d + 1] = Math.round(rgbUp[s + 1] * a + PAPER[1] * (1 - a));
  out[d + 2] = Math.round(rgbUp[s + 2] * a + PAPER[2] * (1 - a));
  out[d + 3] = Math.max(stickerAlpha[i], alphaUp[i]);
}

const img = sharp(out, { raw: { width: w, height: h, channels: 4 } });
await writeFile(`${outBase}.png`, await img.clone().png({ compressionLevel: 9 }).toBuffer());
await writeFile(`${outBase}.webp`, await img.clone().webp({ quality: 92, alphaQuality: 100 }).toBuffer());
console.log(`wrote ${outBase}.{png,webp} at ${w}x${h} (border ${BORDER}px, ragged ${RAGGED}, paper ${PAPER_HEX})`);

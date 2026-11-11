"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  RoundedBox,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { MONOGRAM_PATHS, MONOGRAM_VIEWBOX } from "@/components/Logo";
import type { Group, Mesh } from "three";

/** Lid travel, in radians. Past ~1.5 it reads as a chair back, not a trunk. */
const MAX_OPEN = 1.38;

const W = 3.3; // width
const H = 1.02; // body height — shallow enough to see the floor from above
const D = 2.0; // depth
const LID_H = 0.52; // the crown of the vaulted lid
const WALL = 0.07;
/**
 * The gold frame that follows every seam.
 *
 * RAIL is how far the band stands proud of the covering, TRIM its width along
 * the surface. Both rails and posts are placed on the SAME x/z offsets and
 * each spans its full dimension, so at a corner the two simply overlap inside
 * one another. That overlap is the whole trick: butting separately-sized
 * strips end to end is what left visible gaps last time, whereas two opaque
 * boxes of the same material sharing a volume read as one continuous piece,
 * with no coplanar faces to z-fight.
 */
const TRIM = WALL + 0.02;
const RAIL = 0.05;

/**
 * These are the LIT colours, deliberately a step brighter than the brand
 * maroon. `map` can only ever multiply downward — there is no brightening
 * available — so a surface painted at the target colour and then tinted can
 * only get darker, and the variation disappears into a dark base. Painting
 * brighter and letting the patina map pull it back down averages out at the
 * brand colour while leaving real range either side of it.
 */
const MAROON = "#5e0f22";
const MAROON_DEEP = "#3d0a17";
/**
 * The brand value these average back to, kept for reference: #801834.
 *
 * Blue is held down relative to red here. An earlier pass compensated each
 * channel by the same factor, which pushed the rendered trunk toward magenta —
 * the shell read as purple rather than as the oxblood the brand colour is.
 */
const GOLD = "#e07a30";
const GOLD_DARK = "#b05a22";
/**
 * A deep burgundy silk. Dark on purpose: the pieces have cream-edged borders, and
 * against a dark lining they glow, where against a pale one they vanish. Lit, it
 * reads a step lighter than this.
 */
const LINING = "#6c1a35";
/** The bounce light keeps the paler blush — it tints, it isn't a surface. */
const FILL = "#efc0bc";

/** Timing within the packing scrub: every item flies, then the lid shuts. */
const ITEM_SPAN = 0.26;
const LID_START = 0.82;

/** Item flights are spread across the time before the lid starts closing. */
const stepFor = (count: number) =>
  count > 1 ? (LID_START - ITEM_SPAN) / (count - 1) : 0;

/**
 * Where each item comes to rest. The planes are tilted back, so a 0.85-tall
 * item has a vertical half-extent of 0.377: any centre below y=0.452 pushes its
 * lower edge through the interior floor at 0.075, and anything above y=0.643
 * fouls the lid when it shuts. These all sit inside that band.
 *
 * |x| is capped at 0.85 so nothing reaches a side wall.
 */
const RESTS: [number, number, number][] = [
  [-0.85, 0.5, -0.24],
  [-0.28, 0.53, -0.3],
  [0.3, 0.5, -0.22],
  [0.85, 0.55, -0.14],
  [-0.62, 0.57, 0.3],
  [0.02, 0.6, 0.38],
  [0.66, 0.58, 0.34],
  // Middle row, added when the chandbalis and drop motif earrings were
  // photographed. There must be at least as many rests as photographed
  // products: the index wraps with `% RESTS.length`, so a ninth item with
  // only seven rests lands exactly on top of the second one.
  [-0.46, 0.54, 0.05],
  [0.46, 0.56, 0.03],
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ------------------------------------------------------------------ *
 * Surface detail                                                      *
 *                                                                     *
 * Greyscale maps built in a canvas at runtime rather than shipped as  *
 * image files. Three 256px maps cost a few milliseconds to generate   *
 * and nothing to download, and they sidestep the licensing question   *
 * a photographed leather or cloth scan would raise. The generator is  *
 * seeded, so the trunk is identical on every load and between the     *
 * server's markup and the client's.                                   *
 * ------------------------------------------------------------------ */

/** mulberry32 — small, fast, and repeatable from a fixed seed. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Value noise on a `cx` by `cy` lattice, smoothstep-interpolated. The lattice
 * is read modulo its size, so every map tiles seamlessly — without that the
 * repeat seams would show as hard lines across the trunk's faces. Separate x
 * and y cell counts are what make the brushed-metal streaks possible.
 */
function noise(size: number, cx: number, cy: number, rand: () => number) {
  const g = new Float32Array(cx * cy);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  const at = (x: number, y: number) => g[(y % cy) * cx + (x % cx)];
  const smooth = (t: number) => t * t * (3 - 2 * t);

  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const fy = (y / size) * cy;
    const y0 = Math.floor(fy);
    const ty = smooth(fy - y0);
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cx;
      const x0 = Math.floor(fx);
      const tx = smooth(fx - x0);
      const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
      const bot = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
      out[y * size + x] = top + (bot - top) * ty;
    }
  }
  return out;
}

/** Gold used for the stamped medallions. Paler than the hardware brass. */
const GOLD_LEAF = "#e2a263";

const hexToRGB = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];

/**
 * Two butis per tile, set half-drop — offset diagonally rather than sitting on
 * a square grid, which is how block print actually repeats and what stops the
 * shell reading as polka dots.
 *
 * They are drawn far larger than the first attempt. At the size the trunk
 * appears on the page, rings a couple of texels wide fell below a pixel and
 * mipmapping averaged them into a plain gold blob — the motif has to be big
 * enough that its scallops survive being minified.
 *
 * The scallops come from modulating each ring's radius with cos(8 theta),
 * which gives the eight-petalled flower read rather than a pair of circles.
 */
function buti(u: number, v: number) {
  const EDGE = 0.008;
  const one = (cu: number, cv: number) => {
    // Wrap toward the nearest copy so motifs are not clipped at the seam.
    const dx = u - cu - Math.round(u - cu);
    const dy = v - cv - Math.round(v - cv);
    const r = Math.hypot(dx, dy);
    if (r > 0.16) return 0;
    const th = Math.atan2(dy, dx);
    const band = (centre: number, half: number) =>
      1 - Math.min(1, Math.max(0, (Math.abs(r - centre) - half) / EDGE));

    const core = 1 - Math.min(1, Math.max(0, (r - 0.032) / EDGE));
    const petals = band(0.076 + 0.016 * Math.cos(8 * th), 0.016);
    const outer =
      band(0.126 + 0.012 * Math.cos(8 * th + Math.PI / 8), 0.009) * 0.8;
    return Math.max(core, Math.max(petals, outer));
  };
  return Math.min(1, Math.max(one(0.25, 0.25), one(0.75, 0.75)));
}

const MAP_SIZE = 256;

/**
 * A DataTexture rather than a canvas-backed one: no 2D context, no
 * putImageData, and nothing that can quietly fail to upload. RGBA throughout
 * because three reads different channels depending on the slot — bumpMap
 * takes .x, roughnessMap takes .g — so a single-channel format would leave
 * roughness reading zero.
 */
function toTexture(data: Float32Array, srgb = false) {
  const rgba = new Uint8Array(MAP_SIZE * MAP_SIZE * 4);
  for (let i = 0; i < data.length; i++) {
    const v = Math.max(0, Math.min(255, Math.round(data[i] * 255)));
    rgba[i * 4] = v;
    rgba[i * 4 + 1] = v;
    rgba[i * 4 + 2] = v;
    rgba[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(rgba, MAP_SIZE, MAP_SIZE, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  // Bump and roughness are data and must stay linear; only maps multiplied
  // into `color` are tagged sRGB.
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * The colour variant. The shell's map now carries actual colour rather than a
 * greyscale multiplier, because a multiplier can only ever darken — and gold
 * medallions on a maroon ground need a channel to go UP, not down.
 */
function toRGBTexture(rgb: Float32Array) {
  const rgba = new Uint8Array(MAP_SIZE * MAP_SIZE * 4);
  for (let i = 0; i < MAP_SIZE * MAP_SIZE; i++) {
    for (let c = 0; c < 3; c++) {
      rgba[i * 4 + c] = Math.max(
        0,
        Math.min(255, Math.round(rgb[i * 3 + c] * 255)),
      );
    }
    rgba[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(rgba, MAP_SIZE, MAP_SIZE, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * A studio, built as an equirectangular environment map.
 *
 * This is what the brass was missing. A metal has no diffuse term in PBR — it
 * renders only what it reflects — so at metalness 0.85 with nothing in the
 * scene to reflect, the gold collapsed to a dull olive-brown no amount of
 * texturing could rescue. Two directional lights give it a pair of specular
 * pinpricks and nothing else.
 *
 * Kept deliberately small and generated rather than fetched: an HDR file would
 * be a megabyte and a network dependency, and at 128x64 nothing here is ever
 * seen directly — only smeared across curved metal.
 *
 * FloatType rather than bytes so the key can exceed 1.0. That headroom is the
 * whole point: a highlight clamped at white gives brass a chalky sheen, while
 * a value well above 1 reads as a real light source caught in the metal.
 */
function buildEnvironment() {
  const W = 128;
  const H = 64;
  const data = new Float32Array(W * H * 4);

  // Warm ivory falling to gold, over a warm tan floor. The reference trunk is
  // shot on cream tissue in tungsten-ish light: almost nothing in that frame
  // is neutral, and a neutral grey studio was a large part of why ours read
  // as a render rather than a photograph.
  const SKY_TOP = [1.0, 0.97, 0.92];
  const HORIZON = [0.95, 0.89, 0.81];
  const GROUND = [0.44, 0.38, 0.33];
  // Placed to agree with the key light at [4, 7, 5]; a reflection coming from
  // somewhere the shading says is dark looks like a bug.
  const KEY_U = 0.6;
  const KEY_V = 0.24;

  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    const sky = v < 0.5;
    const t = sky ? v / 0.5 : (v - 0.5) / 0.5;
    const from = sky ? SKY_TOP : HORIZON;
    const to = sky ? HORIZON : GROUND;

    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      // Wrap the azimuth, or the key is cut in half at the seam.
      const du = Math.min(Math.abs(u - KEY_U), 1 - Math.abs(u - KEY_U));
      const dv = v - KEY_V;
      // Broader and gentler than before. A tight, hot key is a small hard
      // source; the reference is lit by something big and close, which is
      // what gives its gold long soft gradients instead of hot pinpricks.
      const key = Math.exp(-((du * 2.1) ** 2 + (dv * 1.7) ** 2) * 11) * 3.4;

      const i = (y * W + x) * 4;
      data[i] = from[0] + (to[0] - from[0]) * t + key;
      data[i + 1] = from[1] + (to[1] - from[1]) * t + key * 0.95;
      data[i + 2] = from[2] + (to[2] - from[2]) * t + key * 0.86;
      data[i + 3] = 1;
    }
  }

  const tex = new THREE.DataTexture(
    data,
    W,
    H,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Hangs the studio on the scene so every metal has something to reflect.
 *
 * Via drei's <Environment> rather than assigning scene.environment from a
 * useThree selector: the scene is state owned by the renderer, and writing to
 * it from inside an effect reaches past React to mutate it. drei owns that
 * assignment and unwinds it on unmount.
 */
function Studio() {
  const map = useMemo(() => buildEnvironment(), []);
  useEffect(() => () => map.dispose(), [map]);
  return <Environment map={map} />;
}

/** One tile of any pattern covers this many world units, on every surface. */
const TILE = 0.34;

/**
 * Box-projects UVs from the vertex positions, choosing the plane each face
 * most nearly lies in. Two reasons to do this rather than use the geometry's
 * own UVs: the trunk's faces differ wildly in size, and a 0..1 UV square on
 * each would stretch the grain wide on the long panels and squash it on the
 * narrow ones; and with every surface on the same world-space scale, one
 * texture at repeat 1 serves all of them, so no per-mesh clones are needed.
 */
/**
 * The shell albedo tiles larger than the grain and weave do. UVs are projected
 * at one tile per TILE world units, which suits a pebble grain but would put
 * medallions every 3cm; at this repeat a tile spans about 0.75 units, and with
 * two butis to a tile they land roughly 9 across the front panel — the spacing
 * the reference photograph has.
 */
function butiScale(tex: THREE.Texture) {
  tex.repeat.set(0.45, 0.45);
  return tex;
}

function projectUV(geo: THREE.BufferGeometry) {
  // Curved surfaces measure their own UVs along the curve (see `strip`).
  if (geo.userData.ownUV) return;
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  if (!pos || !nor) return;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    let u: number;
    let v: number;
    if (ax >= ay && ax >= az) {
      u = pos.getZ(i);
      v = pos.getY(i);
    } else if (ay >= ax && ay >= az) {
      u = pos.getX(i);
      v = pos.getZ(i);
    } else {
      u = pos.getX(i);
      v = pos.getY(i);
    }
    uv[i * 2] = u / TILE;
    uv[i * 2 + 1] = v / TILE;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

type Surfaces = {
  /** Pressed leather, for the maroon shell. */
  grain: THREE.Texture;
  /** The shell's colour: maroon ground with the gold buti stamped across it. */
  albedo: THREE.Texture;
  /** Cotton weave, for the lining. */
  weave: THREE.Texture;
  /** Brushed brass, for the hardware. */
  brass: THREE.Texture;
  /** The same streaks tinted, so the metal varies in tone as well as gloss. */
  brassTint: THREE.Texture;
  /**
   * The same two patterns again, remapped to sit just under 1.0 and fed to
   * `map` so they modulate the base colour directly.
   *
   * Bump and roughness alone were not enough: measured over a 60px patch of
   * the lid, the rendered surface varied by a standard deviation of 0.8 on a
   * 0-255 scale — flat to the eye. Bump only shows where a light grazes the
   * surface, and roughness only in a specular highlight, so the broad faces
   * that make up most of the trunk showed nothing. Tinting the albedo is what
   * actually reads as a material rather than a fill colour.
   */
  clothTint: THREE.Texture;
};

/**
 * Each map's mean is noted because `roughnessMap` MULTIPLIES the material's
 * `roughness`. The base values below are pre-divided by these means so the
 * average roughness lands where the flat-colour version already looked right.
 */
const GRAIN_MEAN = 0.62;
const WEAVE_MEAN = 0.86;
const BRASS_MEAN = 0.78;

function buildSurfaces(): Surfaces {
  const rand = seeded(20260915);
  const n = MAP_SIZE * MAP_SIZE;

  // Coarse mottling under a fine crinkle — the way grained leatherette on a
  // real trunk catches light in patches rather than evenly.
  const grain = new Float32Array(n);
  const g1 = noise(MAP_SIZE, 10, 10, rand);
  const g2 = noise(MAP_SIZE, 40, 40, rand);
  const g3 = noise(MAP_SIZE, 96, 96, rand);
  const g4 = noise(MAP_SIZE, 192, 192, rand);
  for (let i = 0; i < n; i++) {
    // Weighted toward the two fine octaves: the coarse ones alone read as
    // damp patches on the shell rather than as a grain.
    const v = g1[i] * 0.2 + g2[i] * 0.3 + g3[i] * 0.29 + g4[i] * 0.21;
    grain[i] = GRAIN_MEAN + (v - 0.5) * 0.62;
  }

  // An over-under weave. Whichever thread is further from its midpoint is the
  // one lying on top at that pixel, which is what gives cloth its basket look.
  const weave = new Float32Array(n);
  const fuzz = noise(MAP_SIZE, 48, 48, rand);
  const THREADS = 26;
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const i = y * MAP_SIZE + x;
      const wx = Math.sin((x / MAP_SIZE) * Math.PI * 2 * THREADS);
      const wy = Math.sin((y / MAP_SIZE) * Math.PI * 2 * THREADS);
      const over = Math.abs(wx) > Math.abs(wy) ? wx : wy;
      weave[i] = WEAVE_MEAN + over * 0.13 + (fuzz[i] - 0.5) * 0.09;
    }
  }

  /**
   * Fine, roughly isotropic mottling — NOT streaks.
   *
   * This was a 3-by-160 lattice, which smears noise into long parallel fibres.
   * On a wide plate that reads as brushed metal; on the narrow braid running
   * down each corner it reads as wood grain, because long parallel fibres on a
   * thin strip is exactly what timber looks like. Cast brass is blotchy, not
   * fibrous, so the lattice is square now and the contrast much lower.
   */
  const brass = new Float32Array(n);
  const b1 = noise(MAP_SIZE, 26, 26, rand);
  const b2 = noise(MAP_SIZE, 64, 64, rand);
  for (let i = 0; i < n; i++) {
    brass[i] = BRASS_MEAN + (b1[i] * 0.55 + b2[i] * 0.45 - 0.5) * 0.16;
  }

  // Colour maps multiply, so 1.0 is "leave it alone" and there is no
  // brightening available — the variation has to hang downward off 1.0.
  const span = (v: number, lo: number, hi: number, floor: number) =>
    floor + (1 - floor) * Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  // 0.70..1.0 in sRGB decodes to roughly 0.45..1.0 linear — a wide swing, but
  // it has to be: the shell is dark, so a tighter range disappeared entirely
  // (measured standard deviation under 1 on a 0-255 scale). The linear mean of
  // ~0.70 is what MAROON above is pre-divided by. Cloth stays tighter; a
  // lining with this much variation reads as stained.
  /**
   * The shell's albedo: maroon ground, a whisper of tonal variation, and the
   * gold buti repeating across it.
   *
   * The buti — the small medallion stamped in rows across Jaipuri block print
   * and brocade — is the single most recognisable thing about the reference
   * trunk, so it is drawn here rather than approximated with a colour.
   *
   * Variation is deliberately slight. An earlier pass gave this a wide,
   * coarse range to break up flat panels; it overshot and read as a trunk
   * that had been dragged behind a train rather than packed and carried.
   */
  const mottle = noise(MAP_SIZE, 5, 5, rand);
  const albedo = new Float32Array(n * 3);
  const base = hexToRGB(MAROON);
  const leaf = hexToRGB(GOLD_LEAF);

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const i = y * MAP_SIZE + x;
      // +/- 4% only. Enough that a panel is not one flat value, far short of
      // looking weathered.
      const tone = 0.96 + mottle[i] * 0.08;
      const m = buti(x / MAP_SIZE, y / MAP_SIZE);
      for (let c = 0; c < 3; c++) {
        const k = m * 0.6;
        albedo[i * 3 + c] = base[c] * tone * (1 - k) + leaf[c] * k;
      }
    }
  }

  const clothTint = new Float32Array(n);
  for (let i = 0; i < n; i++) clothTint[i] = span(weave[i], 0.66, 1.04, 0.9);
  // Brass keeps the widest range of the three: real cast hardware is blotchy,
  // darker where it has been handled and brighter along the raised edges.
  const brassTint = new Float32Array(n);
  for (let i = 0; i < n; i++) brassTint[i] = span(brass[i], 0.68, 0.88, 0.9);

  return {
    grain: toTexture(grain),
    weave: toTexture(weave),
    brass: toTexture(brass),
    albedo: butiScale(toRGBTexture(albedo)),
    clothTint: toTexture(clothTint, true),
    brassTint: toTexture(brassTint, true),
  };
}

/**
 * A product, as a real plane inside the scene — so the trunk's own walls
 * occlude it as it drops in, instead of it fading out over the canvas.
 */
function PackedItem({
  url,
  index,
  step,
  pack,
}: {
  url: string;
  index: number;
  step: number;
  pack: { current: number };
}) {
  const mesh = useRef<Mesh>(null);
  const texture = useTexture(url);

  // Sized to fit inside the box: tall enough to read, short enough that the
  // lid can shut over it and narrow enough not to poke through a side wall.
  const size = useMemo(() => {
    const img = texture.image as { width: number; height: number } | undefined;
    const ratio = img && img.height ? img.width / img.height : 1;
    const h = 0.85;
    return [h * ratio, h] as const;
  }, [texture]);

  const rest = RESTS[index % RESTS.length];

  /**
   * A cubic Bézier rather than a straight run. The second control point sits
   * directly above the landing spot, which forces the last stretch to be a
   * vertical drop through the open top — so nothing ever passes through the
   * front wall on its way in.
   */
  const curve = useMemo(
    () =>
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(7.4, 2.4, 2.6),
        new THREE.Vector3(4.4, 4.3, 1.9),
        new THREE.Vector3(rest[0], 3.1, rest[2]),
        new THREE.Vector3(rest[0], rest[1], rest[2]),
      ),
    [rest],
  );

  const point = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;

    const start = index * step;
    const t = clamp01((pack.current - start) / ITEM_SPAN);

    m.visible = t > 0;
    if (t <= 0) return;

    (m.material as THREE.MeshStandardMaterial).opacity = clamp01(t / 0.18);

    curve.getPoint(easeInOut(t), point);
    m.position.copy(point);

    // Tumble on the way over, then settle upright in the last third.
    const settle = easeOut(clamp01((t - 0.62) / 0.38));
    m.rotation.z = (1 - settle) * -0.55;
    m.rotation.y = (1 - settle) * 0.4;
    m.rotation.x = -0.12 - settle * 0.36;
  });

  return (
    <mesh ref={mesh} castShadow>
      <planeGeometry args={[size[0], size[1]]} />
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.05}
        roughness={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ *
 * The lid's vault                                                     *
 *                                                                     *
 * A trunk lid is not a slab. Its cross-section, front to back, is a   *
 * short straight skirt and then a rising arc, and everything that     *
 * follows the lid — the shell, the lining, the brass bands over it —  *
 * is the same outline, grown or shrunk. Built as surfaces from that   *
 * one function, so they can never disagree about where the lid is.    *
 * ------------------------------------------------------------------ */

type V2 = [number, number]; // [z, y], in the lid's own space (hinge at z = 0)

/** Height of the straight skirt before the vault begins to rise. */
const SKIRT = 0.16;

/**
 * The lid's outline. `inset` shrinks it (the lining sits under the shell) and
 * `grow` expands it (brass bands sit just proud of the shell).
 */
function vaultProfile(grow = 0, inset = 0, n = 44): V2[] {
  const z0 = inset - grow;
  const z1 = D - inset + grow;
  const top = LID_H - inset + grow;
  const a = (z1 - z0) / 2;
  const b = top - SKIRT;
  const pts: V2[] = [
    [z0, 0],
    [z0, SKIRT],
  ];
  for (let i = 1; i < n; i++) {
    const ph = (Math.PI * i) / n;
    pts.push([z0 + a - a * Math.cos(ph), SKIRT + b * Math.sin(ph)]);
  }
  pts.push([z1, SKIRT], [z1, 0]);
  return pts;
}

/**
 * An extruded surface along the outline, between two x positions. It carries its
 * own UVs, measured along the curve: the box projection used elsewhere picks an
 * axis per vertex from its normal, and on an arc that flips mid-triangle and
 * smears the grain across a visible band.
 */
function strip(pts: V2[], xa: number, xb: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let run = 0;
  pts.forEach(([z, y], i) => {
    if (i > 0) run += Math.hypot(z - pts[i - 1][0], y - pts[i - 1][1]);
    pos.push(xa, y, z, xb, y, z);
    uv.push(xa / TILE, run / TILE, xb / TILE, run / TILE);
  });
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.ownUV = true;
  return g;
}

/** The outline filled flat at one x: the lid's end panel. */
function cap(pts: V2[], x: number): THREE.BufferGeometry {
  const cz = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const pos: number[] = [x, cy, cz];
  pts.forEach(([z, y]) => pos.push(x, y, z));
  const idx: number[] = [];
  for (let i = 0; i < pts.length; i++)
    idx.push(0, 1 + i, 1 + ((i + 1) % pts.length));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Evenly spaced points along an outline, for rivets. */
function along(pts: V2[], spacing: number, from = 0): V2[] {
  const out: V2[] = [];
  let next = from;
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const [z0, y0] = pts[i - 1];
    const [z1, y1] = pts[i];
    const len = Math.hypot(z1 - z0, y1 - y0);
    while (next <= run + len) {
      const t = (next - run) / len;
      out.push([z0 + (z1 - z0) * t, y0 + (y1 - y0) * t]);
      next += spacing;
    }
    run += len;
  }
  return out;
}

/** A row of round-headed rivets, drawn as one instanced mesh. */
function Rivets({
  points,
  material,
  radius = 0.024,
}: {
  points: [number, number, number][];
  material: React.ReactNode;
  radius?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    points.forEach((p, i) => {
      d.position.set(p[0], p[1], p[2]);
      d.scale.set(1, 1, 0.7);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [points]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, points.length]}>
      <sphereGeometry args={[radius, 10, 8]} />
      {material}
    </instancedMesh>
  );
}

/**
 * The brand's monogram as a solid brass relief, extruded from the same path data as
 * the logo. It is the trunk's lock: the logo is a key, so it is mounted where a lock
 * plate would be, with a bevel that catches the light.
 */
function monogramRelief(height: number): THREE.BufferGeometry {
  const [vx, vy, vw, vh] = MONOGRAM_VIEWBOX.split(" ").map(Number);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MONOGRAM_VIEWBOX}">${MONOGRAM_PATHS.map(
    (d) => `<path d="${d}"/>`,
  ).join("")}</svg>`;
  const data = new SVGLoader().parse(svg);
  const shapes = data.paths.flatMap((path) => SVGLoader.createShapes(path));
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: 13,
    bevelEnabled: true,
    bevelThickness: 2.2,
    bevelSize: 1.6,
    bevelSegments: 2,
    curveSegments: 8,
  });
  // SVG space is y-down and starts at the viewBox corner: centre it, flip it
  // upright, and bring it to world units.
  const k = height / vh;
  geo.translate(-(vx + vw / 2), -(vy + vh / 2), 0);
  geo.scale(k, -k, k);
  geo.computeVertexNormals();
  return geo;
}

function Trunk({
  pack,
  items,
}: {
  pack: { current: number };
  items: string[];
}) {
  const lid = useRef<Group>(null);
  const root = useRef<Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  const step = stepFor(items.length);

  // Built once for the life of the canvas. One texture per pattern: UVs are
  // box-projected to a common world scale below, so nothing needs its own
  // repeat and there are no per-mesh clones.
  const surf = useMemo(() => buildSurfaces(), []);
  const lock = useMemo(() => monogramRelief(0.64), []);
  useEffect(() => () => lock.dispose(), [lock]);

  // The lid's surfaces, all derived from one outline.
  const lidGeo = useMemo(() => {
    const outer = vaultProfile(0, 0);
    const inner = vaultProfile(0, WALL);
    const bandL = vaultProfile(0.018, 0);
    return {
      outer: strip(outer, -W / 2, W / 2),
      lining: strip(inner, -W / 2 + WALL, W / 2 - WALL),
      endOut: [cap(outer, -W / 2), cap(outer, W / 2)],
      endIn: [cap(inner, -W / 2 + WALL), cap(inner, W / 2 - WALL)],
      bands: [-1, 1].map((s) => strip(bandL, s * 1.0 - 0.075, s * 1.0 + 0.075)),
      rivets: [-1, 1].flatMap((s) =>
        [-0.04, 0.04].flatMap((dx) =>
          along(vaultProfile(0.03, 0), 0.15, 0.1).map(
            ([z, y]) => [s * 1.0 + dx, y, z] as [number, number, number],
          ),
        ),
      ),
    };
  }, []);

  /**
   * Re-project UVs across the trunk once it is in the scene. Doing it here
   * rather than per mesh keeps it to one place, and matching on the texture
   * identity means the packed product planes — which carry their own artwork
   * on their own UVs — are left alone.
   */
  useLayoutEffect(() => {
    const ours = new Set<THREE.Texture>([
      surf.grain,
      surf.weave,
      surf.brass,
      surf.albedo,
      surf.clothTint,
      surf.brassTint,
    ]);
    root.current?.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (!mat) return;
      if (
        ours.has(mat.map!) ||
        ours.has(mat.bumpMap!) ||
        ours.has(mat.roughnessMap!)
      ) {
        projectUV(m.geometry);
      }
    });
  }, [surf, lidGeo]);

  // Nothing else holds these, so the canvas unmounting is the only chance to
  // give the GPU its memory back.
  useEffect(
    () => () => Object.values(surf).forEach((t) => t.dispose()),
    [surf],
  );
  useEffect(
    () => () => {
      lidGeo.outer.dispose();
      lidGeo.lining.dispose();
      [...lidGeo.endOut, ...lidGeo.endIn, ...lidGeo.bands].forEach((g) =>
        g.dispose(),
      );
    },
    [lidGeo],
  );

  useFrame((state) => {
    const p = clamp01(pack.current);
    const shut = clamp01((p - LID_START) / (1 - LID_START));
    if (lid.current) lid.current.rotation.x = -(1 - easeOut(shut)) * MAX_OPEN;
    if (root.current) {
      // A slow turntable: the trunk starts three-quarter on and comes round to
      // face the reader as it shuts, so the closing is the deliberate last pose.
      root.current.rotation.y = -0.86 + easeInOut(p) * 0.7;
      root.current.position.y =
        -0.78 + Math.sin(state.clock.elapsedTime * 0.9) * 0.012;
    }
    // Light spills out of the open trunk onto the pieces and the lining, and
    // goes out as the lid comes down.
    if (glow.current) glow.current.intensity = 0.12 + 1.0 * (1 - easeOut(shut));
  });

  // The shell on the body is closed boxes; on the lid it is open surfaces, so it
  // is drawn from both sides and lit as whichever face is showing.
  const shell = (side: THREE.Side = THREE.FrontSide) => (
    <meshStandardMaterial
      /* White, because surf.albedo already carries the maroon and the gold
         buti. Tinting on top of it would drag the gold toward maroon. */
      color="#ffffff"
      roughness={0.74 / GRAIN_MEAN}
      metalness={0.04}
      map={surf.albedo}
      bumpMap={surf.grain}
      bumpScale={0.34}
      roughnessMap={surf.grain}
      envMapIntensity={0.18}
      side={side}
    />
  );

  const cloth = (
    <meshStandardMaterial
      color={LINING}
      roughness={0.95 / WEAVE_MEAN}
      map={surf.clothTint}
      bumpMap={surf.weave}
      bumpScale={0.12}
      roughnessMap={surf.weave}
      side={THREE.DoubleSide}
      envMapIntensity={0.12}
    />
  );

  /**
   * A proper metal now that there is a studio to reflect: metalness 0.96 with a
   * satin roughness, because brass on a trunk that has been packed and carried
   * should not be chrome.
   */
  const gold = (
    <meshStandardMaterial
      color={GOLD}
      roughness={0.26 / BRASS_MEAN}
      metalness={0.96}
      map={surf.brassTint}
      roughnessMap={surf.brass}
      envMapIntensity={1.35}
    />
  );
  const goldDS = (
    <meshStandardMaterial
      color={GOLD}
      roughness={0.26 / BRASS_MEAN}
      metalness={0.96}
      map={surf.brassTint}
      roughnessMap={surf.brass}
      envMapIntensity={1.35}
      side={THREE.DoubleSide}
    />
  );
  const goldDark = (
    <meshStandardMaterial
      color={GOLD_DARK}
      roughness={0.3 / BRASS_MEAN}
      metalness={0.96}
      map={surf.brassTint}
      roughnessMap={surf.brass}
      envMapIntensity={1.3}
    />
  );

  // Rivets down the two front straps.
  const bodyRivets = useMemo(() => {
    const out: [number, number, number][] = [];
    for (const sx of [-1, 1])
      for (const dx of [-0.04, 0.04])
        for (let y = 0.2; y < H - 0.12; y += 0.17)
          out.push([sx * 1.0 + dx, y, D / 2 + 0.03]);
    return out;
  }, []);

  const corners = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => [sx, sz] as const),
  );

  return (
    <group
      ref={root}
      position={[0, -0.78, 0]}
      scale={0.86}
      rotation={[0.05, -0.86, 0]}
    >
      {/* Four walls and a floor, so the inside is genuinely hollow */}
      {[
        { pos: [0, H / 2, -D / 2 + WALL / 2], args: [W, H, WALL] },
        { pos: [0, H / 2, D / 2 - WALL / 2], args: [W, H, WALL] },
        { pos: [-W / 2 + WALL / 2, H / 2, 0], args: [WALL, H, D] },
        { pos: [W / 2 - WALL / 2, H / 2, 0], args: [WALL, H, D] },
      ].map((w, i) => (
        <RoundedBox
          key={i}
          args={w.args as [number, number, number]}
          radius={0.035}
          smoothness={2}
          position={w.pos as [number, number, number]}
          castShadow
          receiveShadow
        >
          {shell()}
        </RoundedBox>
      ))}
      <mesh position={[0, WALL / 2, 0]} receiveShadow>
        <boxGeometry args={[W - WALL, WALL, D - WALL]} />
        <meshStandardMaterial
          color={MAROON_DEEP}
          roughness={0.7 / GRAIN_MEAN}
          bumpMap={surf.grain}
          bumpScale={0.18}
          roughnessMap={surf.grain}
          envMapIntensity={0.1}
        />
      </mesh>
      {/* Lining on the floor */}
      <mesh
        position={[0, WALL + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[W - WALL * 3, D - WALL * 3]} />
        {cloth}
      </mesh>
      {/* Lining carried up the inside of each wall, so the base reads as a
          lined compartment rather than an open-bottomed shell. */}
      {[
        {
          pos: [0, H / 2, -D / 2 + WALL + 0.01],
          rot: [0, 0, 0],
          args: [W - WALL * 3, H - WALL],
        },
        {
          pos: [0, H / 2, D / 2 - WALL - 0.01],
          rot: [0, Math.PI, 0],
          args: [W - WALL * 3, H - WALL],
        },
        {
          pos: [-W / 2 + WALL + 0.01, H / 2, 0],
          rot: [0, Math.PI / 2, 0],
          args: [D - WALL * 3, H - WALL],
        },
        {
          pos: [W / 2 - WALL - 0.01, H / 2, 0],
          rot: [0, -Math.PI / 2, 0],
          args: [D - WALL * 3, H - WALL],
        },
      ].map((f, i) => (
        <mesh
          key={`lin${i}`}
          position={f.pos as [number, number, number]}
          rotation={f.rot as [number, number, number]}
          receiveShadow
        >
          <planeGeometry args={f.args as [number, number]} />
          {cloth}
        </mesh>
      ))}

      {/* Warm light inside the trunk, strongest while it is open. */}
      <pointLight
        ref={glow}
        position={[0, 0.85, 0.15]}
        color="#ffb067"
        distance={3.6}
        decay={2}
        intensity={1.1}
      />

      {/* Bands round the rim and the foot */}
      {[H - RAIL / 2, RAIL / 2 + 0.02].map((y, tier) =>
        [
          { pos: [0, y, D / 2 - WALL / 2], args: [W, RAIL, TRIM] },
          { pos: [0, y, -(D / 2 - WALL / 2)], args: [W, RAIL, TRIM] },
          { pos: [W / 2 - WALL / 2, y, 0], args: [TRIM, RAIL, D] },
          { pos: [-(W / 2 - WALL / 2), y, 0], args: [TRIM, RAIL, D] },
        ].map((r, i) => (
          <mesh
            key={`frame${tier}${i}`}
            position={r.pos as [number, number, number]}
          >
            <boxGeometry args={r.args as [number, number, number]} />
            {gold}
          </mesh>
        )),
      )}
      {/* Corner caps, top and bottom: the part of a trunk that takes the knocks */}
      {corners.map(([sx, sz]) =>
        [0.13, H - 0.13].map((y) => (
          <RoundedBox
            key={`cc${sx}${sz}${y}`}
            args={[0.21, 0.23, 0.21]}
            radius={0.045}
            smoothness={2}
            position={[sx * (W / 2 - 0.045), y, sz * (D / 2 - 0.045)]}
          >
            {gold}
          </RoundedBox>
        )),
      )}
      {/* Straps down the front and back */}
      {[-1, 1].flatMap((sx) =>
        [1, -1].map((sz) => (
          <RoundedBox
            key={`strap${sx}${sz}`}
            args={[0.16, H - 0.1, 0.03]}
            radius={0.012}
            smoothness={2}
            position={[sx * 1.0, H / 2, sz * (D / 2 + 0.01)]}
          >
            {gold}
          </RoundedBox>
        )),
      )}
      <Rivets points={bodyRivets} material={gold} />

      {/* Bun feet */}
      {corners.map(([sx, sz]) => (
        <mesh
          key={`foot${sx}${sz}`}
          position={[sx * (W / 2 - 0.2), -0.025, sz * (D / 2 - 0.2)]}
          scale={[1, 0.7, 1]}
        >
          <sphereGeometry args={[0.105, 16, 12]} />
          {goldDark}
        </mesh>
      ))}

      {/* The lock is the logo: a solid brass monogram, a key by design, mounted
          where a lock plate would be. */}
      <mesh
        geometry={lock}
        position={[0, 0.5, D / 2 + 0.004]}
        castShadow
        receiveShadow
      >
        {goldDS}
      </mesh>

      {/* A carrying handle on each end: a bar held off the wall by two posts */}
      {[-1, 1].map((sx) => (
        <group key={`handle${sx}`} position={[sx * (W / 2), H * 0.56, 0]}>
          {[-0.26, 0.26].map((z) => (
            <mesh
              key={z}
              position={[sx * 0.07, 0, z]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.032, 0.04, 0.14, 12]} />
              {gold}
            </mesh>
          ))}
          <mesh
            position={[sx * 0.15, 0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.03, 0.03, 0.58, 14]} />
            {goldDark}
          </mesh>
        </group>
      ))}

      {/* Items live inside the body, so the walls clip them as they land */}
      <Suspense fallback={null}>
        {items.map((url, i) => (
          <PackedItem key={url} url={url} index={i} step={step} pack={pack} />
        ))}
      </Suspense>

      {/* Lid — hinged on the back rim. A vaulted shell, built from the outline. */}
      <group ref={lid} position={[0, H, -D / 2]}>
        <mesh geometry={lidGeo.outer} castShadow receiveShadow>
          {shell(THREE.DoubleSide)}
        </mesh>
        {lidGeo.endOut.map((g, i) => (
          <mesh key={`eo${i}`} geometry={g} castShadow receiveShadow>
            {shell(THREE.DoubleSide)}
          </mesh>
        ))}
        {/* Lining under the vault, and on the inside of each end panel */}
        <mesh geometry={lidGeo.lining} receiveShadow>
          {cloth}
        </mesh>
        {lidGeo.endIn.map((g, i) => (
          <mesh key={`ei${i}`} geometry={g} receiveShadow>
            {cloth}
          </mesh>
        ))}

        {/* Brass bands following the curve, riveted down both edges */}
        {lidGeo.bands.map((g, i) => (
          <mesh key={`band${i}`} geometry={g}>
            {goldDS}
          </mesh>
        ))}
        <Rivets points={lidGeo.rivets} material={gold} radius={0.022} />

        {/* A band round the mouth of the lid, and the corner caps */}
        {[
          { pos: [0, 0.026, D - WALL / 2], args: [W, 0.052, TRIM] },
          { pos: [0, 0.026, WALL / 2], args: [W, 0.052, TRIM] },
          { pos: [W / 2 - WALL / 2, 0.026, D / 2], args: [TRIM, 0.052, D] },
          { pos: [-(W / 2 - WALL / 2), 0.026, D / 2], args: [TRIM, 0.052, D] },
        ].map((r, i) => (
          <mesh key={`mouth${i}`} position={r.pos as [number, number, number]}>
            <boxGeometry args={r.args as [number, number, number]} />
            {gold}
          </mesh>
        ))}
        {corners.map(([sx, sz]) => (
          <RoundedBox
            key={`lc${sx}${sz}`}
            args={[0.21, 0.2, 0.21]}
            radius={0.045}
            smoothness={2}
            position={[sx * (W / 2 - 0.045), 0.1, sz > 0 ? D - 0.045 : 0.045]}
          >
            {gold}
          </RoundedBox>
        ))}

        {/* The catch: a small tab hanging from the lid, closing just above the lock */}
        <RoundedBox
          args={[0.2, 0.3, 0.035]}
          radius={0.03}
          smoothness={2}
          position={[0, -0.06, D + 0.05]}
          castShadow
        >
          {gold}
        </RoundedBox>
        <mesh position={[0, -0.16, D + 0.073]}>
          <circleGeometry args={[0.02, 16]} />
          {goldDark}
        </mesh>
      </group>
    </group>
  );
}

/** A little parallax: the camera leans toward the pointer and settles back. */
function Rig() {
  useFrame((state) => {
    const { camera, pointer } = state;
    camera.position.x += (3.0 + pointer.x * 0.5 - camera.position.x) * 0.04;
    camera.position.y += (4.5 + pointer.y * 0.3 - camera.position.y) * 0.04;
    camera.lookAt(0, 0.15, 0);
  });
  return null;
}

export default function TrunkScene({
  pack,
  items,
  active,
  onReady,
}: {
  pack: { current: number };
  items: string[];
  /** False while the act is off screen: the canvas stays mounted but idle. */
  active: boolean;
  /** Called once the first frame has been drawn, so the page can reveal the canvas. */
  onReady?: () => void;
}) {
  /**
   * Phones pay for every fragment twice over: a 3x device pixel ratio on a
   * canvas that already overhangs its column on both sides. Capping the ratio
   * at 1.5 and halving the shadow map roughly quarters the shading work, and
   * at phone size neither is visible. Read once — the renderer is created from
   * it, so re-reading on resize would mean tearing the context down.
   */
  const small = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <Canvas
      /* Events come from the page, not the canvas, so the canvas can sit over the
         page with pointer-events off (links and the cursor underneath keep working)
         and the camera still leans toward the pointer. */
      eventSource={document.body}
      eventPrefix="client"
      /* "percentage" is PCFShadowMap. R3F's default for `shadows` is
         PCFSoftShadowMap, which three removed in 0.186 — it silently falls
         back to PCFShadowMap and warns on every renderer it builds. Asking
         for the fallback directly renders identically and stays quiet. */
      shadows="percentage"
      /* "demand" rather than "never" while off screen: the scene still draws its first
         frame, so a canvas that mounts before it is in view is not blank when it arrives. */
      frameloop={active ? "always" : "demand"}
      onCreated={({ invalidate }) => {
        invalidate();
        // Two frames: one to build, one that is certainly on screen.
        requestAnimationFrame(() => requestAnimationFrame(() => onReady?.()));
      }}
      dpr={small ? [1, 1.25] : [1, 1.5]}
      camera={{ position: [3.0, 4.5, 6.9], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Studio />
      <Rig />
      {/* Lower than it was: the environment now supplies most of the ambient
          term, and leaving this at 0.85 on top of it flattened the shading. */}
      {/* Warm, but only just: a fully golden ambient tipped the whole trunk
          orange against the page's cream, which reads as a colour cast rather
          than as warm light. */}
      <ambientLight intensity={0.42} color="#f7efe6" />
      <directionalLight
        position={[3.4, 6, 6.2]}
        intensity={1.5}
        color="#fff8ee"
        castShadow
        shadow-mapSize={small ? [512, 512] : [1024, 1024]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      {/* Fill swung round to the front-left. It used to sit behind and to the
          left, which left the whole front face to the key alone and gave the
          panels their flat, evenly-lit look. */}
      <directionalLight
        position={[-4.5, 2.2, 4]}
        intensity={0.7}
        color={FILL}
      />
      {/* Bounce off the cream ground the trunk sits on, throwing warmth back
          up under the lid and into the lower half of the body. */}
      <directionalLight
        position={[0, -3, 3.5]}
        intensity={0.32}
        color="#f1e6da"
      />
      {/* Low rim from behind, to peel the silhouette off the cream page rather
          than leaving it a flat cut-out shape. */}
      <directionalLight
        position={[-2, 1.2, -6]}
        intensity={0.45}
        color={LINING}
      />
      <Trunk pack={pack} items={items} />
      <ContactShadows
        position={[0, -0.86, 0]}
        opacity={0.26}
        scale={10}
        blur={4.2}
        resolution={256}
        far={4}
        color={MAROON_DEEP}
      />
    </Canvas>
  );
}

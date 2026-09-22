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
import type { Group, Mesh } from "three";

/** Lid travel, in radians. Past ~1.5 it reads as a chair back, not a trunk. */
const MAX_OPEN = 1.38;

const W = 3.3; // width
const H = 1.02; // body height — shallow enough to see the floor from above
const D = 2.0; // depth
const LID_H = 0.42; // shallow, like a vintage case lid
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
 * How far trim stands proud of the surface it is fixed to.
 *
 * Not decoration — it is what keeps faces out of the same plane. The rule for
 * this frame is that no two visible faces may be coplanar: a piece either
 * stands clear of its neighbour or ends buried inside it. On the body that
 * happened by accident, because the rim and foot rails swallow the posts'
 * ends. On the lid it did not: rails, posts and the top panel all finished at
 * exactly LID_H, and three coplanar surfaces is a depth buffer with no way to
 * choose between them — which is the striping across the closed lid.
 */
const PROUD = 0.014;

/**
 * These are the LIT colours, deliberately a step brighter than the brand
 * maroon. `map` can only ever multiply downward — there is no brightening
 * available — so a surface painted at the target colour and then tinted can
 * only get darker, and the variation disappears into a dark base. Painting
 * brighter and letting the patina map pull it back down averages out at the
 * brand colour while leaving real range either side of it.
 */
const MAROON = "#8a1e3c";
const MAROON_DEEP = "#5e132c";
/**
 * The brand value these average back to, kept for reference: #8a1f4b.
 *
 * Blue is held down relative to red here. An earlier pass compensated each
 * channel by the same factor, which pushed the rendered trunk toward magenta —
 * the shell read as purple rather than as the oxblood the brand colour is.
 */
const GOLD = "#c9a84e";
const GOLD_DARK = "#a8873a";
/**
 * Dusty rose, not the near-white petal: under the key light anything lighter
 * blows out to flat white and reads as plastic rather than lining.
 */
const LINING = "#d2a59c";
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
const GOLD_LEAF = "#c2a066";

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
        const k = m * 0.88;
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

function Trunk({
  pack,
  items,
}: {
  pack: { current: number };
  items: string[];
}) {
  const lid = useRef<Group>(null);
  const root = useRef<Group>(null);
  const step = stepFor(items.length);

  // Built once for the life of the canvas. One texture per pattern: UVs are
  // box-projected to a common world scale below, so nothing needs its own
  // repeat and there are no per-mesh clones.
  const surf = useMemo(() => buildSurfaces(), []);

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
  }, [surf]);

  // Nothing else holds these, so the canvas unmounting is the only chance to
  // give the GPU its memory back.
  useEffect(
    () => () => Object.values(surf).forEach((t) => t.dispose()),
    [surf],
  );

  useFrame(() => {
    const p = clamp01(pack.current);
    const shut = clamp01((p - LID_START) / (1 - LID_START));
    if (lid.current) lid.current.rotation.x = -(1 - easeOut(shut)) * MAX_OPEN;
    // Swings a good deal further round as it shuts than it used to: the act
    // ends on the closed trunk, and squaring it up to the viewer makes that
    // the deliberate final pose rather than a box that happens to be shut.
    if (root.current) root.current.rotation.y = -0.42 + easeOut(shut) * 0.26;
  });

  // Shared by the lid's panel and rim walls, which are now several meshes
  // rather than one slab.
  const shell = (
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
   * A proper metal now that there is a studio to reflect. metalness sits at
   * 0.95 rather than 0.85 — the lower value was compensating for the missing
   * environment by leaving a sliver of diffuse in, which is what gave the
   * hardware its flat, painted look. Roughness is up too: polished brass on a
   * trunk that has been packed and carried should be satin, not chrome.
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

  return (
    <group
      ref={root}
      position={[0, -0.85, 0]}
      scale={0.86}
      rotation={[0.05, -0.42, 0]}
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
          radius={0.02}
          smoothness={3}
          position={w.pos as [number, number, number]}
          castShadow
          receiveShadow
        >
          {shell}
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

      {/* Gold frame: a closed rectangle at the rim, another at the foot, and
          four posts joining them down the corners. The rim used to be two
          rails front and back only, which stopped dead at each corner. */}
      {[H, RAIL / 2].map((y, tier) =>
        [
          { pos: [0, y, D / 2 - WALL / 2], args: [W, RAIL, TRIM] },
          { pos: [0, y, -(D / 2 - WALL / 2)], args: [W, RAIL, TRIM] },
          { pos: [W / 2 - WALL / 2, y, 0], args: [TRIM, RAIL, D] },
          { pos: [-(W / 2 - WALL / 2), y, 0], args: [TRIM, RAIL, D] },
        ].map((r, i) => (
          <mesh
            key={`frame${tier}${i}`}
            position={r.pos as [number, number, number]}
            castShadow
          >
            <boxGeometry args={r.args as [number, number, number]} />
            {gold}
          </mesh>
        )),
      )}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`post${sx}${sz}`}
            position={[sx * (W / 2 - WALL / 2), H / 2, sz * (D / 2 - WALL / 2)]}
            castShadow
          >
            <boxGeometry args={[TRIM, H, TRIM]} />
            {gold}
          </mesh>
        )),
      )}

      {/* Front hardware: two corner latches and a centre handle */}
      {[-1, 1].map((s) => (
        <mesh
          key={`latch${s}`}
          position={[s * (W / 2 - 0.42), H - 0.2, D / 2 + 0.01]}
          castShadow
        >
          <boxGeometry args={[0.34, 0.3, 0.06]} />
          {gold}
        </mesh>
      ))}
      <mesh position={[0, H - 0.22, D / 2 + 0.01]} castShadow>
        <boxGeometry args={[0.26, 0.2, 0.05]} />
        {gold}
      </mesh>
      <mesh
        position={[0, H - 0.52, D / 2 + 0.03]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[0.22, 0.035, 12, 24, Math.PI]} />
        <meshStandardMaterial
          color={GOLD_DARK}
          roughness={0.3 / BRASS_MEAN}
          metalness={0.96}
          map={surf.brassTint}
          roughnessMap={surf.brass}
          envMapIntensity={1.3}
        />
      </mesh>

      {/* Items live inside the body, so the walls clip them as they land */}
      <Suspense fallback={null}>
        {items.map((url, i) => (
          <PackedItem key={url} url={url} index={i} step={step} pack={pack} />
        ))}
      </Suspense>

      {/* Lid — hinged on the back rim */}
      <group ref={lid} position={[0, H, -D / 2]}>
        {/* The lid is a shallow box in its own right, not a slab: a top
            panel and four rim walls, built the same way as the body below.
            It used to be one solid RoundedBox with a flat lining plane
            stretched across its mouth, which looked right only while shut —
            open it and you were looking at a flat panel where the inside of
            a trunk lid should be. */}
        <RoundedBox
          args={[W, WALL, D]}
          radius={0.02}
          smoothness={3}
          position={[0, LID_H - WALL / 2, D / 2]}
          castShadow
          receiveShadow
        >
          {shell}
        </RoundedBox>
        {[
          {
            pos: [0, (LID_H - WALL) / 2, WALL / 2],
            args: [W, LID_H - WALL, WALL],
          },
          {
            pos: [0, (LID_H - WALL) / 2, D - WALL / 2],
            args: [W, LID_H - WALL, WALL],
          },
          {
            pos: [-W / 2 + WALL / 2, (LID_H - WALL) / 2, D / 2],
            args: [WALL, LID_H - WALL, D],
          },
          {
            pos: [W / 2 - WALL / 2, (LID_H - WALL) / 2, D / 2],
            args: [WALL, LID_H - WALL, D],
          },
        ].map((w, i) => (
          <RoundedBox
            key={`lidwall${i}`}
            args={w.args as [number, number, number]}
            radius={0.02}
            smoothness={3}
            position={w.pos as [number, number, number]}
            castShadow
            receiveShadow
          >
            {shell}
          </RoundedBox>
        ))}
        {/* Lining, recessed under the top panel rather than across the mouth */}
        <mesh
          position={[0, LID_H - WALL - 0.01, D / 2]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[W - WALL * 3, D - WALL * 3]} />
          {cloth}
        </mesh>
        {/* and carried down the inside of the rim, as in the body */}
        {[
          {
            pos: [0, (LID_H - WALL) / 2, WALL + 0.01],
            rot: [0, 0, 0],
            args: [W - WALL * 3, LID_H - WALL * 2],
          },
          {
            pos: [0, (LID_H - WALL) / 2, D - WALL - 0.01],
            rot: [0, Math.PI, 0],
            args: [W - WALL * 3, LID_H - WALL * 2],
          },
          {
            pos: [-W / 2 + WALL + 0.01, (LID_H - WALL) / 2, D / 2],
            rot: [0, Math.PI / 2, 0],
            args: [D - WALL * 3, LID_H - WALL * 2],
          },
          {
            pos: [W / 2 - WALL - 0.01, (LID_H - WALL) / 2, D / 2],
            rot: [0, -Math.PI / 2, 0],
            args: [D - WALL * 3, LID_H - WALL * 2],
          },
        ].map((f, i) => (
          <mesh
            key={`lidlin${i}`}
            position={f.pos as [number, number, number]}
            rotation={f.rot as [number, number, number]}
            receiveShadow
          >
            <planeGeometry args={f.args as [number, number]} />
            {cloth}
          </mesh>
        ))}
        {/* The lid carries the same frame on the same x/z offsets, so when it
            shuts its posts sit directly over the body's and the gold reads as
            one run from foot to lid rather than two separate cages. */}
        {[
          {
            pos: [0, LID_H + PROUD - RAIL / 2, WALL / 2],
            args: [W, RAIL, TRIM],
          },
          {
            pos: [0, LID_H + PROUD - RAIL / 2, D - WALL / 2],
            args: [W, RAIL, TRIM],
          },
          {
            pos: [W / 2 - WALL / 2, LID_H + PROUD - RAIL / 2, D / 2],
            args: [TRIM, RAIL, D],
          },
          {
            pos: [-(W / 2 - WALL / 2), LID_H + PROUD - RAIL / 2, D / 2],
            args: [TRIM, RAIL, D],
          },
        ].map((r, i) => (
          <mesh
            key={`lidframe${i}`}
            position={r.pos as [number, number, number]}
            castShadow
          >
            <boxGeometry args={r.args as [number, number, number]} />
            {gold}
          </mesh>
        ))}
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh
              key={`lidpost${sx}${sz}`}
              /* Top ends inside the rail above it, bottom pokes just below
                 the lid's lower edge — so neither end is flush with anything. */
              position={[
                sx * (W / 2 - WALL / 2),
                (LID_H - 0.028) / 2,
                sz === 1 ? D - WALL / 2 : WALL / 2,
              ]}
              castShadow
            >
              <boxGeometry args={[TRIM, LID_H - 0.012, TRIM]} />
              {gold}
            </mesh>
          )),
        )}
        {[-1, 1].map((s) => (
          <mesh
            key={`lt${s}`}
            position={[s * (W / 2 - 0.42), LID_H / 2, D - 0.02]}
            castShadow
          >
            <boxGeometry args={[0.34, LID_H - 0.08, 0.06]} />
            {gold}
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function TrunkScene({
  pack,
  items,
  active,
}: {
  pack: { current: number };
  items: string[];
  /** False while the act is off screen: the canvas stays mounted but idle. */
  active: boolean;
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
      /* "percentage" is PCFShadowMap. R3F's default for `shadows` is
         PCFSoftShadowMap, which three removed in 0.186 — it silently falls
         back to PCFShadowMap and warns on every renderer it builds. Asking
         for the fallback directly renders identically and stays quiet. */
      shadows="percentage"
      frameloop={active ? "always" : "never"}
      dpr={small ? [1, 1.5] : [1, 2]}
      camera={{ position: [3.0, 4.5, 6.9], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Studio />
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
        far={4}
        color={MAROON_DEEP}
      />
    </Canvas>
  );
}

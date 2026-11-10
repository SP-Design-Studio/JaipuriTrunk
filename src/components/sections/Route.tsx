"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Charminar from "@/components/Charminar";
import HawaMahal from "@/components/HawaMahal";
import { launchLabel, site } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TRUNK = "/images/atmosphere/trunk.webp";

type Pt = readonly [number, number];
type Geometry = {
  /** Suffix for this geometry's classes, so each SVG is driven on its own. */
  key: "h" | "v";
  /** The route, in viewBox units: a cubic Bezier from Jaipur's side to Hyderabad's. */
  P: readonly [Pt, Pt, Pt, Pt];
  viewBox: string;
  /** The trunk image box, in viewBox units, relative to the point it rides. */
  trunk: { x: number; y: number; w: number; h: number };
  /** Whether the trunk leans into the climb and the descent. */
  lean: boolean;
};

/** Wide screens run west to east along an arc; phones run top to bottom along a straight line. */
const GEOMETRIES: Geometry[] = [
  {
    key: "h",
    P: [
      [30, 262],
      [300, -34],
      [700, -34],
      [970, 262],
    ],
    viewBox: "0 -60 1000 350",
    trunk: { x: -70, y: -122, w: 140, h: 125 },
    lean: true,
  },
  {
    key: "v",
    P: [
      [160, 8],
      [160, 109],
      [160, 211],
      [160, 312],
    ],
    viewBox: "0 -20 320 360",
    trunk: { x: -48, y: -43, w: 96, h: 86 },
    lean: false,
  },
];

const bez = (P: Geometry["P"], t: number, i: 0 | 1) => {
  const u = 1 - t;
  return (
    u ** 3 * P[0][i] +
    3 * u ** 2 * t * P[1][i] +
    3 * u * t ** 2 * P[2][i] +
    t ** 3 * P[3][i]
  );
};
/** The curve's direction at t, in degrees. */
const heading = (P: Geometry["P"], t: number) => {
  const u = 1 - t;
  const d = (i: 0 | 1) =>
    3 * u ** 2 * (P[1][i] - P[0][i]) +
    6 * u * t * (P[2][i] - P[1][i]) +
    3 * t ** 2 * (P[3][i] - P[2][i]);
  return (Math.atan2(d(1), d(0)) * 180) / Math.PI;
};
const pathOf = (P: Geometry["P"]) => `M${P[0]} C${P[1]} ${P[2]} ${P[3]}`;

/**
 * The route. A stitched line leaves Jaipur and the trunk rides it to Hyderabad as
 * the page scrolls. The scene is `position: sticky` inside a tall section, so the
 * scroll drives the trunk without anything being pinned by script.
 *
 * Reduced motion: the journey is shown finished, with no scroll dependence.
 */
export default function Route() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      const render = (p: number, all = false) => {
        // Only the geometry that is on screen: the other is display:none.
        const wide = window.innerWidth >= 768;
        for (const g of GEOMETRIES) {
          if (!all && (g.key === "h") !== wide) continue;
          const x = bez(g.P, p, 0);
          const y = bez(g.P, p, 1);
          // The trunk lands level: the lean eases out over the last stretch.
          const lean = g.lean
            ? heading(g.P, p) *
              0.45 *
              (1 - gsap.utils.clamp(0, 1, (p - 0.8) / 0.2))
            : 0;
          gsap.set(`.r-trunk-${g.key}`, { x, y, rotation: lean });
          gsap.set(`.r-mask-${g.key}`, { strokeDashoffset: 1 - p });
        }
        gsap.set(".r-land", {
          opacity: gsap.utils.clamp(0, 1, (p - 0.86) / 0.14),
        });
      };

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const state = { p: 0 };
        render(0);
        gsap.to(state, {
          p: 1,
          ease: "none",
          onUpdate: () => render(state.p),
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
          },
        });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => render(1, true));

      return () => mm.revert();
    },
    { scope: root },
  );

  const svg = (g: Geometry, className: string) => (
    <svg
      viewBox={g.viewBox}
      className={`absolute inset-0 h-full w-full overflow-visible ${className}`}
      aria-hidden="true"
    >
      <defs>
        <mask
          id={`route-mask-${g.key}`}
          maskUnits="userSpaceOnUse"
          x="-200"
          y="-200"
          width="1600"
          height="900"
        >
          <path
            className={`r-mask-${g.key}`}
            d={pathOf(g.P)}
            pathLength={1}
            fill="none"
            stroke="#fff"
            strokeWidth="16"
            strokeDasharray="1"
            strokeDashoffset="1"
          />
        </mask>
      </defs>
      {/* The whole route, faint, so the destination is always visible. */}
      <path
        d={pathOf(g.P)}
        fill="none"
        stroke="rgba(250,243,234,0.22)"
        strokeWidth="2"
        strokeDasharray="2 10"
        strokeLinecap="round"
      />
      {/* The stitches laid so far. */}
      <path
        d={pathOf(g.P)}
        fill="none"
        stroke="#f49b49"
        strokeWidth="3"
        strokeDasharray="2 10"
        strokeLinecap="round"
        mask={`url(#route-mask-${g.key})`}
      />
      <g className={`r-trunk-${g.key}`}>
        <image
          href={TRUNK}
          x={g.trunk.x}
          y={g.trunk.y}
          width={g.trunk.w}
          height={g.trunk.h}
        />
      </g>
    </svg>
  );

  const [wide, tall] = GEOMETRIES;

  return (
    <section
      ref={root}
      id="route"
      data-cursor-invert
      className="u-grain u-grain-dark bg-maroon text-cream relative h-[230svh] motion-reduce:h-auto"
    >
      <div className="sticky top-0 flex h-[100svh] flex-col justify-between overflow-hidden px-[var(--gutter)] pt-[max(4.5rem,calc(var(--space-section)*0.7))] pb-[max(var(--gutter),env(safe-area-inset-bottom))] motion-reduce:static motion-reduce:min-h-[100svh]">
        <div className="mx-auto w-full max-w-[1600px]">
          <h2 className="display max-w-[16ch] text-[clamp(2.2rem,6.4vw,6.2rem)] leading-[1.02]">
            Handpicked in{" "}
            <span className="text-marigold">{site.city.from}</span>. Unpacked in{" "}
            <span className="text-marigold">{site.city.to}</span>.
          </h2>
        </div>

        <div className="mx-auto w-full max-w-[1600px]">
          {/* Wide: Jaipur, the arc, Hyderabad, left to right. */}
          <div className="hidden grid-cols-[minmax(0,27%)_1fr_minmax(0,20%)] items-end gap-[1.5%] md:grid">
            <div className="aspect-[1968/1378]">
              <HawaMahal className="h-full w-full" />
            </div>
            <div className="relative aspect-[1000/350]">{svg(wide, "")}</div>
            <div className="aspect-[1124/1287]">
              <Charminar className="h-full w-full" />
            </div>
          </div>

          {/* Phone: Jaipur on top, a straight line, Hyderabad below. */}
          <div className="flex flex-col items-center md:hidden">
            <div className="aspect-[1968/1378] h-[14svh]">
              <HawaMahal className="h-full w-full" />
            </div>
            <div className="relative -my-1 aspect-[320/360] h-[27svh]">
              {svg(tall, "")}
            </div>
            <div className="aspect-[1124/1287] h-[17svh]">
              <Charminar className="h-full w-full" />
            </div>
          </div>

          <div className="border-cream/15 mt-[var(--space-2)] flex items-end justify-between gap-6 border-t pt-[var(--space-1)]">
            <p className="label text-cream/70">{site.city.from}</p>
            <p className="r-land label text-marigold text-center opacity-0 motion-reduce:opacity-100">
              Opens {launchLabel}
            </p>
            <p className="label text-cream/70 text-right">{site.city.to}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

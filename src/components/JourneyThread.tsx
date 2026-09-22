"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useHasAsset } from "@/components/AssetProvider";

gsap.registerPlugin(useGSAP);

/**
 * The journey, drawn as a line between the two cities — and then travelled.
 *
 * Not an arrow. An arrow is a diagram, and this page is a story: the line is a
 * running stitch leaving Jaipur, because the whole site is built on the idea
 * that these things are made by hand and Act 3 is about whose hands. It
 * becomes a strand of pearls as it reaches Hyderabad, which is the City of
 * Pearls and already has that motif in the trunk's beaded trim.
 *
 * Nothing here is a static picture of a route. The seam sews itself ahead of
 * the trunk, the trunk rides the curve, and each pearl is threaded as it
 * arrives — so the hero shows the journey happening rather than describing it.
 *
 * The curve is a cubic Bezier sampled once at module scope. Every stitch and
 * pearl keeps the `t` it was sampled at, which is what lets the frame loop ask
 * "has the trunk passed you yet?" without re-solving the curve each frame.
 */

const TRUNK = "/images/atmosphere/trunk.webp";

// The arc, in viewBox units. Deepened from a 112-unit rise to 140 once the
// route stopped spanning the whole hero: squeezed into the gap between the two
// facades it is about half as wide as it used to be, and at 5:1 a narrower box
// is a shorter box, so the old bow had flattened into not much of a gesture.
const P0 = [40, 172] as const;
const P1 = [320, 32] as const;
const P2 = [680, 32] as const;
const P3 = [960, 172] as const;

const LONG = 1000;
const SHORT = 200;

/**
 * Where the stitching gives out and the pearls begin — and where the trunk
 * comes to rest.
 *
 * Exactly 0.5, not 0.52. The curve is symmetric, so t=0.5 is the one value
 * that puts the trunk on the route's centre line and therefore under the
 * wordmark; 0.52 left it 17px to the right, which is small but visible when
 * everything above it is centred.
 */
const HANDOVER = 0.5;

function at(t: number): [number, number] {
  const u = 1 - t;
  const [a, b, c, d] = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [
    a * P0[0] + b * P1[0] + c * P2[0] + d * P3[0],
    a * P0[1] + b * P1[1] + c * P2[1] + d * P3[1],
  ];
}

/**
 * Horizontal runs the curve. Vertical runs straight down the middle.
 *
 * The bend is a map gesture — it reads as a route arcing across a country —
 * and it needs width to read as one. A phone gives the route a lane about
 * 60px wide, and in there the same curve stopped looking like an arc and
 * started looking like a wobble: the line bowed to one side and the trunk came
 * to rest at 36% across instead of on the centre line, which read as badly
 * aligned rather than as travelling.
 *
 * Note the vertical route is not the horizontal one rotated. Rotating the
 * container would tip the trunk onto its side, and the trunk is a photograph
 * of a box — it has an up.
 */
function orient(vertical: boolean) {
  const viewW = vertical ? SHORT : LONG;
  const viewH = vertical ? LONG : SHORT;
  const point = (t: number): [number, number] =>
    vertical ? [SHORT / 2, P0[0] + t * (P3[0] - P0[0])] : at(t);
  return { viewW, viewH, point };
}

/**
 * Jaipur side: discrete stitches rather than one dashed path.
 *
 * A dashed path is a single element and can only fade as a whole. Individual
 * segments each carry the `t` they were sampled at, so they can be threaded
 * one at a time as the trunk reaches them — which is the difference between a
 * line that appears and a seam that is being sewn.
 */
const stitchesFor = (vertical: boolean) => {
  const { point } = orient(vertical);
  return Array.from({ length: 17 }, (_, i) => {
    const t0 = (i / 17) * HANDOVER;
    const t1 = ((i + 0.55) / 17) * HANDOVER;
    const [x0, y0] = point(t0);
    const [x1, y1] = point(t1);
    return { x0, y0, x1, y1, t: t0 };
  });
};

/** Hyderabad side: pearls, graded slightly larger as they arrive. */
const pearlsFor = (vertical: boolean) => {
  const { point } = orient(vertical);
  return Array.from({ length: 16 }, (_, i) => {
    const k = i / 15;
    const t = HANDOVER + k * (1 - HANDOVER);
    const [x, y] = point(t);
    return { x, y, r: 3.1 + k * 1.5, t };
  });
};

const GEOMETRY = {
  horizontal: {
    ...orient(false),
    stitches: stitchesFor(false),
    pearls: pearlsFor(false),
  },
  vertical: {
    ...orient(true),
    stitches: stitchesFor(true),
    pearls: pearlsFor(true),
  },
};

/**
 * Seconds for the one Jaipur-to-Hyderabad run, and the beat before it starts.
 *
 * It runs once. A loop meant the trunk kept leaving a city it had already
 * arrived in, and no amount of easing or fading made that stop reading as a
 * sprite on a track.
 *
 * The run is in two halves because the trunk and the route stop at different
 * places. The trunk travels as far as the handover and rests there, in the
 * middle, between the two cities. The route carries on without it and finishes
 * at Hyderabad. That is the more honest picture anyway: the first trunk is
 * still on its way, and the thing at the far end is the destination, not an
 * arrival that has already happened.
 */
const RUN = 7.2;
const LEAD_IN = 0.6;
/** Share of the run spent moving. The rest threads the pearls on ahead. */
const TRAVEL = 0.64;

/**
 * How far the trunk leans into the curve, in degrees at the steepest point.
 *
 * Without it the trunk slides along perfectly upright, which is what made the
 * motion read as a sprite being dragged rather than something traveling. Kept
 * small: this is a heavy box on a journey, not a paper plane.
 */
const BANK = 7;

export default function JourneyThread({
  className = "",
  vertical = false,
}: {
  className?: string;
  /** Runs top-to-bottom instead of left-to-right. Used on phones, where two
      facades side by side leave the route no room to travel. */
  vertical?: boolean;
}) {
  const geo = vertical ? GEOMETRY.vertical : GEOMETRY.horizontal;
  const hasTrunk = useHasAsset(TRUNK);
  /** Whether the trunk is currently saying its name. */
  const [named, setNamed] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trunk = useRef<HTMLDivElement>(null);

  /**
   * Each orientation's animation is bound to the breakpoint that shows it.
   *
   * Both copies are always mounted and CSS picks one, so this used to test
   * `offsetParent` once and bail if the copy was hidden. That is only correct
   * for the width the page happened to load at. Resize across the breakpoint —
   * devtools responsive mode, a tablet rotating, a desktop window dragged
   * narrow — and the layout switched while the animations did not: the newly
   * visible route stayed at opacity 0 with its trunk parked at the CSS
   * default, and the now-hidden one went on animating where nobody could see
   * it.
   *
   * gsap.matchMedia builds on entering the query and reverts on leaving, so
   * the live layout is always the animated one.
   */
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(vertical ? "(max-width: 767px)" : "(min-width: 768px)", () => {
        const stitches = gsap.utils.toArray<SVGLineElement>(".jt-stitch");
        const pearls = gsap.utils.toArray<SVGCircleElement>(".jt-pearl");
        const cart = trunk.current;

        // The trunk stops at the handover; the route keeps going. Clamping here
        // rather than in the timeline means every caller of `place` — including
        // the reduced-motion branch — parks it in the same spot.
        const place = (raw: number) => {
          if (!cart) return;
          const t = Math.min(raw, HANDOVER);
          const [x, y] = geo.point(t);
          cart.style.left = `${(x / geo.viewW) * 100}%`;
          cart.style.top = `${(y / geo.viewH) * 100}%`;

          // Lean into the slope. The tangent is taken as a short chord rather
          // than by differentiating, which is accurate enough at this size and
          // keeps the curve maths in one place.
          const [ax, ay] = geo.point(Math.max(0, t - 0.02));
          const [bx, by] = geo.point(Math.min(1, t + 0.02));
          // Travelling down a vertical route, the lean comes from sideways drift
          // rather than from rise over run.
          const slope = vertical
            ? -(bx - ax) / Math.max(1e-6, by - ay)
            : (by - ay) / Math.max(1e-6, bx - ax);
          cart.style.rotate = `${Math.max(-BANK, Math.min(BANK, slope * BANK * 1.6))}deg`;
        };

        // Reduced motion gets the finished route: everything threaded, the trunk
        // parked at the handover. The story still reads, nothing moves.
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          gsap.set(stitches, { opacity: 0.8 });
          gsap.set(pearls, { opacity: 1 });
          place(HANDOVER);
          return;
        }

        const progress = { t: 0 };
        place(0);
        gsap.set(stitches, { opacity: 0 });
        gsap.set(pearls, { opacity: 0, scale: 0.4, transformOrigin: "center" });

        /**
         * Each mark is tweened only when it crosses the trunk, not every frame.
         * The `data-on` flag is what makes that possible: without it this would
         * start 33 identical tweens per frame and GSAP would spend its time
         * overwriting them.
         */
        const paint = () => {
          const t = progress.t;
          place(t);

          stitches.forEach((s, i) => {
            // A little lead, so the seam is laid just ahead of the trunk rather
            // than appearing out from under it.
            const on = t > geo.stitches[i].t - 0.015;
            if (s.dataset.on === String(on)) return;
            s.dataset.on = String(on);
            gsap.to(s, {
              opacity: on ? 0.8 : 0,
              duration: 0.3,
              overwrite: true,
            });
          });

          pearls.forEach((p, i) => {
            const on = t > geo.pearls[i].t - 0.01;
            if (p.dataset.on === String(on)) return;
            p.dataset.on = String(on);
            gsap.to(p, {
              opacity: on ? 0.55 + (i / geo.pearls.length) * 0.4 : 0,
              scale: on ? 1 : 0.4,
              duration: 0.45,
              ease: on ? "back.out(2.6)" : "power2.in",
              overwrite: true,
            });
          });
        };

        // One run, and it stays where it lands: `paint` leaves every mark on and
        // the trunk resting mid-route, so there is nothing to reset and nothing
        // to snap back.
        //
        // Two tweens rather than one, so the trunk eases to a standstill at the
        // handover instead of stopping dead at full speed — a single tween is
        // moving fastest exactly where the trunk needs to stop.
        gsap
          .timeline({ delay: LEAD_IN })
          .to(progress, {
            t: HANDOVER,
            duration: RUN * TRAVEL,
            ease: "power1.inOut",
            onUpdate: paint,
          })
          .to(progress, {
            t: 1,
            duration: RUN * (1 - TRAVEL),
            ease: "power1.out",
            onUpdate: paint,
          });
      });

      return () => mm.revert();
    },
    { scope: root, dependencies: [geo, vertical] },
  );

  return (
    <div ref={root} className={className}>
      <svg
        viewBox={`0 0 ${geo.viewW} ${geo.viewH}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        className="h-full w-full overflow-visible"
        fill="none"
      >
        {geo.stitches.map((s, i) => (
          <line
            key={i}
            className="jt-stitch"
            x1={s.x0}
            y1={s.y0}
            x2={s.x1}
            y2={s.y1}
            stroke="var(--color-rose)"
            strokeWidth={2.2}
            strokeLinecap="round"
            opacity={0}
          />
        ))}

        {geo.pearls.map((p, i) => (
          <circle
            key={i}
            className="jt-pearl"
            cx={p.x}
            cy={p.y}
            r={p.r}
            fill="var(--color-sand)"
            stroke="var(--color-maroon)"
            strokeWidth={0.7}
            opacity={0}
          />
        ))}
      </svg>

      {hasTrunk && (
        <div
          ref={trunk}
          /**
           * Sized against the viewport when vertical, not against the lane.
           *
           * A percentage works horizontally because the lane's width is its
           * long axis. Vertically that flips: the lane is the curve's narrow
           * cross-section — about 60px on a phone — and 16% of it drew a
           * ten-pixel trunk. Nothing constrains the trunk to the lane, so it
           * takes its size from the screen and is simply allowed to overhang.
           *
           * Both widths are ~27% larger than they look, because the die-cut
           * border pads the artwork: the trunk fills 79% of its frame, not all
           * of it. These numbers keep the trunk the same size on screen as it
           * was before it became a sticker.
           */
          className={`pointer-events-auto absolute aspect-[896/798] -translate-x-1/2 -translate-y-1/2 ${
            vertical ? "w-[20vw] max-w-[100px]" : "w-[20%]"
          }`}
          style={{ left: "50%", top: "36%" }}
          /* Hover names it on a mouse. Touch has no hover, so a tap toggles
             instead — and the pointerType check keeps a tap from firing both. */
          onPointerEnter={(e) => e.pointerType === "mouse" && setNamed(true)}
          onPointerLeave={(e) => e.pointerType === "mouse" && setNamed(false)}
          onPointerDown={(e) =>
            e.pointerType !== "mouse" && setNamed((v) => !v)
          }
        >
          {/* The lift lives on a wrapper because GSAP owns the outer element's
              left/top/rotate, and a transform here would be overwritten every
              frame of the run. */}
          <div
            className="relative h-full w-full transition-transform duration-500 ease-out"
            style={{
              transform: named ? "translateY(-6%) scale(1.06)" : "none",
            }}
          >
            <Image
              src={TRUNK}
              alt=""
              aria-hidden="true"
              fill
              /* Above the fold in the hero, so it loads eagerly like the facades
               do. Left lazy it never triggered at all and the route ran with a
               gap where the trunk should be. `priority` is deprecated in Next
               16; `loading` is what the docs point to when more than one image
               could be the LCP element depending on the viewport. */
              loading="eager"
              sizes={vertical ? "100px" : "160px"}
              className="object-contain select-none"
              style={{
                filter:
                  "drop-shadow(0 10px 16px color-mix(in srgb, var(--color-maroon) 22%, transparent))",
              }}
            />
          </div>

          {/* The trunk is the brand mark, so touching it says the brand. Set
              in the wordmark's own two-tone display face rather than as a
              tooltip, because it is a signature, not a hint. */}
          <span
            aria-hidden="true"
            className="font-display pointer-events-none absolute top-full left-1/2 mt-[0.4em] block -translate-x-1/2 text-center whitespace-nowrap transition-all duration-500 ease-out"
            /* The -50% centring stays in the class, and this sets only the
               rise. Tailwind v4 compiles `-translate-x-1/2` to the standalone
               CSS `translate` property, not to `transform` — so an inline
               `transform: translate(-50%, …)` does not override it, it composes
               with it. The label was being shifted a full -100% and sat half
               its own width left of the trunk. `translate` resolves before
               `transform`, so the two now stack to exactly translate(-50%, y). */
            style={{
              fontSize: "clamp(0.82rem, 1.5vw, 1.15rem)",
              opacity: named ? 1 : 0,
              transform: `translateY(${named ? "0" : "-0.35em"})`,
            }}
          >
            <span className="text-maroon">Jaipuri</span>
            <span className="text-olive">&nbsp;Trunk</span>
          </span>
        </div>
      )}
    </div>
  );
}

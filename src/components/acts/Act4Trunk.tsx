"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Trunk from "@/components/Trunk";
import { acts } from "@/lib/site";
import { allItems, photographedItems } from "@/lib/products";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const act = acts[3];
const CONTENTS = allItems.map((item) => item.name);

/** Every product we have a photo of gets packed into the trunk. */
const PACKED = photographedItems.map((item) => item.src);

/**
 * Three.js is a separate client chunk, fetched only once Act 4 is close to the
 * viewport — it never touches the initial bundle. `ssr: false` is required:
 * WebGL cannot prerender.
 */
const TrunkScene = dynamic(() => import("@/components/three/TrunkScene"), {
  ssr: false,
  // Deliberately nothing. Showing the flat SVG here meant a visibly different
  // trunk appeared and then swapped once the chunk landed. The wrapper reserves
  // the space, so an empty beat costs no layout shift and reads as loading.
  loading: () => null,
});

/** Some browsers and locked-down devices have no WebGL; fall back to the SVG. */
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function Act4Trunk() {
  const root = useRef<HTMLElement>(null);
  /** The trunk column. Observed instead of the section, which ScrollTrigger
      re-parents into a pin-spacer — an unreliable IntersectionObserver target. */
  const host = useRef<HTMLDivElement>(null);
  /** 0 = empty and open, 1 = packed and shut. Driven by GSAP, read per frame. */
  const pack = useRef(0);
  const [use3D, setUse3D] = useState(false);
  const [inView, setInView] = useState(false);

  /**
   * Mount the canvas early — on idle, shortly after first paint — rather than
   * when Act 4 comes into range. Waiting left a measurable window (~1s in dev,
   * ~180ms in production) where the section was on screen with nothing in it:
   * scroll down and the trunk was missing, scroll back up and it had appeared.
   *
   * Mounting early costs nothing while it is off screen because the render loop
   * is parked until `inView` (see below).
   */
  useEffect(() => {
    const warm = () => {
      if (!hasWebGL()) return;
      void import("@/components/three/TrunkScene").then(() => setUse3D(true));
    };
    // `in` would narrow window to never in the else branch, since the DOM lib
    // declares requestIdleCallback as non-optional.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(warm, 1200);
    return () => window.clearTimeout(t);
  }, []);

  /** Drive the render loop only while the act is near the viewport. */
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      {
        rootMargin: "100% 0px",
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const tl = gsap.timeline({
        scrollTrigger: reduce
          ? { trigger: root.current, start: "top 70%" }
          : {
              trigger: root.current,
              start: "top top",
              end: "+=260%",
              pin: true,
              scrub: 1,
              anticipatePin: 1,
            },
      });

      tl.from(".a4-item", {
        y: 24,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.07,
      })
        // GSAP writes straight into the ref; the scene reads it each frame, so
        // packing never triggers a React render.
        .to(pack, { current: 1, duration: 3, ease: "none" }, 0.3)
        .to(
          ".a4-seal",
          { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" },
          3.1,
        );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="trunk"
      className="u-grain relative flex h-[100lvh] items-center overflow-hidden bg-cream"
      /* A skirt of the section's own colour below it.
           
           `overflow-hidden` clips children but not the element's own shadow, and
           a shadow costs no layout, so this paints past the bottom edge without
           changing a single measurement. If a pin is ever measured short again —
           a font swapping late, a toolbar settling, a browser we have not seen —
           the reader sees more of this act rather than a strip of the next one.
           The following section paints over it in normal flow, so it is only
           ever visible in the gap it exists to fill. */
      style={{ boxShadow: "0 20vh 0 0 var(--color-cream)" }}
    >
      <div className="mx-auto grid w-full max-w-[1400px] 2xl:max-w-[1720px] grid-cols-1 items-center gap-[6vh] px-[clamp(1.5rem,6vw,4rem)] md:grid-cols-[0.85fr_1fr] md:gap-[clamp(1.5rem,4vw,3.5rem)]">
        {/* Copy */}
        <div className="text-center md:ml-auto md:max-w-[32rem] md:text-left">
          <h2>
            <span className="font-display text-maroon block text-[clamp(2.2rem,5vw,3.6rem)]">
              {act.label}
            </span>
            <span className="text-olive mt-3 block text-[clamp(0.8rem,1.45vw,1rem)] tracking-[0.3em] uppercase">
              {act.sub}
            </span>
          </h2>

          <ul className="mt-8 flex max-w-[460px] flex-wrap justify-center gap-x-6 gap-y-2 md:mx-0 md:justify-start">
            {CONTENTS.map((c) => (
              <li
                key={c}
                className="a4-item font-display text-olive text-[clamp(0.88rem,1.7vw,1.15rem)] tracking-wide"
              >
                {c}
              </li>
            ))}
          </ul>

          {/* `translate-y-4` would have left this 16px low forever: Tailwind v4
              compiles it to the standalone `translate` property, and the tween
              animating `y` only ever reaches `transform`. The offset lives
              inline so the tween can actually undo it. */}
          <p
            className="a4-seal text-ink/65 mx-auto mt-8 max-w-sm text-[clamp(0.95rem,1.8vw,1.08rem)] leading-relaxed font-light opacity-0 md:mx-0"
            style={{ transform: "translateY(1rem)" }}
          >
            Packed in Jaipur on a Tuesday and put on the train south.
          </p>
        </div>

        {/* The trunk packs itself as you scroll */}
        <div
          ref={host}
          /* Capped against the height the copy leaves, the same way Act 3's
             cluster is. Stacked single-column, a full-width square canvas plus
             the twelve-item list overran a 667pt phone by 64px once the type
             came up — and this act is pinned at h-[100lvh], so it clips rather
             than scrolls. Taller phones are unaffected: the width still wins
             the min(). */
          className="relative mx-auto aspect-square w-full max-w-[min(100%,calc(100svh-26rem))] md:aspect-4/3 md:max-w-none"
        >
          {use3D ? (
            /* The canvas reaches well past the column on every side. A WebGL
               canvas clips hard at its own edge, so if it ended at the column
               the trunk would be sliced and items would pop into existence on
               a visible seam. Out here the edges fall off-screen instead. */
            /* Symmetric on mobile, where the column is the full width and an
               off-centre canvas visibly shifts the trunk off the page's axis.
               From md: up it is deliberately lopsided. The trunk renders at
               the canvas centre and covers only ~44% of the canvas width, so
               a canvas centred on the column strands it far to the right of
               the copy. Taking 40% off the left and 16% off the right leaves
               the canvas exactly the same size — the trunk does not scale —
               and slides it back toward the copy. */
            <div className="absolute -top-[14%] -bottom-[14%] -left-[26%] -right-[26%] md:-top-[20%] md:-bottom-[20%] md:-left-[40%] md:-right-[16%]">
              <TrunkScene pack={pack} items={PACKED} active={inView} />
            </div>
          ) : (
            /* Only reached when WebGL is unavailable — those visitors never
               see the 3D trunk, so there is no inconsistency to worry about. */
            <Trunk className="relative z-0 w-full" />
          )}
        </div>
      </div>
    </section>
  );
}

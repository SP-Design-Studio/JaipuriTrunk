"use client";

import { Component, useEffect, useRef, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Charminar from "@/components/Charminar";
import HawaMahal from "@/components/HawaMahal";
import { Monogram } from "@/components/Logo";
import Trunk2D from "@/components/Trunk";
import { allItems, photographedItems } from "@/lib/products";
import { launchLabel, site } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const clamp = gsap.utils.clamp(0, 1);
const ease = gsap.parseEase("power2.inOut");

const CONTENTS = allItems.map((item) => item.name);
/** Every product we have a photo of gets packed into the trunk. */
const PACKED = photographedItems.map((item) => item.src);

/**
 * Three.js is a separate client chunk. It is requested as soon as the page mounts
 * (the preloader is covering the screen then), so it is ready long before the
 * trunk is reached. `ssr: false` is required: WebGL cannot prerender.
 */
const TrunkScene = dynamic(() => import("@/components/three/TrunkScene"), {
  ssr: false,
  loading: () => null,
});

/** Some browsers and locked-down devices have no WebGL; fall back to the drawing. */
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** If the 3D scene throws for any reason, show the drawing instead of nothing. */
class SceneGuard extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[trunk] 3D scene failed, showing the drawing:", error, info);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * The journey, as one scene. The trunk is the constant; the world changes around it.
 *
 *  1. Jaipur: warm paper, the Hawa Mahal. The trunk stands open and, as you scroll,
 *     each piece flies in and the lid shuts.
 *  2. The road: a thin orange line sweeps across the screen and behind it the scene
 *     is Hyderabad (maroon, Charminar), the two scenes sliding a little against each
 *     other so it reads as travelling rather than cutting.
 *  3. Hyderabad: the lid lifts, the light comes out, and the date appears.
 *
 * The 3D trunk is drawn above both scenes by one canvas whose `pack` value is written
 * from the scroll position (0 empty and open, 1 packed and shut), so none of it
 * triggers a React render. The stage is `position: sticky` inside a tall section.
 *
 * Reduced motion: the two scenes are stacked, with the drawn trunk in the first.
 */
export default function Route() {
  const root = useRef<HTMLElement>(null);
  /** 0 = empty and open, 1 = packed and shut. */
  const pack = useRef(0);
  const [use3D, setUse3D] = useState(false);
  const [noGL, setNoGL] = useState(false);
  const [inView, setInView] = useState(false);
  /** The first frame is on screen: the placeholder can step aside. */
  const [ready, setReady] = useState(false);
  const host = useRef<HTMLDivElement>(null);

  // Start now, not when the browser next feels idle: the preloader is on screen, so
  // the chunk, the product images and the scene's own setup all happen behind it.
  useEffect(() => {
    if (!hasWebGL()) {
      const t = window.setTimeout(() => setNoGL(true), 0);
      return () => window.clearTimeout(t);
    }
    PACKED.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    let cancelled = false;
    void import("@/components/three/TrunkScene").then(() => {
      if (!cancelled) setUse3D(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Drive the render loop only while the stage is near the viewport.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "50% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      const over = el.querySelector<HTMLElement>(".r-over");
      const seamH = el.querySelector<HTMLElement>(".r-seam-h");
      const seamV = el.querySelector<HTMLElement>(".r-seam-v");
      const ca = el.querySelector<HTMLElement>(".r-ca");
      const cb = el.querySelector<HTMLElement>(".r-cb");
      if (!over || !seamH || !seamV || !ca || !cb) return;

      const render = (s: number) => {
        // Pack while in Jaipur, lift the lid on arrival: the scene shuts the lid at
        // pack = 1 and has it fully open again by 0.82.
        const packing = clamp((s - 0.05) / 0.4);
        const opening = ease(clamp((s - 0.84) / 0.12));
        pack.current = packing - opening * 0.2;

        // Rest, travel, rest.
        const p = ease(clamp((s - 0.5) / 0.3));
        const wide = window.innerWidth >= 768;
        gsap.set(over, {
          clipPath: wide
            ? `inset(0 ${(1 - p) * 100}% 0 0)`
            : `inset(0 0 ${(1 - p) * 100}% 0)`,
        });
        // The scenes slide against each other a little, like a view from a train.
        gsap.set(
          ca,
          wide ? { x: `${-p * 5}vw`, y: 0 } : { x: 0, y: `${-p * 4}svh` },
        );
        gsap.set(
          cb,
          wide
            ? { x: `${(1 - p) * 5}vw`, y: 0 }
            : { x: 0, y: `${(1 - p) * 4}svh` },
        );
        const fade = clamp(p / 0.04) * clamp((1 - p) / 0.04);
        gsap.set(seamH, { left: `${p * 100}%`, opacity: wide ? fade : 0 });
        gsap.set(seamV, { top: `${p * 100}%`, opacity: wide ? 0 : fade });
      };

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Arriving, the content of the scene fades up as the section comes into view;
        // leaving, it fades back down. Only the content: the paper and the maroon stay
        // solid, because fading a background lets the plain page colour show through
        // as a band at the edge of the section.
        const content = ".r-ca, .r-cb, .r-host";
        gsap.fromTo(
          content,
          { opacity: 0 },
          {
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              end: "top 20%",
              scrub: true,
            },
          },
        );
        gsap.to(content, {
          opacity: 0.1,
          ease: "none",
          immediateRender: false,
          scrollTrigger: {
            trigger: el,
            start: "bottom bottom",
            end: "bottom 35%",
            scrub: true,
          },
        });
        const state = { s: 0 };
        render(0);
        gsap.to(state, {
          s: 1,
          ease: "none",
          onUpdate: () => render(state.s),
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.8,
          },
        });
      });
      // Reduced motion: the trunk is shown packed and shut.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        pack.current = 1;
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const drawing = <Trunk2D className="relative z-0 w-full" />;
  const heading =
    "display text-[clamp(2.4rem,5.6vw,6rem)] leading-[1.0] tracking-[-0.02em] max-w-[12ch]";
  const coords = "label tnum mt-[var(--space-2)]";
  const scenePad =
    "px-[var(--gutter)] pt-[max(5.5rem,calc(var(--space-section)*0.8))]";

  return (
    <section
      ref={root}
      id="route"
      className="bg-paper relative h-[520svh] motion-reduce:h-auto"
    >
      <div className="r-stage sticky top-0 h-[100svh] overflow-hidden motion-reduce:static motion-reduce:h-auto">
        {/* Jaipur: where it is packed. */}
        <div className="u-grain bg-paper text-maroon absolute inset-0 motion-reduce:relative motion-reduce:min-h-[100svh]">
          <div className={`r-ca absolute inset-0 ${scenePad}`}>
            <h2 className={heading}>
              <span className="text-maroon/55">Handpicked in</span>{" "}
              {site.city.from}.
            </h2>
            <p className={`${coords} text-maroon/55`}>{site.coords.from}</p>
            <p className="text-maroon/60 mt-[var(--space-2)] hidden max-w-[40ch] text-sm leading-relaxed md:block">
              {CONTENTS.join(" · ")}
            </p>
            <div className="absolute bottom-0 left-1/2 aspect-[1968/1378] w-[min(70vw,24rem)] -translate-x-1/2 md:right-auto md:left-[var(--gutter)] md:w-[min(34vw,540px)] md:translate-x-0">
              <HawaMahal className="h-full w-full" />
            </div>
            <div className="mx-auto mt-[var(--space-3)] hidden w-[min(80vw,28rem)] motion-reduce:block">
              {drawing}
            </div>
          </div>
        </div>

        {/* Hyderabad: where it is opened. Revealed behind the seam. */}
        <div
          className="r-over u-grain u-grain-dark bg-maroon text-cream absolute inset-0 motion-reduce:relative motion-reduce:min-h-[100svh] motion-reduce:[clip-path:none]!"
          style={{ clipPath: "inset(0 100% 0 0)" }}
          data-cursor-invert
        >
          <div className={`r-cb absolute inset-0 ${scenePad}`}>
            <h2 className={heading}>
              <span className="text-cream/70">Opened in</span>{" "}
              <span className="text-marigold">{site.city.to}.</span>
            </h2>
            <p className={`${coords} text-cream/60`}>{site.coords.to}</p>
            <p className="display text-marigold mt-[var(--space-3)] text-[clamp(1.8rem,3.4vw,3.4rem)] leading-none">
              <span className="label text-cream/70 mb-[var(--space-1)] block">
                The second trunk opens
              </span>
              {launchLabel}
            </p>
            <div className="absolute bottom-0 left-1/2 aspect-[1124/1287] h-[24svh] -translate-x-1/2 md:right-auto md:left-[var(--gutter)] md:h-[44svh] md:translate-x-0">
              <Charminar className="h-full w-full" />
            </div>
          </div>
        </div>

        {/* The road: a hairline sweeping across, vertical on a wide screen and
            horizontal on a phone. Under the trunk, which rides in front of it. */}
        <div
          aria-hidden="true"
          className="r-seam-h pointer-events-none absolute inset-y-0 hidden w-0.5 -translate-x-1/2 opacity-0 md:block motion-reduce:hidden"
          style={{ left: "0%" }}
        >
          <div className="bg-marigold absolute inset-0" />
        </div>
        <div
          aria-hidden="true"
          className="r-seam-v pointer-events-none absolute inset-x-0 h-0.5 -translate-y-1/2 opacity-0 md:hidden motion-reduce:hidden"
          style={{ top: "0%" }}
        >
          <div className="bg-marigold absolute inset-0" />
        </div>

        {/* The trunk, above both scenes. Its canvas reaches well past its own box on
            every side, because a WebGL canvas clips hard at its edge. It takes no
            pointer events, so the page and the cursor underneath keep working. */}
        <div
          ref={host}
          className="r-host pointer-events-none absolute inset-x-[-6%] top-[36%] bottom-[16%] md:inset-x-auto md:top-[20%] md:-right-[6%] md:-bottom-[2%] md:left-[36%] motion-reduce:hidden"
        >
          {noGL ? (
            <div className="grid h-full place-items-center">{drawing}</div>
          ) : (
            <>
              {/* Until the first frame is on screen: the monogram, quietly. */}
              <div
                aria-hidden="true"
                className={`absolute inset-0 grid place-items-center transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}
              >
                <Monogram className="text-maroon/15 h-[20%] w-auto animate-pulse" />
              </div>
              {use3D && (
                <div
                  className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
                >
                  <SceneGuard fallback={drawing}>
                    <TrunkScene
                      pack={pack}
                      items={PACKED}
                      active={inView}
                      onReady={() => setReady(true)}
                    />
                  </SceneGuard>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

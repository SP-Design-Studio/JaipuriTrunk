"use client";

import { Component, useEffect, useRef, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Monogram } from "@/components/Logo";
import Trunk2D from "@/components/Trunk";
import { allItems, photographedItems } from "@/lib/products";
import { launchLabel } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

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
 * The trunk. Scrolling packs it: each piece flies in, then the lid closes. The
 * scene is `position: sticky` inside a tall section and the scroll position is
 * written into `pack`, a ref the 3D scene reads every frame, so packing never
 * triggers a React render.
 */
export default function Trunk() {
  const root = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  /** 0 = empty and open, 1 = packed and shut. */
  const pack = useRef(0);
  const [use3D, setUse3D] = useState(false);
  const [noGL, setNoGL] = useState(false);
  const [inView, setInView] = useState(false);
  /** The first frame is on screen: the placeholder can step aside. */
  const [ready, setReady] = useState(false);

  // Start now, not when the browser next feels idle. The preloader is on screen, so
  // the chunk, the product images and the scene's own setup all happen behind it.
  useEffect(() => {
    if (!hasWebGL()) {
      // Deferred a tick, like the other hooks here, rather than set synchronously.
      const t = window.setTimeout(() => setNoGL(true), 0);
      return () => window.clearTimeout(t);
    }
    // Warm the browser cache for the pieces the scene is about to load.
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

  // Drive the render loop only while the section is near the viewport. The host
  // is observed, not the section, because the sticky stage is what is on screen.
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
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(pack, {
          current: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
          },
        });
        gsap.set(".t-copy", { opacity: 0, y: 34 });
        gsap.to(".t-copy", {
          opacity: 1,
          y: 0,
          ease: "none",
          stagger: 0.12,
          scrollTrigger: {
            trigger: root.current,
            start: "top 70%",
            end: "top 10%",
            scrub: 0.6,
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

  return (
    <section
      ref={root}
      id="trunk"
      className="bg-cream text-maroon relative h-[300svh] motion-reduce:h-auto"
    >
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden motion-reduce:static motion-reduce:min-h-[100svh]">
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 items-center gap-[var(--space-3)] px-[var(--gutter)] md:grid-cols-[0.8fr_1.2fr] md:gap-[2vw]">
          <div className="text-center md:text-left">
            <h2 className="t-copy display text-[clamp(2.3rem,5.4vw,5rem)] leading-[1.02]">
              Packed in Jaipur.
              <br />
              Opened in Hyderabad.
            </h2>
            <p className="t-copy text-ink/70 mx-auto mt-[var(--space-2)] max-w-[36ch] text-[clamp(1rem,1.4vw,1.2rem)] leading-relaxed font-light md:mx-0">
              Everything from the first trunk travelled this way. The second
              opens on {launchLabel}.
            </p>
            <p className="t-copy text-maroon/55 mx-auto mt-[var(--space-2)] hidden max-w-[46ch] text-sm leading-relaxed sm:block md:mx-0">
              {CONTENTS.join(" · ")}
            </p>
          </div>

          <div
            ref={host}
            className="relative mx-auto aspect-square w-full max-w-[min(100%,calc(100svh-24rem))] md:aspect-4/3 md:max-w-none"
          >
            {noGL ? (
              drawing
            ) : (
              <>
                {/* Until the first frame is on screen: the monogram, quietly, so
                    the space never reads as empty or broken. */}
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 grid place-items-center transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}
                >
                  <Monogram className="text-maroon/15 h-[28%] w-auto animate-pulse" />
                </div>
                {use3D && (
                  /* The canvas reaches well past the column on every side. A WebGL
                     canvas clips hard at its own edge, so if it ended at the column
                     the trunk would be sliced and the pieces would pop into being on
                     a visible seam. From md the overhang is lopsided on purpose: the
                     trunk renders at the canvas centre and covers about 44% of its
                     width, so this slides it back toward the copy without scaling it. */
                  <div
                    className={`absolute -top-[14%] -right-[26%] -bottom-[14%] -left-[26%] translate-y-[5%] transition-opacity duration-700 md:-top-[20%] md:-right-[10%] md:-bottom-[20%] md:-left-[34%] md:translate-y-0 ${ready ? "opacity-100" : "opacity-0"}`}
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
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { HERO_MARK_SIZE, Monogram } from "@/components/Logo";
import { launchLabel, site } from "@/lib/site";

/** The hero's own backdrop, so lifting this away leaves nothing to notice. */
const GROUND =
  "radial-gradient(62% 58% at 50% 44%, #8d1c3b 0%, #801834 56%, #6a1229 100%)";

/**
 * The loader is one gesture, not a curtain.
 *
 * The monogram is unveiled top to bottom on the maroon ground while a single
 * hairline fills beneath it. Then it travels: it glides to exactly where the
 * hero's monogram sits and the ground fades out around it, so the loader's mark
 * and the hero's are the same object and the page is simply there. There is no
 * wipe and no second reveal.
 *
 * It sizes itself from the hero's mark (`[data-hero-mark]`), so the hand-off
 * stays exact at any screen size. Reduced motion skips the travel and fades.
 */
export default function Preloader({
  /** Fired as the mark lands, so the hero's text rises as it settles. */
  onReveal,
  /** Fired once the loader is gone and can unmount. */
  onFinished,
}: {
  onReveal: () => void;
  onFinished: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const html = document.documentElement;
    html.classList.add("is-loading");

    // Development only (stripped from production builds): `?preloader=skip` goes
    // straight to the page, for testing everything behind the loader.
    if (
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).get("preloader") === "skip"
    ) {
      html.classList.remove("is-loading");
      onReveal();
      onFinished();
      return;
    }

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const hero = document.querySelector<HTMLElement>("[data-hero-mark]");
    const target = hero?.getBoundingClientRect();

    const done = () => {
      html.classList.remove("is-loading");
      onFinished();
    };

    // The mark is already sized and centred by CSS (the same size as the hero's),
    // so nothing is measured before first paint. Taking over its position in
    // pixels here is what lets it travel to the hero's later.
    const mark = el.querySelector<HTMLElement>(".pl-mark");
    if (mark) {
      const m = mark.getBoundingClientRect();
      gsap.set(mark, {
        x: (window.innerWidth - m.width) / 2,
        y: (window.innerHeight - m.height) / 2 - 18,
      });
    }
    gsap.set(".pl-line", { scaleX: 0 });
    gsap.set(".pl-label", { opacity: 0, y: 8 });

    if (reduce || !target) {
      gsap.set(".pl-mark", { clipPath: "inset(0 0 0% 0)" });
      const tl = gsap.timeline({ onComplete: done });
      tl.to(".pl-label", { opacity: 1, y: 0, duration: 0.4 })
        .call(onReveal, undefined, "+=0.3")
        .to(el, { opacity: 0, duration: 0.5, ease: "power2.out" }, "<");
      return () => {
        tl.kill();
        html.classList.remove("is-loading");
      };
    }

    gsap.set(".pl-mark", { clipPath: "inset(0 0 100% 0)" });

    // The unveil is the minimum; the hand-off waits for the type to be ready so
    // the hero never swaps fonts under the visitor's eyes.
    let fontsReady = false;
    const ready = Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((r) => window.setTimeout(r, 2500)),
    ]).then(() => {
      fontsReady = true;
    });

    const tl = gsap.timeline();
    tl.to(
      ".pl-mark",
      { clipPath: "inset(0 0 0% 0)", duration: 1.5, ease: "power2.inOut" },
      0.15,
    )
      .to(".pl-line", { scaleX: 1, duration: 1.5, ease: "power2.inOut" }, 0.15)
      .to(
        ".pl-label",
        { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" },
        0.7,
      )
      .call(() => {
        const go = () => {
          // Re-measure: the hero may have settled since the first look.
          const t = hero?.getBoundingClientRect() ?? target;
          const out = gsap.timeline({ onComplete: done });
          out
            .to(
              ".pl-label,.pl-line",
              { opacity: 0, duration: 0.45, ease: "power2.out" },
              0,
            )
            .to(
              ".pl-mark",
              { x: t.left, y: t.top, duration: 1.15, ease: "power3.inOut" },
              0,
            )
            .to(
              ".pl-ground",
              { opacity: 0, duration: 0.95, ease: "power2.inOut" },
              0.25,
            )
            .call(onReveal, undefined, 0.7);
        };
        if (fontsReady) go();
        else void ready.then(go);
      });

    return () => {
      tl.kill();
      html.classList.remove("is-loading");
    };
  }, [onReveal, onFinished]);

  return (
    <div ref={root} className="fixed inset-0 z-[900]" aria-hidden="true">
      <div
        className="pl-ground absolute inset-0"
        style={{ background: GROUND }}
      />
      {/* Sized by CSS to exactly the hero's mark, and hidden and centred from the
          very first paint. It used to be sized by script, so for a frame it had
          no size at all and filled the screen. */}
      <Monogram
        className={`pl-mark text-marigold absolute top-0 left-0 block origin-top-left ${HERO_MARK_SIZE}`}
        style={{
          clipPath: "inset(0 0 100% 0)",
          transform: "translate(calc(50vw - 50%), calc(50svh - 50% - 18px))",
        }}
      />
      <div className="absolute inset-x-0 bottom-[14svh] flex flex-col items-center gap-5 px-6 text-center">
        <div
          className="pl-line bg-marigold/70 h-px w-[min(180px,42vw)] origin-left"
          style={{ transform: "scaleX(0)" }}
        />
        <p className="pl-label label text-cream/80" style={{ opacity: 0 }}>
          {site.eyebrow} · {launchLabel}
        </p>
      </div>
    </div>
  );
}

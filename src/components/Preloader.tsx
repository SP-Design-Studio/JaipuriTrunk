"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { launchLabel, site } from "@/lib/site";

/**
 * The curtain is one element, not a row of panels: scaling adjacent flex
 * children leaves hairline seams that the page shows through mid-animation,
 * which is what broke the old reveal on mobile.
 *
 * Its lower edge is a scalloped arcade of cusped arches — the jharokha motif —
 * so lifting it reads as a jali screen being raised rather than a plain wipe.
 *
 * The reveal is built from four things that used to be one: the rule fills as
 * the count runs, the arcade stretches under the lift, the type lags the cloth
 * carrying it, and the marks leave bottom-up so the wordmark is last out.
 */

const SCALLOPS = 9;

function ScallopedEdge() {
  // One cusped arch per bay, drawn across a 0..100 viewBox so it stretches to
  // any width without distorting the curve's character.
  const w = 100 / SCALLOPS;
  const arches = Array.from({ length: SCALLOPS }, (_, i) => {
    const x = i * w;
    return `M${x} 0 C${x} 14 ${x + w * 0.18} 20 ${x + w / 2} 20 C${x + w * 0.82} 20 ${x + w} 14 ${x + w} 0 Z`;
  }).join(" ");

  return (
    <svg
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pl-arcade absolute inset-x-0 top-full h-[7vh] w-full origin-top"
      fill="currentColor"
    >
      <path d={arches} />
    </svg>
  );
}

export default function Preloader({
  /** Fired as the curtain starts lifting, so the hero animates in behind it. */
  onReveal,
  /** Fired once the curtain is fully clear and this can unmount. */
  onFinished,
}: {
  onReveal: () => void;
  onFinished: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const counter = { v: 0 };
    const tl = gsap.timeline({ onComplete: onFinished });

    tl.to(counter, {
      v: 100,
      duration: 1.6,
      ease: "power2.inOut",
      onUpdate: () => setPct(Math.round(counter.v)),
    })
      // The rule fills off the same clock as the numeral, so they are one
      // gesture rather than a bar and a number that happen to agree.
      .to(
        ".pl-progress",
        { scaleX: 1, duration: 1.6, ease: "power2.inOut" },
        "<",
      )
      // A touch of overshoot downward before the lift, so the curtain feels
      // like weighted cloth rather than a sliding rectangle.
      .to(
        ".pl-curtain",
        { yPercent: 3, duration: 0.34, ease: "power2.out" },
        "-=0.1",
      )
      .to(".pl-curtain", {
        yPercent: -114,
        duration: 1.35,
        ease: "power3.inOut",
      })
      /**
       * The arcade stretches as the curtain goes up and settles as it clears.
       *
       * The cusped arches are the one piece of ornament in the whole reveal and
       * a rigid lift showed them for a fraction of a second on the way past.
       * Elongating them mid-lift keeps them on screen through the fastest part
       * of the ease, and reads as cloth taking its own weight.
       */
      .to(".pl-arcade", { scaleY: 2.4, duration: 0.8, ease: "power2.out" }, "<")
      .to(".pl-arcade", { scaleY: 1, duration: 0.5, ease: "power2.in" })
      /**
       * The wordmark lags the curtain instead of being painted on it.
       *
       * Moving the stage down while the curtain moves up leaves the type
       * trailing its own cloth by a few percent, which is the difference
       * between something being carried and something being printed.
       */
      .to(
        ".pl-stage",
        { yPercent: 9, duration: 0.9, ease: "power2.in" },
        "<-0.8",
      )
      /**
       * The marks leave from the bottom up, not all at once.
       *
       * `from: "end"` reverses DOM order so the date goes first and the
       * wordmark last — it is the thing the visitor came for, so it is the last
       * thing to let go. The old 0.04s stagger across four elements resolved in
       * 0.12s, which is simultaneous as far as an eye is concerned.
       */
      .to(
        ".pl-fade",
        {
          opacity: 0,
          duration: 0.5,
          ease: "power2.in",
          stagger: { each: 0.09, from: "end" },
        },
        "<0.1",
      )
      .call(onReveal, undefined, "<0.1");

    if (root.current) root.current.style.pointerEvents = "none";

    return () => {
      tl.kill();
    };
  }, [onReveal, onFinished]);

  return (
    <div ref={root} className="fixed inset-0 z-[900] overflow-hidden">
      <div className="pl-curtain text-maroon-deep absolute inset-0 bg-maroon-deep">
        <ScallopedEdge />
        <div className="pl-stage absolute inset-0 grid place-items-center px-6">
          <div className="text-center">
            <p className="pl-fade leading-none">
              <span className="font-script text-petal text-[clamp(2.2rem,8vw,5.5rem)]">
                {site.nameScript}
              </span>
              <span className="font-display text-sage text-[clamp(1.8rem,6.5vw,4.4rem)] tracking-[0.14em]">
                {site.nameDisplay}
              </span>
            </p>
            {/* The rule is the progress bar. The numeral in the corner used to
                be the only thing that knew anything was loading, and nothing
                on the page acknowledged it; now the count and the fill run off
                the same tween, so the wordmark sits on a line that is visibly
                completing. */}
            <div className="pl-fade bg-petal/25 mx-auto mt-6 h-px w-[min(240px,45vw)] overflow-hidden">
              {/* The start state is an inline `transform`, NOT Tailwind's
                  `scale-x-0`. Tailwind v4 compiles that class to the standalone
                  `scale` property, and GSAP animates `transform: scaleX()` —
                  two different properties that both apply, so `scale: 0 1`
                  would have pinned the bar at zero however far GSAP scaled the
                  transform, and the fill would never have appeared at all. */}
              <div
                className="pl-progress bg-petal/80 h-px w-full origin-left"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
            {/* Set as its own line under the rule rather than as a second
                wordmark. It used to run at the same size as "Trunk" with
                0.45em of tracking at half opacity, which spread it nearly
                three times the wordmark's width and still read as faint —
                big, but not legible, which is the opposite of the point.
                This mirrors the hero's order: status, then date. */}
            <p className="pl-fade text-petal/90 mt-6 text-[clamp(1.05rem,3.4vw,2rem)] leading-none tracking-[0.3em] uppercase">
              {site.eyebrow}
            </p>
            <p className="pl-fade text-sage/70 mt-3 text-[clamp(0.78rem,1.5vw,0.95rem)] tracking-[0.34em] uppercase">
              {launchLabel}
            </p>
          </div>
        </div>
        <p className="pl-fade font-display text-petal/70 absolute right-6 bottom-6 text-sm tracking-[0.3em] tabular-nums">
          {String(pct).padStart(3, "0")}
        </p>
      </div>
    </div>
  );
}

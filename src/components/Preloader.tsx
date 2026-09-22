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
      className="absolute inset-x-0 top-full h-[7vh] w-full"
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
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => setPct(Math.round(counter.v)),
    })
      // A touch of overshoot downward before the lift, so the curtain feels
      // like weighted cloth rather than a sliding rectangle.
      .to(
        ".pl-curtain",
        { yPercent: 3, duration: 0.3, ease: "power2.out" },
        "-=0.1",
      )
      .to(".pl-curtain", {
        yPercent: -112,
        duration: 1.15,
        ease: "power3.inOut",
      })
      // The wordmark rides up with the curtain and dissolves on the way, rather
      // than clearing first and leaving a dead beat of empty colour.
      .to(
        ".pl-fade",
        { opacity: 0, duration: 0.55, ease: "power2.in", stagger: 0.04 },
        "<",
      )
      .call(onReveal, undefined, "<0.18");

    if (root.current) root.current.style.pointerEvents = "none";

    return () => {
      tl.kill();
    };
  }, [onReveal, onFinished]);

  return (
    <div ref={root} className="fixed inset-0 z-[900] overflow-hidden">
      <div className="pl-curtain text-maroon-deep absolute inset-0 bg-maroon-deep">
        <ScallopedEdge />
        <div className="absolute inset-0 grid place-items-center px-6">
          <div className="text-center">
            <p className="pl-fade leading-none">
              <span className="font-script text-petal text-[clamp(2.2rem,8vw,5.5rem)]">
                {site.nameScript}
              </span>
              <span className="font-display text-sage text-[clamp(1.8rem,6.5vw,4.4rem)] tracking-[0.14em]">
                {site.nameDisplay}
              </span>
            </p>
            {/* Set as its own line under a rule rather than as a second
                wordmark. It used to run at the same size as "Trunk" with
                0.45em of tracking at half opacity, which spread it nearly
                three times the wordmark's width and still read as faint —
                big, but not legible, which is the opposite of the point.
                This mirrors the hero's order: status, then date. */}
            <div className="pl-fade mx-auto mt-6 h-px w-[min(240px,45vw)] bg-petal/25" />
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

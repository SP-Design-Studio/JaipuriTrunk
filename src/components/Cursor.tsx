"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * The pointer draws a running stitch — the hand stitch that closes a jutti's
 * upper and quilts a Jaipur bag. Act 3 says a pair of jhumkas passes through
 * six hands before it reaches yours; this makes the visitor's own hand the
 * last of them, sewing a seam across the page as it goes.
 *
 * How it is built: the last few pointer positions are kept in a ring buffer,
 * and only ALTERNATE pairs are drawn. The gaps are not decoration — skipping
 * every other pair is what a running stitch is, thread over the cloth then
 * under it. It also means the seam draws itself out of the pointer's own
 * movement rather than being an animation played at it: move slowly and the
 * stitches shorten, stop and the thread runs out and disappears.
 */

/** Pointer positions kept. At 60fps this is a little under half a second. */
const SAMPLES = 26;
/** Every other pair is a stitch; the rest are the gaps between them. */
const STITCHES = SAMPLES / 2;

export default function Cursor() {
  const needle = useRef<HTMLDivElement>(null);
  const seam = useRef<SVGGElement>(null);

  useEffect(() => {
    // Touch devices never see this — there is no pointer to trail, and the
    // seam would be drawn under the hand anyway.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    const n = needle.current;
    const g = seam.current;
    if (!n || !g) return;

    const stitches = Array.from(g.children) as SVGLineElement[];
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Thread thins and fades along its length, so the seam reads as trailing
    // off rather than being cut. Both are fixed per stitch, so they are set
    // once here and never touched in the frame loop.
    stitches.forEach((s, i) => {
      const t = i / STITCHES;
      s.setAttribute("opacity", String(Math.max(0.05, 1 - t * 1.15)));
      s.setAttribute("stroke-width", String(1.6 - t * 0.7));
    });

    gsap.set(n, { xPercent: -50, yPercent: -50, opacity: 0 });
    const nx = gsap.quickTo(n, "x", { duration: 0.07, ease: "power3" });
    const ny = gsap.quickTo(n, "y", { duration: 0.07, ease: "power3" });

    const xs = new Float32Array(SAMPLES);
    const ys = new Float32Array(SAMPLES);
    let head = 0;
    let primed = false;
    let shown = false;
    let px = 0;
    let py = 0;

    const move = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!primed) {
        // Seed the whole buffer, or the first frame whips a seam across the
        // page from 0,0 to wherever the pointer entered.
        xs.fill(px);
        ys.fill(py);
        primed = true;
      }
      if (!shown) {
        shown = true;
        syncNativeCursor();
        gsap.to(reduce ? [n] : [n, g], { opacity: 1, duration: 0.25 });
      }
      nx(px);
      ny(py);
    };

    /**
     * Longest a single stitch may be before the thread is treated as having
     * been lifted rather than drawn.
     *
     * A hand moving a mouse covers maybe 15px between frames. A flick across
     * a wide screen, a pointer re-entering the window, or a tab regaining
     * focus can jump hundreds — and one sample like that stretches a single
     * stitch right across the page, which looks like a glitch rather than a
     * seam. Past this the buffer is re-seeded, so the thread simply picks up
     * again where the pointer landed.
     */
    const MAX_STITCH = 140;

    // Sampled per frame rather than per pointermove: mice fire at wildly
    // different rates, and a buffer fed by events would make the stitch
    // length depend on the hardware rather than on how fast you moved.
    const sew = () => {
      if (Math.hypot(px - xs[head], py - ys[head]) > MAX_STITCH) {
        xs.fill(px);
        ys.fill(py);
      }
      head = (head + 1) % SAMPLES;
      xs[head] = px;
      ys[head] = py;
      for (let s = 0; s < stitches.length; s++) {
        const a = (head - s * 2 + SAMPLES) % SAMPLES;
        const b = (head - s * 2 - 1 + SAMPLES) % SAMPLES;
        const line = stitches[s];
        line.setAttribute("x1", String(xs[a]));
        line.setAttribute("y1", String(ys[a]));
        line.setAttribute("x2", String(xs[b]));
        line.setAttribute("y2", String(ys[b]));
      }
    };
    if (!reduce) gsap.ticker.add(sew);

    /**
     * The native pointer is only hidden while ours is genuinely visible.
     *
     * The wrapper is `hidden md:block`, so below the md breakpoint there is no
     * custom cursor to see — and a CSS rule hiding the native one there left
     * the window with no pointer at all. Tracked live rather than read once,
     * because a window can be dragged across that breakpoint.
     */
    const wide = window.matchMedia("(min-width: 768px)");
    const syncNativeCursor = () =>
      document.documentElement.classList.toggle(
        "cursor-none",
        shown && wide.matches,
      );
    wide.addEventListener("change", syncNativeCursor);

    let overDark = false;

    /** Rose over the pale acts; the pale thread is for the dark olive bazaar. */
    const thread = (hit: boolean) =>
      overDark
        ? hit
          ? "var(--color-blush)"
          : "var(--color-petal)"
        : hit
          ? "var(--color-maroon)"
          : "var(--color-rose)";

    const over = (e: PointerEvent) => {
      const el = e.target as HTMLElement;
      // Only genuinely interactive elements. The needle knotting over
      // something that cannot be clicked reads as a promise the page does not
      // keep.
      const hit = Boolean(el.closest("a, button, input"));
      // Sections opt in by attribute rather than by colour sniffing, so a
      // future dark act only has to tag itself.
      overDark = Boolean(el.closest("[data-cursor-invert]"));

      const colour = thread(hit);
      gsap.to(g, { stroke: colour, duration: 0.3 });
      // Over a target the needle ties off: it swells into a knot and the
      // thread behind it tightens.
      gsap.to(n, {
        backgroundColor: colour,
        scale: hit ? 2.6 : 1,
        duration: 0.3,
        ease: "power3.out",
      });
      if (!reduce) gsap.to(g, { opacity: hit ? 0.55 : 1, duration: 0.3 });
    };

    const leave = () => gsap.to([n, g], { opacity: 0, duration: 0.25 });

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      document.documentElement.classList.remove("cursor-none");
      wide.removeEventListener("change", syncNativeCursor);
      gsap.ticker.remove(sew);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[999] hidden md:block">
      <svg className="absolute inset-0 h-full w-full">
        {/* Hidden until the first pointermove seeds the buffer. Zero-length
            lines with a round cap still paint as dots, so an unhidden seam
            would show as a knot of dots at the top-left corner on load. */}
        <g
          ref={seam}
          stroke="var(--color-rose)"
          strokeLinecap="round"
          fill="none"
          opacity={0}
        >
          {Array.from({ length: STITCHES }, (_, i) => (
            <line key={i} x1={0} y1={0} x2={0} y2={0} />
          ))}
        </g>
      </svg>
      <div
        ref={needle}
        className="bg-maroon absolute top-0 left-0 h-1.5 w-1.5 rounded-full"
      />
    </div>
  );
}
